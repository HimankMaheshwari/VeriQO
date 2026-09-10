import { prisma } from '../prisma'
import type { PrismaClient, Role, Prisma } from '@prisma/client'
import {
  type RiskLevel,
  type RiskContributingFactor,
  type RiskAssessment,
  type RiskMetrics,
  type RiskQueueFilters,
  type RiskQueueItem,
  type RiskQueueResponse,
} from './types'
import { canUserAccessCase, CaseAccessError } from '../cases/types'

export class RiskService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Deterministically evaluates the investigative risk score and explainable
   * factors for a specific RegulatoryCase.
   *
   * Hard Invariant: This is an investigative prioritization tool only.
   * It never alters statutory records, compliance checks, or legal decisions.
   */
  async assessCaseRisk(
    caseId: string,
    user: { id: string; role: Role }
  ): Promise<RiskAssessment> {
    if (user.role === 'CONSUMER') {
      throw new CaseAccessError('Consumers cannot access regulatory risk intelligence')
    }

    const regCase = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: {
        complaint: {
          select: {
            id: true,
            complaintRef: true,
            productId: true,
            scanId: true,
            createdAt: true,
          },
        },
        productScan: {
          include: {
            product: true,
            onlineVerifications: {
              include: {
                discrepancies: true,
              },
            },
          },
        },
        inspections: {
          include: {
            violations: {
              include: {
                rule: { select: { ruleNumber: true, title: true } },
              },
            },
            complianceChecks: true,
            decision: true,
          },
        },
      },
    })

    if (!regCase) {
      throw new CaseAccessError(`Regulatory case #${caseId} not found`)
    }

    // RBAC: Standard officer cannot access other officers' private cases
    if (!canUserAccessCase(user.role, user.id, regCase.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to access risk data for this case')
    }

    // Context resolution: shared product or scan
    const resolvedProductId =
      regCase.productScan?.productId ?? regCase.complaint?.productId ?? null
    const resolvedScanId =
      regCase.productScanId ?? regCase.complaint?.scanId ?? null

    // Gather contextual complaints across the commodity
    const complaintConditions: Prisma.ComplaintWhereInput[] = [{ id: regCase.complaintId ?? '' }]
    if (resolvedProductId) complaintConditions.push({ productId: resolvedProductId })
    if (resolvedScanId) complaintConditions.push({ scanId: resolvedScanId })

    const relatedComplaints = await this.db.complaint.findMany({
      where: { OR: complaintConditions },
      select: { id: true, complaintRef: true, status: true, createdAt: true },
    })
    const uniqueComplaintsCount = relatedComplaints.length

    // Gather all inspections linked to case or the shared product/scan context
    const inspectionConditions: Prisma.InspectionWhereInput[] = [
      { caseId: regCase.id },
    ]
    if (resolvedProductId) inspectionConditions.push({ productId: resolvedProductId })
    if (resolvedScanId) inspectionConditions.push({ scanId: resolvedScanId })

    const relatedInspections = await this.db.inspection.findMany({
      where: { OR: inspectionConditions },
      include: {
        violations: {
          include: { rule: { select: { ruleNumber: true, title: true } } },
        },
        complianceChecks: true,
        decision: true,
      },
    })

    // Gather all online discrepancies
    const allDiscrepancies =
      regCase.productScan?.onlineVerifications?.flatMap((ov) => ov.discrepancies) || []

    // Collect all violations across case and related inspections
    const allViolationsMap = new Map<string, any>()
    for (const ins of relatedInspections) {
      for (const v of ins.violations) {
        allViolationsMap.set(v.id, v)
      }
    }
    const allViolations = Array.from(allViolationsMap.values())

    // Metrics computation
    const criticalViolations = allViolations.filter((v) => v.severity === 'CRITICAL')
    const highViolations = allViolations.filter((v) => v.severity === 'HIGH')
    const mediumViolations = allViolations.filter((v) => v.severity === 'MEDIUM')
    const lowViolations = allViolations.filter((v) => v.severity === 'LOW')

    const nonCompliantDecisions = relatedInspections.filter(
      (ins) => ins.decision?.decision === 'NON_COMPLIANT'
    )

    const statutoryDiscrepancies = allDiscrepancies.filter(
      (d) => d.isStatutoryConcern || d.discrepancyType === 'PRICE_MISMATCH'
    )

    // Recency check: enforcement action in last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const recentViolations = allViolations.filter((v) => new Date(v.detectedAt) >= ninetyDaysAgo)
    const recentNonCompliant = nonCompliantDecisions.filter(
      (ins) => ins.decision && new Date(ins.decision.decidedAt) >= ninetyDaysAgo
    )
    const recentEnforcementCount = recentViolations.length + recentNonCompliant.length

    const metrics: RiskMetrics = {
      formalViolationsCount: allViolations.length,
      criticalViolationsCount: criticalViolations.length,
      highViolationsCount: highViolations.length,
      mediumViolationsCount: mediumViolations.length,
      lowViolationsCount: lowViolations.length,
      complaintsCount: uniqueComplaintsCount,
      activeCasesCount: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATION', 'DECISION_PENDING'].includes(
        regCase.status
      )
        ? 1
        : 0,
      totalCasesCount: 1,
      onlineDiscrepanciesCount: allDiscrepancies.length,
      statutoryDiscrepanciesCount: statutoryDiscrepancies.length,
      inspectionsCount: relatedInspections.length,
      nonCompliantDecisionsCount: nonCompliantDecisions.length,
      recentEnforcementCount,
    }

    // ─────────────────────────────────────────────────────────────
    // Deterministic Scoring & Contributing Factors
    // ─────────────────────────────────────────────────────────────
    const factors: RiskContributingFactor[] = []
    let totalScore = 0

    // 1. Formal Violations (Max 40 pts)
    let violationPoints = 0
    if (criticalViolations.length > 0) {
      const pts = criticalViolations.length * 20
      violationPoints += pts
      factors.push({
        id: 'factor-violation-critical',
        category: 'VIOLATION',
        title: `${criticalViolations.length} Critical Formal Violation${criticalViolations.length > 1 ? 's' : ''}`,
        description: `Recorded statutory violations with CRITICAL severity under Legal Metrology Act: ${criticalViolations.map((v) => v.rule.ruleNumber).join(', ')}.`,
        points: pts,
        severity: 'CRITICAL',
      })
    }
    if (highViolations.length > 0) {
      const pts = highViolations.length * 12
      violationPoints += pts
      factors.push({
        id: 'factor-violation-high',
        category: 'VIOLATION',
        title: `${highViolations.length} High Severity Violation${highViolations.length > 1 ? 's' : ''}`,
        description: `Formal violations detected with HIGH legal metrology severity: ${highViolations.map((v) => v.rule.ruleNumber).join(', ')}.`,
        points: pts,
        severity: 'HIGH',
      })
    }
    if (mediumViolations.length > 0) {
      const pts = mediumViolations.length * 6
      violationPoints += pts
      factors.push({
        id: 'factor-violation-medium',
        category: 'VIOLATION',
        title: `${mediumViolations.length} Medium Severity Violation${mediumViolations.length > 1 ? 's' : ''}`,
        description: `Formal statutory violations with MEDIUM severity: ${mediumViolations.map((v) => v.rule.ruleNumber).join(', ')}.`,
        points: pts,
        severity: 'MEDIUM',
      })
    }
    if (lowViolations.length > 0) {
      const pts = lowViolations.length * 3
      violationPoints += pts
      factors.push({
        id: 'factor-violation-low',
        category: 'VIOLATION',
        title: `${lowViolations.length} Low Severity Violation${lowViolations.length > 1 ? 's' : ''}`,
        description: `Minor statutory infractions with LOW severity: ${lowViolations.map((v) => v.rule.ruleNumber).join(', ')}.`,
        points: pts,
        severity: 'LOW',
      })
    }
    totalScore += Math.min(40, violationPoints)

    // 2. Repeated Complaints (Max 20 pts)
    if (uniqueComplaintsCount >= 2) {
      const pts = Math.min(20, 10 + (uniqueComplaintsCount - 2) * 5)
      totalScore += pts
      factors.push({
        id: 'factor-complaints-repeat',
        category: 'COMPLAINT',
        title: `Repeated Consumer Complaints (${uniqueComplaintsCount})`,
        description: `Multiple consumer grievances filed regarding this commodity and packaging declarations.`,
        points: pts,
      })
    }

    // 3. Active Enforcement Status (Max 15 pts)
    if (['INVESTIGATION', 'DECISION_PENDING'].includes(regCase.status)) {
      const pts = 15
      totalScore += pts
      factors.push({
        id: 'factor-status-active-investigation',
        category: 'ENFORCEMENT_STATUS',
        title: `Active Investigation Docket (${regCase.status})`,
        description: `Case is actively under physical/legal investigation with pending statutory determination.`,
        points: pts,
      })
    } else if (['ASSIGNED', 'UNDER_REVIEW'].includes(regCase.status)) {
      const pts = 10
      totalScore += pts
      factors.push({
        id: 'factor-status-assigned',
        category: 'ENFORCEMENT_STATUS',
        title: `Assigned Enforcement Review (${regCase.status})`,
        description: `Case has been assigned to an inspecting officer for preliminary inquiry.`,
        points: pts,
      })
    } else if (regCase.status === 'SUBMITTED') {
      const pts = 5
      totalScore += pts
      factors.push({
        id: 'factor-status-submitted',
        category: 'ENFORCEMENT_STATUS',
        title: `Unassigned Intake Docket (SUBMITTED)`,
        description: `New intake docket awaiting supervisory review and officer dispatch.`,
        points: pts,
      })
    }

    // 4. Online E-Commerce Discrepancies (Max 15 pts)
    if (allDiscrepancies.length > 0) {
      let discrepancyPts = 0
      if (statutoryDiscrepancies.length > 0) {
        discrepancyPts += statutoryDiscrepancies.length * 8
      }
      const otherDiscrepanciesCount = allDiscrepancies.length - statutoryDiscrepancies.length
      if (otherDiscrepanciesCount > 0) {
        discrepancyPts += otherDiscrepanciesCount * 4
      }
      const pts = Math.min(15, discrepancyPts)
      totalScore += pts
      factors.push({
        id: 'factor-online-discrepancies',
        category: 'ONLINE_DISCREPANCY',
        title: `E-Commerce Discrepancies Detected (${allDiscrepancies.length})`,
        description: `Physical-vs-online packaging discrepancies cataloged (${statutoryDiscrepancies.length} statutory price/quantity markup concerns).`,
        points: pts,
      })
    }

    // 5. Recency / Repeat Compliance Decisions (Max 10 pts)
    let historyPts = 0
    if (recentEnforcementCount > 0) {
      historyPts += 5
    }
    if (nonCompliantDecisions.length >= 2) {
      historyPts += 5
    }
    if (historyPts > 0) {
      const pts = Math.min(10, historyPts)
      totalScore += pts
      factors.push({
        id: 'factor-compliance-history',
        category: 'COMPLIANCE_HISTORY',
        title: `Recent / Repeated Statutory Non-Compliance`,
        description: `Enforcement history includes recent violations or repeated non-compliant inspection decisions.`,
        points: pts,
      })
    }

    // Cap total score to [0, 100]
    totalScore = Math.min(100, Math.max(0, totalScore))

    // Derive deterministic Risk Level
    let level: RiskLevel = 'LOW'
    if (totalScore >= 75) level = 'CRITICAL'
    else if (totalScore >= 50) level = 'HIGH'
    else if (totalScore >= 25) level = 'MEDIUM'

    const explanation = this.generateExplanation(level, totalScore, metrics, factors)

    return {
      entityType: 'CASE',
      entityId: regCase.id,
      entityIdentifier: regCase.caseNumber,
      score: totalScore,
      level,
      explanation,
      factors,
      metrics,
      assessedAt: new Date(),
    }
  }

  /**
   * Deterministically evaluates investigative risk for a specific registered Product.
   */
  async assessProductRisk(
    productId: string,
    user: { id: string; role: Role }
  ): Promise<RiskAssessment> {
    if (user.role === 'CONSUMER') {
      throw new CaseAccessError('Consumers cannot access regulatory risk intelligence')
    }

    const product = await this.db.product.findUnique({
      where: { id: productId },
      include: {
        scans: {
          include: {
            onlineVerifications: { include: { discrepancies: true } },
          },
        },
        complaints: true,
        inspections: {
          include: {
            violations: {
              include: { rule: { select: { ruleNumber: true, title: true } } },
            },
            decision: true,
          },
        },
      },
    })

    if (!product) {
      throw new CaseAccessError(`Product #${productId} not found`)
    }

    const scanIds = product.scans.map((s) => s.id)
    const cases = await this.db.regulatoryCase.findMany({
      where: {
        OR: [
          { productScanId: { in: scanIds } },
          { complaintId: { in: product.complaints.map((c) => c.id) } },
        ],
      },
    })

    const allViolationsMap = new Map<string, any>()
    for (const ins of product.inspections) {
      for (const v of ins.violations) {
        allViolationsMap.set(v.id, v)
      }
    }
    const allViolations = Array.from(allViolationsMap.values())

    const criticalViolations = allViolations.filter((v) => v.severity === 'CRITICAL')
    const highViolations = allViolations.filter((v) => v.severity === 'HIGH')
    const mediumViolations = allViolations.filter((v) => v.severity === 'MEDIUM')
    const lowViolations = allViolations.filter((v) => v.severity === 'LOW')

    const nonCompliantDecisions = product.inspections.filter(
      (ins) => ins.decision?.decision === 'NON_COMPLIANT'
    )
    const allDiscrepancies = product.scans.flatMap((s) =>
      s.onlineVerifications.flatMap((ov) => ov.discrepancies)
    )
    const activeCases = cases.filter((c) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATION', 'DECISION_PENDING'].includes(c.status)
    )

    let totalScore = 0
    const factors: RiskContributingFactor[] = []

    // 1. Violations (Max 40)
    let violationPoints =
      criticalViolations.length * 20 +
      highViolations.length * 12 +
      mediumViolations.length * 6 +
      lowViolations.length * 3
    if (violationPoints > 0) {
      const pts = Math.min(40, violationPoints)
      totalScore += pts
      factors.push({
        id: 'factor-product-violations',
        category: 'VIOLATION',
        title: `${allViolations.length} Recorded Statutory Violation${allViolations.length > 1 ? 's' : ''}`,
        description: `Commodity has recorded formal violations across statutory packaging inspections.`,
        points: pts,
      })
    }

    // 2. Complaints (Max 20)
    if (product.complaints.length >= 2) {
      const pts = Math.min(20, 10 + (product.complaints.length - 2) * 5)
      totalScore += pts
      factors.push({
        id: 'factor-product-complaints',
        category: 'COMPLAINT',
        title: `Repeated Consumer Complaints (${product.complaints.length})`,
        description: `Multiple consumer grievances filed for this product packaging.`,
        points: pts,
      })
    }

    // 3. Active cases (Max 15)
    if (activeCases.length > 0) {
      const pts = Math.min(15, activeCases.length * 10)
      totalScore += pts
      factors.push({
        id: 'factor-product-active-cases',
        category: 'ENFORCEMENT_STATUS',
        title: `Active Regulatory Dockets (${activeCases.length})`,
        description: `Ongoing active enforcement dockets involving this commodity.`,
        points: pts,
      })
    }

    // 4. Online discrepancies (Max 15)
    if (allDiscrepancies.length > 0) {
      const pts = Math.min(15, allDiscrepancies.length * 5)
      totalScore += pts
      factors.push({
        id: 'factor-product-discrepancies',
        category: 'ONLINE_DISCREPANCY',
        title: `E-Commerce Discrepancies (${allDiscrepancies.length})`,
        description: `Online marketplace listings exhibit packaging or price discrepancies.`,
        points: pts,
      })
    }

    // 5. Non-compliant history (Max 10)
    if (nonCompliantDecisions.length > 0) {
      const pts = Math.min(10, nonCompliantDecisions.length * 5)
      totalScore += pts
      factors.push({
        id: 'factor-product-decisions',
        category: 'COMPLIANCE_HISTORY',
        title: `Non-Compliant Officer Decisions (${nonCompliantDecisions.length})`,
        description: `Concluded inspections resulted in formal NON_COMPLIANT determinations.`,
        points: pts,
      })
    }

    totalScore = Math.min(100, Math.max(0, totalScore))
    let level: RiskLevel = 'LOW'
    if (totalScore >= 75) level = 'CRITICAL'
    else if (totalScore >= 50) level = 'HIGH'
    else if (totalScore >= 25) level = 'MEDIUM'

    const metrics: RiskMetrics = {
      formalViolationsCount: allViolations.length,
      criticalViolationsCount: criticalViolations.length,
      highViolationsCount: highViolations.length,
      mediumViolationsCount: mediumViolations.length,
      lowViolationsCount: lowViolations.length,
      complaintsCount: product.complaints.length,
      activeCasesCount: activeCases.length,
      totalCasesCount: cases.length,
      onlineDiscrepanciesCount: allDiscrepancies.length,
      statutoryDiscrepanciesCount: allDiscrepancies.filter((d) => d.isStatutoryConcern).length,
      inspectionsCount: product.inspections.length,
      nonCompliantDecisionsCount: nonCompliantDecisions.length,
      recentEnforcementCount: allViolations.length,
    }

    return {
      entityType: 'PRODUCT',
      entityId: product.id,
      entityIdentifier: product.name,
      score: totalScore,
      level,
      explanation: this.generateExplanation(level, totalScore, metrics, factors),
      factors,
      metrics,
      assessedAt: new Date(),
    }
  }

  /**
   * Deterministically evaluates corporate regulatory risk for a Manufacturer.
   * Does NOT merge unrelated entities with merely similar or partial names.
   */
  async assessManufacturerRisk(
    manufacturerName: string,
    user: { id: string; role: Role }
  ): Promise<RiskAssessment> {
    if (user.role === 'CONSUMER') {
      throw new CaseAccessError('Consumers cannot access regulatory risk intelligence')
    }

    // Exact or strict case-insensitive match on manufacturer field
    const products = await this.db.product.findMany({
      where: {
        manufacturer: { equals: manufacturerName, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    })
    const productIds = products.map((p) => p.id)

    const complaints = await this.db.complaint.findMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { scan: { identifiedManufacturer: { equals: manufacturerName, mode: 'insensitive' } } },
        ],
      },
    })

    const inspections = await this.db.inspection.findMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { scan: { identifiedManufacturer: { equals: manufacturerName, mode: 'insensitive' } } },
        ],
      },
      include: {
        violations: true,
        decision: true,
      },
    })

    const cases = await this.db.regulatoryCase.findMany({
      where: {
        OR: [
          { productScan: { identifiedManufacturer: { equals: manufacturerName, mode: 'insensitive' } } },
          { complaintId: { in: complaints.map((c) => c.id) } },
        ],
      },
    })

    const allViolations = inspections.flatMap((i) => i.violations)
    const activeCases = cases.filter((c) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATION', 'DECISION_PENDING'].includes(c.status)
    )

    let totalScore = 0
    const factors: RiskContributingFactor[] = []

    if (allViolations.length > 0) {
      const pts = Math.min(40, allViolations.length * 8)
      totalScore += pts
      factors.push({
        id: 'factor-mfg-violations',
        category: 'VIOLATION',
        title: `${allViolations.length} Violations Across Product Portfolio`,
        description: `Corporate manufacturer has recorded statutory violations across registered commodities.`,
        points: pts,
      })
    }

    if (complaints.length >= 2) {
      const pts = Math.min(20, complaints.length * 4)
      totalScore += pts
      factors.push({
        id: 'factor-mfg-complaints',
        category: 'COMPLAINT',
        title: `${complaints.length} Consumer Complaints Filed`,
        description: `Grievances filed regarding commodities produced by this manufacturer.`,
        points: pts,
      })
    }

    if (activeCases.length > 0) {
      const pts = Math.min(15, activeCases.length * 8)
      totalScore += pts
      factors.push({
        id: 'factor-mfg-cases',
        category: 'ENFORCEMENT_STATUS',
        title: `${activeCases.length} Active Enforcement Cases`,
        description: `Ongoing regulatory cases actively open against products of this manufacturer.`,
        points: pts,
      })
    }

    totalScore = Math.min(100, Math.max(0, totalScore))
    let level: RiskLevel = 'LOW'
    if (totalScore >= 75) level = 'CRITICAL'
    else if (totalScore >= 50) level = 'HIGH'
    else if (totalScore >= 25) level = 'MEDIUM'

    const metrics: RiskMetrics = {
      formalViolationsCount: allViolations.length,
      criticalViolationsCount: allViolations.filter((v) => v.severity === 'CRITICAL').length,
      highViolationsCount: allViolations.filter((v) => v.severity === 'HIGH').length,
      mediumViolationsCount: allViolations.filter((v) => v.severity === 'MEDIUM').length,
      lowViolationsCount: allViolations.filter((v) => v.severity === 'LOW').length,
      complaintsCount: complaints.length,
      activeCasesCount: activeCases.length,
      totalCasesCount: cases.length,
      onlineDiscrepanciesCount: 0,
      statutoryDiscrepanciesCount: 0,
      inspectionsCount: inspections.length,
      nonCompliantDecisionsCount: inspections.filter((i) => i.decision?.decision === 'NON_COMPLIANT').length,
      recentEnforcementCount: allViolations.length,
    }

    return {
      entityType: 'MANUFACTURER',
      entityId: manufacturerName,
      entityIdentifier: manufacturerName,
      score: totalScore,
      level,
      explanation: this.generateExplanation(level, totalScore, metrics, factors),
      factors,
      metrics,
      assessedAt: new Date(),
    }
  }

  /**
   * Generates the Authority-Side Risk Queue (/authority/risk),
   * strictly adhering to officer RBAC scoping and sorting by risk score.
   */
  async getRiskQueue(
    user: { id: string; role: Role },
    filters?: RiskQueueFilters
  ): Promise<RiskQueueResponse> {
    if (user.role === 'CONSUMER') {
      throw new CaseAccessError('Consumers cannot access authority risk queue')
    }

    const isSeniorOrAdmin = user.role === 'SENIOR_AUTHORITY' || user.role === 'ADMIN'

    // RBAC: Standard officer only queries permitted cases
    const where: Prisma.RegulatoryCaseWhereInput = {}
    if (!isSeniorOrAdmin) {
      where.OR = [
        { assignedOfficerId: user.id },
        { assignedOfficerId: null, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      ]
    }

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status as any
    }

    // Fetch permitted cases
    const cases = await this.db.regulatoryCase.findMany({
      where,
      include: {
        assignedOfficer: { select: { id: true, name: true } },
        productScan: {
          select: {
            identifiedProductName: true,
            identifiedBrand: true,
            identifiedManufacturer: true,
            product: { select: { name: true, brand: true, manufacturer: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Assess risk for each case in queue
    const scoredItems: RiskQueueItem[] = []
    let criticalCount = 0
    let highCount = 0
    let mediumCount = 0
    let lowCount = 0
    let totalActive = 0

    for (const c of cases) {
      const assessment = await this.assessCaseRisk(c.id, user)

      if (['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATION', 'DECISION_PENDING'].includes(c.status)) {
        totalActive++
      }

      if (assessment.level === 'CRITICAL') criticalCount++
      else if (assessment.level === 'HIGH') highCount++
      else if (assessment.level === 'MEDIUM') mediumCount++
      else lowCount++

      // Filter by level if specified
      if (filters?.level && filters.level !== 'ALL' && assessment.level !== filters.level) {
        continue
      }

      const pScan = c.productScan
      const prod = pScan?.product

      scoredItems.push({
        caseId: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        status: c.status,
        priority: c.priority,
        assignedOfficer: c.assignedOfficer?.name ?? null,
        assignedOfficerId: c.assignedOfficer?.id ?? null,
        productName: prod?.name ?? pScan?.identifiedProductName ?? null,
        brand: prod?.brand ?? pScan?.identifiedBrand ?? null,
        manufacturer: prod?.manufacturer ?? pScan?.identifiedManufacturer ?? null,
        riskScore: assessment.score,
        riskLevel: assessment.level,
        topFactors: assessment.factors.slice(0, 3).map((f) => f.title),
        createdAt: c.createdAt,
      })
    }

    // Sort items
    const sortBy = filters?.sortBy || 'score'
    const sortOrder = filters?.sortOrder || 'desc'

    scoredItems.sort((a, b) => {
      if (sortBy === 'score') {
        return sortOrder === 'asc' ? a.riskScore - b.riskScore : b.riskScore - a.riskScore
      }
      if (sortBy === 'createdAt') {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        return sortOrder === 'asc' ? diff : -diff
      }
      return 0
    })

    // Pagination
    const page = filters?.page || 1
    const pageSize = filters?.pageSize || 20
    const startIndex = (page - 1) * pageSize
    const paginatedItems = scoredItems.slice(startIndex, startIndex + pageSize)

    return {
      items: paginatedItems,
      total: scoredItems.length,
      page,
      pageSize,
      summary: {
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        totalActive,
      },
    }
  }

  /**
   * Generates a clear, non-prejudicial, human-readable explanation
   * strictly grounded in empirical database records.
   */
  private generateExplanation(
    level: RiskLevel,
    score: number,
    metrics: RiskMetrics,
    factors: RiskContributingFactor[]
  ): string {
    if (score === 0 || factors.length === 0) {
      return `This docket exhibits zero recorded formal violations or repeat consumer grievances. Baseline monitoring is recommended under standard inspection schedules.`
    }

    const parts: string[] = []
    if (metrics.formalViolationsCount > 0) {
      parts.push(
        `${metrics.formalViolationsCount} recorded statutory violation${
          metrics.formalViolationsCount > 1 ? 's' : ''
        } (${metrics.criticalViolationsCount} critical, ${metrics.highViolationsCount} high)`
      )
    }
    if (metrics.complaintsCount > 1) {
      parts.push(`${metrics.complaintsCount} consumer complaints`)
    }
    if (metrics.onlineDiscrepanciesCount > 0) {
      parts.push(`${metrics.onlineDiscrepanciesCount} e-commerce listing discrepancies`)
    }
    if (metrics.activeCasesCount > 0) {
      parts.push(`active ongoing regulatory docket`)
    }

    const factorsText = parts.length > 0 ? parts.join(', ') : 'operational intelligence signals'
    return `Evaluated as ${level} risk (score: ${score}/100) based on verified records: ${factorsText}. This score is an investigative dispatch guide and does not constitute a statutory determination of guilt or violation.`
  }
}

export const defaultRiskService = new RiskService()
