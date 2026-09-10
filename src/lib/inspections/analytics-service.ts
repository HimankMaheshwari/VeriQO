import { prisma } from '../prisma'
import type { PrismaClient, Role, InspectionStatus, AuthorityDecision, ViolationSeverity, MatchStatus } from '@prisma/client'
import type { AuthorityAnalytics } from './types'

export class AnalyticsService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Aggregates real persisted database records for the authority dashboard.
   * AUTHORITY_OFFICER is strictly scoped to their own inspections.
   * SENIOR_AUTHORITY and ADMIN receive global supervisory metrics.
   */
  async getAuthorityAnalytics(user: { id: string; role: Role }): Promise<AuthorityAnalytics> {
    const isGlobal = user.role === 'SENIOR_AUTHORITY' || user.role === 'ADMIN'
    const scope: 'OFFICER' | 'GLOBAL' = isGlobal ? 'GLOBAL' : 'OFFICER'

    // Base filter for inspections
    const inspectionWhere = isGlobal ? {} : { officerId: user.id }

    // 1. Total inspections
    const totalInspections = await this.db.inspection.count({
      where: inspectionWhere,
    })

    // 2. Inspections by Status
    const statusGroups = await this.db.inspection.groupBy({
      by: ['status'],
      where: inspectionWhere,
      _count: { _all: true },
    })

    const inspectionsByStatus: Record<InspectionStatus, number> = {
      DRAFT: 0,
      IN_PROGRESS: 0,
      PENDING_REVIEW: 0,
      CLOSED: 0,
    }

    for (const group of statusGroups) {
      if (group.status in inspectionsByStatus) {
        inspectionsByStatus[group.status] = group._count._all
      }
    }

    // 3. Officer Decisions breakdown
    const decisionWhere = isGlobal
      ? {}
      : { inspection: { officerId: user.id } }

    const decisionGroups = await this.db.officerDecision.groupBy({
      by: ['decision'],
      where: decisionWhere,
      _count: { _all: true },
    })

    const officerDecisions: Record<AuthorityDecision | 'PENDING', number> = {
      COMPLIANT: 0,
      NON_COMPLIANT: 0,
      FURTHER_INVESTIGATION: 0,
      DISMISSED: 0,
      PENDING: 0,
    }

    let totalDecided = 0
    for (const group of decisionGroups) {
      if (group.decision in officerDecisions) {
        officerDecisions[group.decision] = group._count._all
        totalDecided += group._count._all
      }
    }
    officerDecisions.PENDING = Math.max(0, totalInspections - totalDecided)

    // 4. Formal Violations by Severity
    const violationWhere = isGlobal
      ? {}
      : { inspection: { officerId: user.id } }

    const violationGroups = await this.db.violation.groupBy({
      by: ['severity'],
      where: violationWhere,
      _count: { _all: true },
    })

    const violationsBySeverity: Record<ViolationSeverity | 'TOTAL', number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
      TOTAL: 0,
    }

    let totalViolations = 0
    for (const group of violationGroups) {
      if (group.severity in violationsBySeverity) {
        violationsBySeverity[group.severity] = group._count._all
        totalViolations += group._count._all
      }
    }
    violationsBySeverity.TOTAL = totalViolations

    // 5. Top Violated Legal Metrology Rules
    const violationsWithRule = await this.db.violation.findMany({
      where: violationWhere,
      include: {
        rule: {
          select: {
            id: true,
            ruleNumber: true,
            title: true,
            defaultSeverity: true,
          },
        },
      },
    })

    const ruleCountMap = new Map<string, {
      ruleId: string
      ruleNumber: string
      title: string
      count: number
      severity: ViolationSeverity
    }>()

    for (const v of violationsWithRule) {
      if (!v.rule) continue
      const existing = ruleCountMap.get(v.rule.id)
      if (existing) {
        existing.count += 1
      } else {
        ruleCountMap.set(v.rule.id, {
          ruleId: v.rule.id,
          ruleNumber: v.rule.ruleNumber,
          title: v.rule.title,
          count: 1,
          severity: v.severity,
        })
      }
    }

    const topViolatedRules = Array.from(ruleCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 6. Online Verification Statistics
    const onlineVerifications = await this.db.onlineVerification.findMany({
      where: isGlobal
        ? {}
        : {
            scan: {
              inspections: {
                some: { officerId: user.id },
              },
            },
          },
      include: {
        discrepancies: {
          select: {
            isStatutoryConcern: true,
          },
        },
      },
    })

    const totalChecked = onlineVerifications.length
    let matchedCount = 0
    let mismatchCount = 0
    let statutoryConcernsCount = 0

    for (const ov of onlineVerifications) {
      if (ov.overallMatchStatus === 'MATCH') {
        matchedCount += 1
      } else if (ov.overallMatchStatus === 'MISMATCH') {
        mismatchCount += 1
      }

      for (const disc of ov.discrepancies) {
        if (disc.isStatutoryConcern) {
          statutoryConcernsCount += 1
        }
      }
    }

    const matchRatePercentage = totalChecked > 0
      ? Math.round((matchedCount / totalChecked) * 100)
      : 0

    const onlineVerificationStats = {
      totalChecked,
      matchedCount,
      mismatchCount,
      statutoryConcernsCount,
      matchRatePercentage,
    }

    // 7. Recent Inspection Activity
    const recentInspections = await this.db.inspection.findMany({
      where: inspectionWhere,
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: {
        officer: { select: { name: true } },
        product: { select: { name: true } },
        scan: { select: { identifiedProductName: true } },
        decision: { select: { decision: true } },
      },
    })

    const recentActivity = recentInspections.map((insp) => ({
      id: insp.id,
      title: insp.title ?? 'Legal Metrology Inspection',
      productName:
        insp.product?.name ??
        insp.scan?.identifiedProductName ??
        'Unspecified Product',
      officerName: insp.officer?.name ?? 'Unknown Officer',
      status: insp.status,
      decision: insp.decision?.decision ?? null,
      createdAt: insp.createdAt,
      updatedAt: insp.updatedAt,
    }))

    // 8. Monthly Inspection Activity Trends (Last 6 Months)
    const monthlyTrends = await this.computeMonthlyTrends(inspectionWhere, violationWhere)

    return {
      scope,
      officerId: isGlobal ? undefined : user.id,
      totalInspections,
      inspectionsByStatus,
      officerDecisions,
      violationsBySeverity,
      topViolatedRules,
      onlineVerificationStats,
      recentActivity,
      monthlyTrends,
    }
  }

  private async computeMonthlyTrends(
    inspectionWhere: any,
    violationWhere: any
  ): Promise<
    Array<{
      month: string
      label: string
      inspectionsCreated: number
      inspectionsClosed: number
      violationsDetected: number
    }>
  > {
    const months: Array<{ month: string; label: string; start: Date; end: Date }> = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const monthNum = d.getMonth()
      const monthStr = `${year}-${String(monthNum + 1).padStart(2, '0')}`
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      const start = new Date(year, monthNum, 1)
      const end = new Date(year, monthNum + 1, 0, 23, 59, 59, 999)

      months.push({ month: monthStr, label, start, end })
    }

    const sixMonthsAgo = months[0].start

    // Fetch all created inspections in past 6 months
    const createdList = await this.db.inspection.findMany({
      where: {
        ...inspectionWhere,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
    })

    // Fetch all closed inspections in past 6 months
    const closedList = await this.db.inspection.findMany({
      where: {
        ...inspectionWhere,
        status: 'CLOSED',
        updatedAt: { gte: sixMonthsAgo },
      },
      select: { updatedAt: true },
    })

    // Fetch all violations detected in past 6 months
    const violationsList = await this.db.violation.findMany({
      where: {
        ...violationWhere,
        detectedAt: { gte: sixMonthsAgo },
      },
      select: { detectedAt: true },
    })

    return months.map((m) => {
      const inspectionsCreated = createdList.filter(
        (it) => it.createdAt >= m.start && it.createdAt <= m.end
      ).length

      const inspectionsClosed = closedList.filter(
        (it) => it.updatedAt >= m.start && it.updatedAt <= m.end
      ).length

      const violationsDetected = violationsList.filter(
        (it) => it.detectedAt >= m.start && it.detectedAt <= m.end
      ).length

      return {
        month: m.month,
        label: m.label,
        inspectionsCreated,
        inspectionsClosed,
        violationsDetected,
      }
    })
  }
}

export const defaultAnalyticsService = new AnalyticsService()
