import { prisma } from '../prisma'
import type { PrismaClient, Role, CaseStatus } from '@prisma/client'
import {
  type CreateCaseInput,
  type UpdateCaseInput,
  type AssignOfficerInput,
  type RejectCaseInput,
  type ResolveCaseInput,
  type CloseCaseInput,
  type CreateInspectionFromCaseInput,
  type CaseFilters,
  type CaseTimelineItem,
  PERMISSIBLE_CASE_TRANSITIONS,
  canUserAccessCase,
  canUserAssignCase,
  canUserRejectCase,
  canUserResolveCase,
  canUserCloseCase,
  canUserReopenCase,
  CaseAccessError,
  CaseStateTransitionError,
  CasePrerequisiteError,
} from './types'
import { audit } from '../audit'
import { defaultInspectionService } from '../inspections/inspection-service'

export {
  CaseAccessError,
  CaseStateTransitionError,
  CasePrerequisiteError,
} from './types'

export class CaseService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Generates a human-readable regulatory case number.
   * Format: CASE-YYYY-XXXXXX
   */
  generateCaseNumber(): string {
    const year = new Date().getFullYear()
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CASE-${year}-${rand}`
  }

  /**
   * Idempotently retrieves or creates the RegulatoryCase for a given complaint.
   * Preserves all consumer complaint behavior and prevents duplicate case creation.
   */
  async getOrCreateCaseForComplaint(
    complaintId: string,
    ipAddress?: string
  ) {
    const existing = await this.db.regulatoryCase.findUnique({
      where: { complaintId },
      include: {
        complaint: true,
        assignedOfficer: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    if (existing) {
      return existing
    }

    const complaint = await this.db.complaint.findUnique({
      where: { id: complaintId },
      include: { scan: true },
    })

    if (!complaint) {
      throw new Error(`Complaint with ID ${complaintId} not found`)
    }

    const caseNumber = this.generateCaseNumber()

    const newCase = await this.db.regulatoryCase.create({
      data: {
        caseNumber,
        title: complaint.title,
        description: complaint.description,
        status: 'SUBMITTED',
        priority: 'MEDIUM',
        complaintId: complaint.id,
        productScanId: complaint.scanId ?? null,
        createdById: complaint.consumerId,
      },
      include: {
        complaint: true,
        assignedOfficer: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    await audit({
      userId: complaint.consumerId,
      action: 'CASE_CREATED',
      entityType: 'RegulatoryCase',
      entityId: newCase.id,
      metadata: {
        caseNumber: newCase.caseNumber,
        complaintId: complaint.id,
        complaintRef: complaint.complaintRef,
        scanId: complaint.scanId,
      },
      ipAddress,
    })

    return newCase
  }

  /**
   * Creates a manual regulatory case (e.g. for market surveillance or authority inquiry).
   */
  async createCase(
    userId: string,
    input: CreateCaseInput,
    ipAddress?: string
  ) {
    if (input.complaintId) {
      const existing = await this.db.regulatoryCase.findUnique({
        where: { complaintId: input.complaintId },
      })
      if (existing) {
        throw new CasePrerequisiteError(
          `Regulatory case already exists for complaint ${input.complaintId}: ${existing.caseNumber}`
        )
      }
    }

    let resolvedScanId = input.productScanId ?? null
    if (!resolvedScanId && input.complaintId) {
      const complaint = await this.db.complaint.findUnique({
        where: { id: input.complaintId },
        select: { scanId: true },
      })
      if (complaint?.scanId) resolvedScanId = complaint.scanId
    }

    if (input.assignedOfficerId) {
      const targetOfficer = await this.db.user.findUnique({
        where: { id: input.assignedOfficerId },
        select: { role: true },
      })
      if (!targetOfficer || !['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(targetOfficer.role)) {
        throw new CasePrerequisiteError('Assigned officer must be an authority officer or administrator')
      }
    }

    const initialStatus: CaseStatus = input.assignedOfficerId ? 'ASSIGNED' : 'SUBMITTED'
    const caseNumber = this.generateCaseNumber()

    const regulatoryCase = await this.db.regulatoryCase.create({
      data: {
        caseNumber,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? 'MEDIUM',
        status: initialStatus,
        complaintId: input.complaintId ?? null,
        productScanId: resolvedScanId,
        assignedOfficerId: input.assignedOfficerId ?? null,
        createdById: userId,
      },
      include: {
        complaint: true,
        assignedOfficer: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    await audit({
      userId,
      action: 'CASE_CREATED',
      entityType: 'RegulatoryCase',
      entityId: regulatoryCase.id,
      metadata: {
        caseNumber: regulatoryCase.caseNumber,
        title: regulatoryCase.title,
        priority: regulatoryCase.priority,
        status: regulatoryCase.status,
        assignedOfficerId: regulatoryCase.assignedOfficerId,
        scanId: resolvedScanId,
      },
      ipAddress,
    })

    if (regulatoryCase.assignedOfficerId) {
      await audit({
        userId,
        action: 'CASE_ASSIGNED',
        entityType: 'RegulatoryCase',
        entityId: regulatoryCase.id,
        metadata: {
          caseNumber: regulatoryCase.caseNumber,
          assignedOfficerId: regulatoryCase.assignedOfficerId,
          assignedBy: userId,
        },
        ipAddress,
      })
    }

    return regulatoryCase
  }

  /**
   * Retrieves a single regulatory case with full relational graph, enforcing RBAC.
   */
  async getCase(
    caseId: string,
    user: { id: string; role: Role }
  ) {
    const regulatoryCase = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: {
        complaint: {
          include: {
            consumer: { select: { id: true, name: true, email: true } },
            updates: { orderBy: { updatedAt: 'asc' } },
          },
        },
        productScan: {
          include: {
            product: true,
            images: true,
            extractedDeclarations: { orderBy: { fieldName: 'asc' } },
            onlineVerifications: {
              include: {
                snapshot: true,
                discrepancies: { orderBy: { severity: 'desc' } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        assignedOfficer: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        inspections: {
          include: {
            officer: { select: { id: true, name: true, email: true, role: true } },
            decision: true,
            complianceChecks: { select: { id: true, status: true, ruleId: true } },
            violations: { select: { id: true, severity: true, description: true } },
            evidence: { select: { id: true, type: true, title: true } },
            reports: { orderBy: { generatedAt: 'desc' }, take: 1 },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!regulatoryCase) return null

    if (!canUserAccessCase(user.role, user.id, regulatoryCase.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to access this regulatory case')
    }

    return regulatoryCase
  }

  /**
   * Lists regulatory cases with server-side filtering and RBAC isolation.
   */
  async listCases(
    user: { id: string; role: Role },
    filters?: CaseFilters
  ) {
    if (user.role === 'CONSUMER') {
      throw new CaseAccessError('Consumers cannot access authority case inbox')
    }

    const where: any = {}

    // RBAC: Authority Officer only sees assigned cases or unassigned review cases
    if (user.role === 'AUTHORITY_OFFICER') {
      where.OR = [
        { assignedOfficerId: user.id },
        { assignedOfficerId: null, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      ]
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.priority) {
      where.priority = filters.priority
    }

    if (filters?.assignedOfficerId) {
      where.assignedOfficerId = filters.assignedOfficerId
    }

    if (filters?.unassigned) {
      where.assignedOfficerId = null
    }

    if (filters?.search) {
      const q = filters.search.trim()
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { caseNumber: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { complaint: { complaintRef: { contains: q, mode: 'insensitive' } } },
            { productScan: { identifiedProductName: { contains: q, mode: 'insensitive' } } },
            { productScan: { identifiedBrand: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ]
    }

    if (filters?.hasInspection !== undefined) {
      where.inspections = filters.hasInspection ? { some: {} } : { none: {} }
    }

    if (filters?.hasViolations) {
      where.inspections = {
        some: {
          violations: { some: {} },
        },
      }
    }

    return await this.db.regulatoryCase.findMany({
      where,
      include: {
        complaint: { select: { id: true, complaintRef: true, status: true, title: true } },
        productScan: {
          select: {
            id: true,
            identifiedProductName: true,
            identifiedBrand: true,
            identifiedCategory: true,
          },
        },
        assignedOfficer: { select: { id: true, name: true, email: true } },
        inspections: {
          select: {
            id: true,
            status: true,
            decision: { select: { decision: true } },
            violations: { select: { id: true, severity: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })
  }

  /**
   * Updates case metadata (title, description, priority).
   */
  async updateCase(
    caseId: string,
    user: { id: string; role: Role },
    input: UpdateCaseInput,
    ipAddress?: string
  ) {
    const current = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      select: { id: true, status: true, priority: true, assignedOfficerId: true },
    })

    if (!current) return null

    if (!canUserAccessCase(user.role, user.id, current.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to modify this case')
    }

    if (current.status === 'CLOSED') {
      throw new CaseAccessError('Cannot modify a closed case without reopening it')
    }
    if (current.status === 'REJECTED') {
      throw new CaseAccessError('Cannot modify a rejected case without reopening it')
    }

    const data: any = {}
    if (input.title !== undefined) data.title = input.title
    if (input.description !== undefined) data.description = input.description
    if (input.priority !== undefined) data.priority = input.priority

    const updated = await this.db.regulatoryCase.update({
      where: { id: caseId },
      data,
      include: {
        assignedOfficer: { select: { id: true, name: true, email: true } },
      },
    })

    if (input.priority && input.priority !== current.priority) {
      await audit({
        userId: user.id,
        action: 'CASE_PRIORITY_CHANGED',
        entityType: 'RegulatoryCase',
        entityId: caseId,
        metadata: { from: current.priority, to: input.priority },
        ipAddress,
      })
    }

    return updated
  }

  /**
   * Assigns or reassigns an officer to the case.
   * Only Senior Authority or Admin can assign/reassign.
   */
  async assignOfficer(
    caseId: string,
    user: { id: string; role: Role },
    input: AssignOfficerInput,
    ipAddress?: string
  ) {
    if (!canUserAssignCase(user.role)) {
      throw new CaseAccessError('Only Senior Authority or Administrators can assign or reassign cases')
    }

    const current = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: { complaint: true },
    })

    if (!current) return null

    if (current.status === 'CLOSED' || current.status === 'REJECTED') {
      throw new CaseAccessError(`Cannot assign an officer to a ${current.status.toLowerCase()} case`)
    }

    const targetOfficer = await this.db.user.findUnique({
      where: { id: input.officerId },
      select: { id: true, name: true, role: true },
    })

    if (!targetOfficer || !['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(targetOfficer.role)) {
      throw new CasePrerequisiteError('Target user must be an authority officer or administrator')
    }

    const isReassignment = !!current.assignedOfficerId
    const nextStatus: CaseStatus =
      current.status === 'SUBMITTED' || current.status === 'UNDER_REVIEW'
        ? 'ASSIGNED'
        : current.status

    const updated = await this.db.regulatoryCase.update({
      where: { id: caseId },
      data: {
        assignedOfficerId: targetOfficer.id,
        status: nextStatus,
      },
      include: {
        assignedOfficer: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    // If complaint linked and status advanced to ASSIGNED, update complaint
    if (current.complaint && current.complaint.status !== 'ASSIGNED' && nextStatus === 'ASSIGNED') {
      await this.db.complaint.update({
        where: { id: current.complaint.id },
        data: { status: 'ASSIGNED' },
      })
      await this.db.complaintUpdate.create({
        data: {
          complaintId: current.complaint.id,
          updatedById: user.id,
          previousStatus: current.complaint.status,
          newStatus: 'ASSIGNED',
          note: `Case assigned to Inspector ${targetOfficer.name}`,
        },
      })
    }

    const auditAction = isReassignment ? 'CASE_REASSIGNED' : 'CASE_ASSIGNED'
    await audit({
      userId: user.id,
      action: auditAction,
      entityType: 'RegulatoryCase',
      entityId: caseId,
      metadata: {
        previousOfficerId: current.assignedOfficerId,
        newOfficerId: targetOfficer.id,
        newOfficerName: targetOfficer.name,
        reason: input.reason ?? null,
        newStatus: nextStatus,
      },
      ipAddress,
    })

    return updated
  }

  /**
   * Transitions case status with strict state machine and RBAC validation.
   */
  async transitionStatus(
    caseId: string,
    user: { id: string; role: Role },
    targetStatus: CaseStatus,
    reason?: string,
    ipAddress?: string
  ) {
    const current = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: { complaint: true },
    })

    if (!current) return null

    if (!canUserAccessCase(user.role, user.id, current.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to transition this case')
    }

    this.validateTransition(current.status, targetStatus, user.role)

    const updated = await this.db.regulatoryCase.update({
      where: { id: caseId },
      data: { status: targetStatus },
    })

    await audit({
      userId: user.id,
      action: 'CASE_STATUS_CHANGED',
      entityType: 'RegulatoryCase',
      entityId: caseId,
      metadata: { from: current.status, to: targetStatus, reason },
      ipAddress,
    })

    return updated
  }

  /**
   * Controlled rejection of a regulatory case (Adjustment #2).
   */
  async rejectCase(
    caseId: string,
    user: { id: string; role: Role },
    input: RejectCaseInput,
    ipAddress?: string
  ) {
    const current = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: { complaint: true },
    })

    if (!current) return null

    if (!canUserRejectCase(user.role, user.id, current.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to reject this case')
    }

    if (current.status !== 'SUBMITTED' && current.status !== 'UNDER_REVIEW') {
      throw new CaseStateTransitionError(current.status, 'REJECTED')
    }

    if (!input.reason || input.reason.trim().length < 15) {
      throw new CasePrerequisiteError('Substantive rejection justification required (minimum 15 characters)')
    }

    const updated = await this.db.regulatoryCase.update({
      where: { id: caseId },
      data: {
        status: 'REJECTED',
        resolutionNotes: `REJECTED: ${input.reason.trim()}`,
        closedAt: new Date(),
      },
    })

    // If complaint linked, update complaint status to CLOSED
    if (current.complaint) {
      await this.db.complaint.update({
        where: { id: current.complaint.id },
        data: { status: 'CLOSED' },
      })
      await this.db.complaintUpdate.create({
        data: {
          complaintId: current.complaint.id,
          updatedById: user.id,
          previousStatus: current.complaint.status,
          newStatus: 'CLOSED',
          note: `Case rejected: ${input.reason.trim()}`,
        },
      })
    }

    await audit({
      userId: user.id,
      action: 'CASE_STATUS_CHANGED',
      entityType: 'RegulatoryCase',
      entityId: caseId,
      metadata: {
        from: current.status,
        to: 'REJECTED',
        reason: input.reason.trim(),
      },
      ipAddress,
    })

    return updated
  }

  /**
   * Creates an authority inspection directly linked to the case.
   * Automatically advances case status to INVESTIGATION if in ASSIGNED/UNDER_REVIEW.
   */
  async createInspectionFromCase(
    caseId: string,
    user: { id: string; role: Role },
    input?: CreateInspectionFromCaseInput,
    ipAddress?: string
  ) {
    const current = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: { complaint: true },
    })

    if (!current) return null

    if (!canUserAccessCase(user.role, user.id, current.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to create inspections for this case')
    }

    if (current.status === 'CLOSED' || current.status === 'REJECTED') {
      throw new CaseAccessError(`Cannot create an inspection for a ${current.status.toLowerCase()} case`)
    }

    const officerId = current.assignedOfficerId ?? user.id
    const inspectionTitle =
      input?.title ?? `Inspection for Case #${current.caseNumber}: ${current.title}`

    // Reuse existing Phase 4A InspectionService
    const inspection = await defaultInspectionService.createInspection(
      officerId,
      {
        scanId: current.productScanId,
        title: inspectionTitle,
        notes: input?.notes ?? `Originated from Regulatory Case #${current.caseNumber}`,
      },
      ipAddress
    )

    // Connect inspection to case & complaint
    const updatedInspection = await this.db.inspection.update({
      where: { id: inspection.id },
      data: {
        caseId: current.id,
      },
    })

    // Advance case status to INVESTIGATION if ASSIGNED or UNDER_REVIEW
    if (['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED'].includes(current.status)) {
      await this.db.regulatoryCase.update({
        where: { id: caseId },
        data: { status: 'INVESTIGATION' },
      })

      if (current.complaint && current.complaint.status !== 'INVESTIGATING') {
        await this.db.complaint.update({
          where: { id: current.complaint.id },
          data: { status: 'INVESTIGATING' },
        })
        await this.db.complaintUpdate.create({
          data: {
            complaintId: current.complaint.id,
            updatedById: user.id,
            previousStatus: current.complaint.status,
            newStatus: 'INVESTIGATING',
            note: `Inspection #${inspection.id.slice(-6).toUpperCase()} initiated`,
          },
        })
      }

      await audit({
        userId: user.id,
        action: 'CASE_STATUS_CHANGED',
        entityType: 'RegulatoryCase',
        entityId: caseId,
        metadata: {
          from: current.status,
          to: 'INVESTIGATION',
          reason: `Inspection #${inspection.id} created`,
        },
        ipAddress,
      })
    }

    return updatedInspection
  }

  /**
   * Safely links an existing unlinked inspection to a regulatory case.
   * Enforces cross-inspection isolation, product/scan context verification, and forward-looking audit logging.
   */
  async linkExistingInspection(
    caseId: string,
    inspectionId: string,
    user: { id: string; role: Role },
    ipAddress?: string
  ) {
    const currentCase = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: { complaint: true },
    })

    if (!currentCase) {
      throw new Error(`Regulatory case ${caseId} not found`)
    }

    if (!canUserAccessCase(user.role, user.id, currentCase.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to link inspections to this case')
    }

    if (currentCase.status === 'CLOSED' || currentCase.status === 'REJECTED') {
      throw new CaseAccessError(`Cannot link an inspection to a ${currentCase.status.toLowerCase()} case`)
    }

    const inspection = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      include: { scan: true },
    })

    if (!inspection) {
      throw new Error(`Inspection ${inspectionId} not found`)
    }

    if (inspection.caseId && inspection.caseId !== caseId) {
      throw new CasePrerequisiteError('Inspection is already linked to another regulatory case')
    }

    // Context check: If case has a productScanId, ensure inspection scan matches
    if (currentCase.productScanId && inspection.scanId && currentCase.productScanId !== inspection.scanId) {
      throw new CasePrerequisiteError('Inspection scan context does not match case product scan')
    }

    // Link inspection to case
    const updatedInspection = await this.db.inspection.update({
      where: { id: inspectionId },
      data: { caseId },
    })

    // If complaint linked and complaint.inspectionId is not set, link it
    if (currentCase.complaint && !currentCase.complaint.inspectionId) {
      await this.db.complaint.update({
        where: { id: currentCase.complaint.id },
        data: {
          inspectionId,
          status: currentCase.complaint.status === 'SUBMITTED' ? 'INVESTIGATING' : currentCase.complaint.status,
        },
      })
    }

    // If case is in SUBMITTED/UNDER_REVIEW/ASSIGNED and inspection is IN_PROGRESS/PENDING_REVIEW, advance case to INVESTIGATION
    if (
      ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED'].includes(currentCase.status) &&
      ['IN_PROGRESS', 'PENDING_REVIEW'].includes(inspection.status)
    ) {
      await this.db.regulatoryCase.update({
        where: { id: caseId },
        data: {
          status: 'INVESTIGATION',
          assignedOfficerId: currentCase.assignedOfficerId ?? inspection.officerId,
        },
      })

      await audit({
        userId: user.id,
        action: 'CASE_STATUS_CHANGED',
        entityType: 'RegulatoryCase',
        entityId: caseId,
        metadata: {
          from: currentCase.status,
          to: 'INVESTIGATION',
          reason: `Linked to active in-progress inspection #${inspectionId}`,
        },
        ipAddress,
      })
    }

    return updatedInspection
  }

  /**
   * Resolves a regulatory case with mandatory resolution notes and prerequisite validation.
   */
  async resolveCase(
    caseId: string,
    user: { id: string; role: Role },
    input: ResolveCaseInput,
    ipAddress?: string
  ) {
    const current = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: {
        complaint: true,
        inspections: {
          include: { decision: true },
        },
      },
    })

    if (!current) return null

    if (!canUserResolveCase(user.role, user.id, current.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to resolve this case')
    }

    if (current.status !== 'INVESTIGATION' && current.status !== 'DECISION_PENDING') {
      throw new CaseStateTransitionError(current.status, 'RESOLVED')
    }

    if (!input.resolutionNotes || input.resolutionNotes.trim().length < 15) {
      throw new CasePrerequisiteError('Substantive resolution notes required (minimum 15 characters)')
    }

    // Check prerequisites: active inspections must not be left unfinalized
    const incompleteInspections = current.inspections.filter(
      (ins) => ins.status !== 'CLOSED' && !ins.decision
    )
    if (incompleteInspections.length > 0) {
      throw new CasePrerequisiteError(
        `Cannot resolve case while inspection #${incompleteInspections[0].id.slice(-6)} is in progress without an official decision`
      )
    }

    const updated = await this.db.regulatoryCase.update({
      where: { id: caseId },
      data: {
        status: 'RESOLVED',
        resolutionNotes: input.resolutionNotes.trim(),
      },
      include: {
        assignedOfficer: { select: { id: true, name: true, email: true } },
      },
    })

    if (current.complaint) {
      await this.db.complaint.update({
        where: { id: current.complaint.id },
        data: { status: 'RESOLVED' },
      })
      await this.db.complaintUpdate.create({
        data: {
          complaintId: current.complaint.id,
          updatedById: user.id,
          previousStatus: current.complaint.status,
          newStatus: 'RESOLVED',
          note: `Case resolved: ${input.resolutionNotes.trim().substring(0, 100)}...`,
        },
      })
    }

    await audit({
      userId: user.id,
      action: 'CASE_RESOLVED',
      entityType: 'RegulatoryCase',
      entityId: caseId,
      metadata: {
        previousStatus: current.status,
        resolutionNotes: input.resolutionNotes.trim(),
      },
      ipAddress,
    })

    return updated
  }

  /**
   * Formally closes a resolved regulatory case.
   * Only Senior Authority or Admin can close a case.
   */
  async closeCase(
    caseId: string,
    user: { id: string; role: Role },
    input?: CloseCaseInput,
    ipAddress?: string
  ) {
    if (!canUserCloseCase(user.role)) {
      throw new CaseAccessError('Only Senior Authority or Administrators can formally close a case')
    }

    const current = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: { complaint: true },
    })

    if (!current) return null

    if (current.status !== 'RESOLVED') {
      throw new CaseStateTransitionError(current.status, 'CLOSED')
    }

    const closureNotes = input?.remarks?.trim()
    const fullResolutionNotes = closureNotes
      ? `${current.resolutionNotes ?? ''}\n[Closure Remarks by ${user.role}]: ${closureNotes}`.trim()
      : current.resolutionNotes

    const updated = await this.db.regulatoryCase.update({
      where: { id: caseId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        resolutionNotes: fullResolutionNotes,
      },
    })

    if (current.complaint) {
      await this.db.complaint.update({
        where: { id: current.complaint.id },
        data: { status: 'CLOSED' },
      })
      await this.db.complaintUpdate.create({
        data: {
          complaintId: current.complaint.id,
          updatedById: user.id,
          previousStatus: current.complaint.status,
          newStatus: 'CLOSED',
          note: 'Case formally closed by Senior Authority',
        },
      })
    }

    await audit({
      userId: user.id,
      action: 'CASE_CLOSED',
      entityType: 'RegulatoryCase',
      entityId: caseId,
      metadata: {
        closureRemarks: closureNotes,
      },
      ipAddress,
    })

    return updated
  }

  /**
   * Compiles an aggregated, chronological timeline of all case milestones and regulatory audits.
   */
  async getCaseTimeline(
    caseId: string,
    user: { id: string; role: Role }
  ): Promise<CaseTimelineItem[]> {
    const current = await this.db.regulatoryCase.findUnique({
      where: { id: caseId },
      include: {
        complaint: true,
        inspections: { select: { id: true } },
      },
    })

    if (!current) return []

    if (!canUserAccessCase(user.role, user.id, current.assignedOfficerId)) {
      throw new CaseAccessError('You do not have permission to view this case timeline')
    }

    const inspectionIds = current.inspections.map((i) => i.id)

    const auditLogs = await this.db.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'RegulatoryCase', entityId: current.id },
          ...(current.complaintId ? [{ entityType: 'Complaint', entityId: current.complaintId }] : []),
          ...(inspectionIds.length > 0
            ? [{ entityType: 'Inspection', entityId: { in: inspectionIds } }]
            : []),
        ],
      },
      include: {
        user: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const items: CaseTimelineItem[] = []

    for (const log of auditLogs) {
      let title = log.action.replace(/_/g, ' ')
      let badgeVariant: CaseTimelineItem['badgeVariant'] = 'info'
      let description = ''

      const meta = (log.metadata as Record<string, any>) || {}

      switch (log.action) {
        case 'COMPLAINT_SUBMITTED':
          title = 'Consumer Complaint Filed'
          badgeVariant = 'neutral'
          description = `Complaint Reference #${meta.complaintRef ?? log.entityId?.slice(-6)} received from consumer`
          break
        case 'CASE_CREATED':
          title = 'Regulatory Case Opened'
          badgeVariant = 'info'
          description = `Case #${meta.caseNumber ?? current.caseNumber} registered in authority docket`
          break
        case 'CASE_ASSIGNED':
          title = 'Inspector Assigned'
          badgeVariant = 'warning'
          description = `Assigned to ${meta.newOfficerName ?? 'Inspector'}${meta.reason ? ' · Reason: ' + meta.reason : ''}`
          break
        case 'CASE_REASSIGNED':
          title = 'Case Reassigned'
          badgeVariant = 'warning'
          description = `Reassigned to ${meta.newOfficerName ?? 'Inspector'}${meta.reason ? ' · Reason: ' + meta.reason : ''}`
          break
        case 'INSPECTION_CREATED':
          title = 'Formal Inspection Initiated'
          badgeVariant = 'info'
          description = `Inspection #${log.entityId?.slice(-6).toUpperCase()} initiated for compliance evaluation`
          break
        case 'COMPLIANCE_ANALYSIS':
          title = 'Deterministic Compliance Analysis'
          badgeVariant = 'neutral'
          description = `Statutory rules evaluated: ${meta.passedCount ?? 0} Passed, ${meta.failedCount ?? 0} Failed, ${meta.warningCount ?? 0} Warnings`
          break
        case 'AUTHORITY_DECISION':
          title = 'Officer Verdict Recorded'
          badgeVariant = meta.decision === 'COMPLIANT' ? 'success' : 'error'
          description = `Verdict: ${meta.decision}${meta.remarks ? ' · ' + meta.remarks : ''}`
          break
        case 'REPORT_GENERATED':
          title = 'Official Inspection Report Generated'
          badgeVariant = 'success'
          description = `Report Ref #${meta.reportRef ?? ''} generated and cryptographically signed`
          break
        case 'CASE_STATUS_CHANGED':
          title = `Status: ${meta.to}`
          badgeVariant = meta.to === 'REJECTED' ? 'error' : 'info'
          description = `Transitioned from ${meta.from} to ${meta.to}${meta.reason ? ' · ' + meta.reason : ''}`
          break
        case 'CASE_RESOLVED':
          title = 'Case Resolved'
          badgeVariant = 'success'
          description = meta.resolutionNotes ? `Resolution: ${meta.resolutionNotes}` : 'Regulatory case marked resolved'
          break
        case 'CASE_CLOSED':
          title = 'Case Formally Closed'
          badgeVariant = 'neutral'
          description = meta.closureRemarks ? `Closure: ${meta.closureRemarks}` : 'Regulatory case closed by Senior Authority'
          break
        default:
          description = meta.reason || meta.note || ''
      }

      items.push({
        id: log.id,
        timestamp: log.createdAt,
        action: log.action,
        actorName: log.user?.name ?? 'System',
        actorRole: log.user?.role,
        title,
        description: description || null,
        badgeText: log.action.split('_')[0],
        badgeVariant,
        metadata: meta,
      })
    }

    return items
  }

  private validateTransition(from: CaseStatus, to: CaseStatus, userRole: Role): void {
    if (from === to) return

    const allowed = PERMISSIBLE_CASE_TRANSITIONS[from] || []
    if (!allowed.includes(to)) {
      throw new CaseStateTransitionError(from, to)
    }

    // Only Senior Authority or Admin can reopen a CLOSED or REJECTED case
    if ((from === 'CLOSED' || from === 'REJECTED') && to !== from && !canUserReopenCase(userRole)) {
      throw new CaseAccessError('Only Senior Authority or Administrators can reopen a closed or rejected case')
    }
  }
}

export const defaultCaseService = new CaseService()
