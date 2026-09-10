import { prisma } from '../prisma'
import type { PrismaClient, InspectionStatus, Role } from '@prisma/client'
import {
  type CreateInspectionInput,
  type UpdateInspectionInput,
  type OfficerDecisionInput,
  type AttachEvidenceInput,
  type InspectionAnalysisResult,
  PERMISSIBLE_TRANSITIONS,
  canUserAccessInspection,
  canUserReopenInspection,
  InspectionAccessError,
  RegulatoryDecisionConsistencyError,
} from './types'
import { buildRuleEngineContextFromDb } from '../rules/context-builder'
import { evaluateRules } from '../rules/rule-engine'
import { audit } from '../audit'
import { EvidenceService } from './evidence-service'

export { InspectionAccessError, RegulatoryDecisionConsistencyError } from './types'


export class InspectionStateTransitionError extends Error {
  constructor(from: InspectionStatus, to: InspectionStatus) {
    super(`Invalid inspection state transition from ${from} to ${to}`)
    this.name = 'InspectionStateTransitionError'
  }
}

export class InspectionService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Creates a new authority inspection.
   */
  async createInspection(
    officerId: string,
    input: CreateInspectionInput,
    ipAddress?: string
  ) {
    let resolvedProductId = input.productId ?? null

    // If scanId provided but no productId, inherit productId from scan
    if (input.scanId && !resolvedProductId) {
      const scan = await this.db.productScan.findUnique({
        where: { id: input.scanId },
        select: { productId: true },
      })
      if (scan?.productId) {
        resolvedProductId = scan.productId
      }
    }

    const inspection = await this.db.inspection.create({
      data: {
        officerId,
        productId: resolvedProductId,
        scanId: input.scanId ?? null,
        title: input.title ?? 'Legal Metrology Packaging Inspection',
        notes: input.notes ?? null,
        status: 'DRAFT',
      },
      include: {
        product: true,
        officer: { select: { id: true, name: true, email: true, role: true } },
        scan: {
          include: {
            images: true,
            extractedDeclarations: true,
            onlineVerifications: {
              include: { snapshot: true, fields: true, discrepancies: true },
            },
          },
        },
      },
    })

    await audit({
      userId: officerId,
      action: 'INSPECTION_CREATED',
      entityType: 'Inspection',
      entityId: inspection.id,
      metadata: { title: inspection.title, scanId: input.scanId, productId: resolvedProductId },
      ipAddress,
    })

    return inspection
  }

  /**
   * Retrieves an inspection with full relation hierarchy, enforcing RBAC.
   */
  async getInspection(
    inspectionId: string,
    user: { id: string; role: Role }
  ) {
    const inspection = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        product: true,
        officer: { select: { id: true, name: true, email: true, role: true } },
        scan: {
          include: {
            images: true,
            extractedDeclarations: { orderBy: { fieldName: 'asc' } },
            onlineVerifications: {
              include: {
                snapshot: true,
                fields: { orderBy: { fieldName: 'asc' } },
                discrepancies: { orderBy: { severity: 'desc' } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        complianceChecks: {
          include: { rule: true },
          orderBy: { checkedAt: 'desc' },
        },
        violations: {
          include: { rule: true },
          orderBy: { detectedAt: 'desc' },
        },
        evidence: {
          include: {
            scanImage: true,
            extractedDeclaration: true,
            onlineVerification: true,
            complianceCheck: { include: { rule: true } },
            violation: true,
            onlineDiscrepancy: true,
            createdBy: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        decision: {
          include: { officer: { select: { id: true, name: true, email: true } } },
        },
        complaint: { select: { id: true, complaintRef: true, status: true, title: true } },
        case: { select: { id: true, caseNumber: true, status: true } },
        reports: { orderBy: { generatedAt: 'desc' } },
      },
    })

    if (!inspection) return null

    if (!canUserAccessInspection(user.role, user.id, inspection.officerId)) {
      throw new InspectionAccessError('You do not have permission to access this inspection')
    }

    return inspection
  }

  /**
   * Updates inspection metadata (title, notes), enforcing RBAC.
   */
  async updateInspection(
    inspectionId: string,
    user: { id: string; role: Role },
    data: UpdateInspectionInput,
    ipAddress?: string
  ) {
    const current = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      select: { officerId: true, status: true },
    })

    if (!current) return null
    if (!canUserAccessInspection(user.role, user.id, current.officerId)) {
      throw new InspectionAccessError('You do not have permission to update this inspection')
    }

    // Closed inspections cannot have metadata mutated without reopening
    if (current.status === 'CLOSED' && (!data.status || data.status === 'CLOSED')) {
      throw new InspectionAccessError('Cannot modify a closed inspection without reopening it')
    }

    // Check status transition if requested
    if (data.status && data.status !== current.status) {
      this.validateTransition(current.status, data.status, user.role)
    }

    const updated = await this.db.inspection.update({
      where: { id: inspectionId },
      data,
    })

    await audit({
      userId: user.id,
      action: 'INSPECTION_UPDATED',
      entityType: 'Inspection',
      entityId: inspectionId,
      metadata: data as any,
      ipAddress,
    })

    return updated
  }

  /**
   * Transitions inspection status with strict state machine and RBAC validation.
   */
  async transitionStatus(
    inspectionId: string,
    user: { id: string; role: Role },
    targetStatus: InspectionStatus,
    ipAddress?: string
  ) {
    const current = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      select: { officerId: true, status: true },
    })

    if (!current) return null
    if (!canUserAccessInspection(user.role, user.id, current.officerId)) {
      throw new InspectionAccessError('You do not have permission to transition this inspection')
    }

    this.validateTransition(current.status, targetStatus, user.role)

    const updated = await this.db.inspection.update({
      where: { id: inspectionId },
      data: { status: targetStatus },
    })

    await audit({
      userId: user.id,
      action: 'INSPECTION_UPDATED',
      entityType: 'Inspection',
      entityId: inspectionId,
      metadata: { previousStatus: current.status, newStatus: targetStatus },
      ipAddress,
    })

    return updated
  }

  /**
   * Executes deterministic Phase 3A/3B Legal Metrology compliance analysis
   * on the inspection's linked scan data.
   *
   * Enforces Mandatory Safeguards:
   * 1. Deterministic Rule Engine is the sole compliance decision engine. No LLM decision making.
   * 2. Status 'WARNING' strictly remains advisory and NEVER produces a formal Violation record.
   * 3. Status 'FAIL' creates an automated formal Violation candidate.
   * 4. Audit trail logged via 'COMPLIANCE_ANALYSIS'.
   */
  async runComplianceAnalysis(
    inspectionId: string,
    user: { id: string; role: Role },
    ipAddress?: string
  ): Promise<InspectionAnalysisResult> {
    const inspection = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      include: { scan: true },
    })

    if (!inspection) {
      throw new Error(`Inspection '${inspectionId}' not found`)
    }

    if (!canUserAccessInspection(user.role, user.id, inspection.officerId)) {
      throw new InspectionAccessError('You do not have permission to run analysis on this inspection')
    }

    if (inspection.status === 'CLOSED') {
      throw new InspectionAccessError('Cannot run compliance analysis on a closed inspection. The inspection must be reopened first.')
    }

    if (!inspection.scanId) {
      throw new Error('Inspection is not linked to any physical ProductScan. Cannot execute packaging compliance analysis.')
    }

    // 1. Build RuleEngineContext from linked ProductScan
    const context = await buildRuleEngineContextFromDb(inspection.scanId, {
      inspectionId: inspection.id,
      client: this.db,
    })

    // 2. Load active legal rules with historical versions
    const rules = await this.db.legalRule.findMany({
      where: { isActive: true },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    })

    // 3. Execute Phase 3A deterministic rule engine
    const summary = evaluateRules(context, rules as any)

    // 4. Wipe previous automated compliance checks & violations for this inspection to re-evaluate cleanly
    await this.db.violation.deleteMany({ where: { inspectionId: inspection.id } })
    await this.db.complianceCheck.deleteMany({ where: { inspectionId: inspection.id } })

    let checksCreated = 0
    let violationsCreated = 0

    // 5. Persist ComplianceCheck records
    for (const result of summary.results) {
      const dbRule = rules.find((r) => r.ruleNumber === result.ruleNumber)
      if (!dbRule) continue

      await this.db.complianceCheck.create({
        data: {
          inspectionId: inspection.id,
          scanId: inspection.scanId,
          ruleId: dbRule.id,
          ruleVersionNumber: result.versionNumber,
          status: result.status,
          evaluationDetails: {
            summary: result.summary,
            conditions: result.conditionResults,
            applicable: result.applicable,
            notApplicableReason: result.notApplicableReason,
          } as any,
          evidence: result.evidence as any,
          officerNote: result.remediationGuidance,
        },
      })
      checksCreated++

      // 6. MANDATORY STATUTORY SAFEGUARD:
      // Only 'FAIL' creates a formal Violation record.
      // 'WARNING' (e.g. Rule 9 font prominence) remains strictly advisory and NEVER creates a Violation!
      if (result.status === 'FAIL') {
        const evidenceFieldIds = (result.evidence || [])
          .map((e) => e.declarationId || e.imageId || e.description || '')
          .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)

        await this.db.violation.create({
          data: {
            inspectionId: inspection.id,
            scanId: inspection.scanId,
            ruleId: dbRule.id,
            description: result.summary,
            severity: result.severity,
            remediationGuidance: result.remediationGuidance,
            evidenceIds: evidenceFieldIds,
          },
        })
        violationsCreated++
      }
    }

    // Automatically transition inspection from DRAFT to IN_PROGRESS upon running analysis
    if (inspection.status === 'DRAFT') {
      await this.db.inspection.update({
        where: { id: inspection.id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    await audit({
      userId: user.id,
      action: 'COMPLIANCE_ANALYSIS',
      entityType: 'Inspection',
      entityId: inspection.id,
      metadata: {
        scanId: inspection.scanId,
        rulesEvaluated: summary.results.length,
        passed: summary.passedCount,
        warnings: summary.warningCount,
        failed: summary.failedCount,
        violationsCreated,
      },
      ipAddress,
    })

    return {
      inspectionId: inspection.id,
      scanId: inspection.scanId,
      totalRulesEvaluated: summary.results.length,
      passedCount: summary.passedCount,
      warningCount: summary.warningCount,
      failedCount: summary.failedCount,
      notApplicableCount: summary.notApplicableCount,
      reviewCount: summary.reviewCount,
      checksCreated,
      violationsCreated,
    }
  }

  /**
   * Records the final official officer decision with mandatory audit trail.
   */
  async recordDecision(
    inspectionId: string,
    user: { id: string; role: Role },
    input: OfficerDecisionInput,
    ipAddress?: string
  ) {
    const inspection = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      select: { officerId: true, status: true },
    })

    if (!inspection) {
      throw new Error(`Inspection '${inspectionId}' not found`)
    }

    if (!canUserAccessInspection(user.role, user.id, inspection.officerId)) {
      throw new InspectionAccessError('You do not have permission to record a decision on this inspection')
    }

    // Validate Regulatory Consistency:
    // If statutory violations exist, a decision of DISMISSED or COMPLIANT requires substantive
    // justification (minimum 15 characters) so that the official ruling does not silently contradict the findings.
    const violations = await this.db.violation.findMany({
      where: { inspectionId },
    })
    const failingChecks = await this.db.complianceCheck.findMany({
      where: { inspectionId, status: 'FAIL' },
    })
    const hasViolations = violations.length > 0 || failingChecks.length > 0

    if (hasViolations && (input.decision === 'DISMISSED' || input.decision === 'COMPLIANT')) {
      const remarks = input.remarks ? input.remarks.trim() : ''
      if (!remarks || remarks.length < 15) {
        throw new RegulatoryDecisionConsistencyError(
          'Statutory violations exist on this inspection. Dismissing or marking this commodity compliant requires substantive regulatory justification (minimum 15 characters) explaining the legal basis.'
        )
      }
    }

    // Upsert officer decision
    const decision = await this.db.officerDecision.upsert({
      where: { inspectionId },
      create: {
        inspectionId,
        officerId: user.id,
        decision: input.decision,
        remarks: input.remarks ?? null,
        decidedAt: new Date(),
      },
      update: {
        officerId: user.id,
        decision: input.decision,
        remarks: input.remarks ?? null,
        decidedAt: new Date(),
      },
    })

    // Automatically transition inspection status
    // If further investigation is required, keep/return to IN_PROGRESS; otherwise CLOSE
    const nextStatus: InspectionStatus =
      input.decision === 'FURTHER_INVESTIGATION' ? 'IN_PROGRESS' : 'CLOSED'

    await this.db.inspection.update({
      where: { id: inspectionId },
      data: { status: nextStatus },
    })

    const isOverride = hasViolations && (input.decision === 'DISMISSED' || input.decision === 'COMPLIANT')

    await audit({
      userId: user.id,
      action: 'AUTHORITY_DECISION',
      entityType: 'Inspection',
      entityId: inspectionId,
      metadata: {
        decision: input.decision,
        remarks: input.remarks,
        resultingStatus: nextStatus,
        isRegulatoryOverride: isOverride,
        violationsOverriddenCount: isOverride ? violations.length : undefined,
        justification: isOverride ? input.remarks : undefined,
      },
      ipAddress,
    })

    return decision
  }

  /**
   * Attaches an inspector evidence item or observation note.
   */
  async attachEvidence(
    inspectionId: string,
    user: { id: string; role: Role },
    input: AttachEvidenceInput,
    ipAddress?: string
  ) {
    const evidenceService = new EvidenceService(this.db)
    return await evidenceService.createEvidence(inspectionId, user, input, ipAddress)
  }


  private validateTransition(from: InspectionStatus, to: InspectionStatus, userRole: Role): void {
    if (from === to) return

    const allowed = PERMISSIBLE_TRANSITIONS[from] || []
    if (!allowed.includes(to)) {
      throw new InspectionStateTransitionError(from, to)
    }

    // Only Senior Authority or Admin can reopen a CLOSED inspection
    if (from === 'CLOSED' && to !== 'CLOSED' && !canUserReopenInspection(userRole)) {
      throw new InspectionAccessError('Only Senior Authority or Administrators can reopen a closed inspection')
    }
  }
}

export const defaultInspectionService = new InspectionService()
