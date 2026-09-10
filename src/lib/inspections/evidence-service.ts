import { prisma } from '../prisma'
import type { PrismaClient, Role, EvidenceType, ViolationSeverity, ComplianceStatus } from '@prisma/client'
import {
  type AttachEvidenceInput,
  type PhysicalEvidenceTrace,
  type OnlineEvidenceTrace,
  type EvidenceTimelineItem,
  canUserAccessInspection,
  InspectionAccessError,
} from './types'
import { audit } from '../audit'

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvidenceValidationError'
  }
}

export class EvidenceService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Strictly validates that all referenced foreign artifacts belong to the target inspection / product scan.
   * Prevents cross-inspection evidence injection.
   */
  async validateEvidenceBelongsToInspection(
    inspectionId: string,
    scanId: string | null,
    input: AttachEvidenceInput
  ): Promise<void> {
    // 1. ScanImage validation
    if (input.scanImageId) {
      if (!scanId) {
        throw new EvidenceValidationError('Cannot link ScanImage: inspection has no linked product scan')
      }
      const image = await this.db.scanImage.findUnique({
        where: { id: input.scanImageId },
        select: { scanId: true },
      })
      if (!image || image.scanId !== scanId) {
        throw new EvidenceValidationError(
          `Security violation: Referenced ScanImage '${input.scanImageId}' does not belong to this inspection's scan`
        )
      }
    }

    // 2. ExtractedDeclaration validation
    if (input.extractedDeclarationId) {
      if (!scanId) {
        throw new EvidenceValidationError('Cannot link ExtractedDeclaration: inspection has no linked product scan')
      }
      const decl = await this.db.extractedDeclaration.findUnique({
        where: { id: input.extractedDeclarationId },
        select: { scanId: true },
      })
      if (!decl || decl.scanId !== scanId) {
        throw new EvidenceValidationError(
          `Security violation: Referenced ExtractedDeclaration '${input.extractedDeclarationId}' does not belong to this inspection's scan`
        )
      }
    }

    // 3. OnlineVerification validation
    if (input.onlineVerificationId) {
      if (!scanId) {
        throw new EvidenceValidationError('Cannot link OnlineVerification: inspection has no linked product scan')
      }
      const ver = await this.db.onlineVerification.findUnique({
        where: { id: input.onlineVerificationId },
        select: { scanId: true },
      })
      if (!ver || ver.scanId !== scanId) {
        throw new EvidenceValidationError(
          `Security violation: Referenced OnlineVerification '${input.onlineVerificationId}' does not belong to this inspection's scan`
        )
      }
    }

    // 4. ComplianceCheck validation
    if (input.complianceCheckId) {
      const check = await this.db.complianceCheck.findUnique({
        where: { id: input.complianceCheckId },
        select: { inspectionId: true },
      })
      if (!check || check.inspectionId !== inspectionId) {
        throw new EvidenceValidationError(
          `Security violation: Referenced ComplianceCheck '${input.complianceCheckId}' does not belong to this inspection`
        )
      }
    }

    // 5. Violation validation
    if (input.violationId) {
      const viol = await this.db.violation.findUnique({
        where: { id: input.violationId },
        select: { inspectionId: true },
      })
      if (!viol || viol.inspectionId !== inspectionId) {
        throw new EvidenceValidationError(
          `Security violation: Referenced Violation '${input.violationId}' does not belong to this inspection`
        )
      }
    }

    // 6. OnlineDiscrepancy validation
    if (input.onlineDiscrepancyId) {
      const disc = await this.db.onlineDiscrepancy.findUnique({
        where: { id: input.onlineDiscrepancyId },
        include: { verification: { select: { scanId: true } } },
      })
      if (!disc || disc.verification.scanId !== scanId) {
        throw new EvidenceValidationError(
          `Security violation: Referenced OnlineDiscrepancy '${input.onlineDiscrepancyId}' does not belong to this inspection's scan`
        )
      }
    }
  }

  /**
   * Creates an evidence record with server-side validation against cross-inspection injection.
   */
  async createEvidence(
    inspectionId: string,
    user: { id: string; role: Role },
    input: AttachEvidenceInput,
    ipAddress?: string
  ) {
    const inspection = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      select: { officerId: true, scanId: true, status: true },
    })

    if (!inspection) {
      throw new Error(`Inspection '${inspectionId}' not found`)
    }

    if (!canUserAccessInspection(user.role, user.id, inspection.officerId)) {
      throw new InspectionAccessError('You do not have permission to attach evidence to this inspection')
    }

    if (inspection.status === 'CLOSED') {
      throw new InspectionAccessError('Cannot attach evidence to a closed inspection. The inspection must be reopened first.')
    }

    // Server-side validation against cross-inspection injection
    await this.validateEvidenceBelongsToInspection(inspectionId, inspection.scanId, input)

    const evidence = await this.db.evidence.create({
      data: {
        inspectionId,
        scanId: inspection.scanId,
        type: input.type,
        title: input.title ?? null,
        source: input.source ?? (input.type === 'OFFICER_OBSERVATION' || input.type === 'FIELD_MEASUREMENT' ? 'OFFICER_OBSERVATION' : null),
        description: input.description ?? null,
        confidence: input.confidence ?? 1.0,
        scanImageId: input.scanImageId ?? null,
        extractedDeclarationId: input.extractedDeclarationId ?? null,
        onlineVerificationId: input.onlineVerificationId ?? null,
        complianceCheckId: input.complianceCheckId ?? null,
        violationId: input.violationId ?? null,
        onlineDiscrepancyId: input.onlineDiscrepancyId ?? null,
        createdById: user.id,
        metadata: (input.metadata as any) ?? undefined,
      },
      include: {
        scanImage: true,
        extractedDeclaration: true,
        onlineVerification: true,
        complianceCheck: { include: { rule: true } },
        violation: true,
        onlineDiscrepancy: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    await audit({
      userId: user.id,
      action: 'EVIDENCE_CREATED',
      entityType: 'Evidence',
      entityId: evidence.id,
      metadata: {
        inspectionId,
        type: input.type,
        title: input.title,
        complianceCheckId: input.complianceCheckId,
        violationId: input.violationId,
      },
      ipAddress,
    })

    return evidence
  }

  /**
   * Retrieves all evidence records associated with an inspection, filterable by finding / type.
   */
  async getInspectionEvidence(
    inspectionId: string,
    user: { id: string; role: Role },
    filters?: {
      type?: EvidenceType
      complianceCheckId?: string
      violationId?: string
      onlineDiscrepancyId?: string
    }
  ) {
    const inspection = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      select: { officerId: true },
    })

    if (!inspection) {
      throw new Error(`Inspection '${inspectionId}' not found`)
    }

    if (!canUserAccessInspection(user.role, user.id, inspection.officerId)) {
      throw new InspectionAccessError('You do not have permission to view evidence for this inspection')
    }

    const where: any = { inspectionId }
    if (filters?.type) where.type = filters.type
    if (filters?.complianceCheckId) where.complianceCheckId = filters.complianceCheckId
    if (filters?.violationId) where.violationId = filters.violationId
    if (filters?.onlineDiscrepancyId) where.onlineDiscrepancyId = filters.onlineDiscrepancyId

    return await this.db.evidence.findMany({
      where,
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
    })
  }

  /**
   * Builds the end-to-end Physical Evidence Traceability chain for a specific ComplianceCheck finding:
   * ComplianceCheck -> LegalRule -> RuleVersion -> ExtractedDeclaration -> ScanImage -> ProductScan
   *
   * SAFEGUARDS:
   * - ZERO AI decision making.
   * - Preserves the exact historical RuleVersion associated with the check.
   * - WARNING is marked advisory only with 0 formal violations.
   */
  async getPhysicalEvidenceTrace(
    complianceCheckId: string,
    user: { id: string; role: Role },
    expectedInspectionId?: string
  ): Promise<PhysicalEvidenceTrace> {
    const check = await this.db.complianceCheck.findUnique({
      where: { id: complianceCheckId },
      include: {
        inspection: { select: { id: true, officerId: true, scanId: true } },
        rule: {
          include: {
            versions: { orderBy: { versionNumber: 'desc' } },
          },
        },
        scan: {
          include: {
            extractedDeclarations: true,
            images: true,
          },
        },
      },
    })

    if (!check || !check.inspection) {
      throw new Error(`ComplianceCheck '${complianceCheckId}' not found or unassociated with an inspection`)
    }

    if (expectedInspectionId && check.inspection.id !== expectedInspectionId) {
      throw new InspectionAccessError('Compliance check does not belong to the specified inspection')
    }

    if (!canUserAccessInspection(user.role, user.id, check.inspection.officerId)) {
      throw new InspectionAccessError('You do not have permission to view this compliance check evidence trace')
    }

    // 1. Resolve exact historical RuleVersion (never dynamically swapped)
    let matchedVersion = null
    if (check.rule.versions && check.rule.versions.length > 0) {
      if (check.ruleVersionNumber) {
        matchedVersion = check.rule.versions.find((v) => v.versionNumber === check.ruleVersionNumber) ?? null
      }
      if (!matchedVersion) {
        matchedVersion = check.rule.versions[0] ?? null
      }
    }

    // 2. Identify corresponding declaration field
    const evalDetails = (check.evaluationDetails as any) || {}
    let targetFieldName = ''

    // Attempt to extract field from conditions trace
    if (Array.isArray(evalDetails.conditions)) {
      for (const condResult of evalDetails.conditions) {
        const field = condResult.condition?.field
        if (typeof field === 'string' && field.startsWith('declarations.')) {
          targetFieldName = field.split('.')[1]?.toLowerCase() ?? ''
          break
        }
      }
    }

    // Fallback: infer from rule number
    if (!targetFieldName) {
      const rn = check.rule.ruleNumber
      if (rn.includes('R06-1-A') || rn.includes('Rule 6(1)(a)')) targetFieldName = 'manufacturer'
      else if (rn.includes('R06-1-B') || rn.includes('Rule 6(1)(b)')) targetFieldName = 'product_name'
      else if (rn.includes('R06-1-C') || rn.includes('Rule 6(1)(c)')) targetFieldName = 'net_quantity'
      else if (rn.includes('R06-1-D') || rn.includes('Rule 6(1)(d)')) targetFieldName = 'date_of_packing'
      else if (rn.includes('R06-1-DA') || rn.includes('Rule 6(1)(da)')) targetFieldName = 'country_of_origin'
      else if (rn.includes('R06-1-E') || rn.includes('Rule 6(1)(e)')) targetFieldName = 'mrp'
      else if (rn.includes('R06-1-EA') || rn.includes('Rule 6(1)(ea)')) targetFieldName = 'unit_sale_price'
      else if (rn.includes('R06-1-F') || rn.includes('Rule 6(1)(f)')) targetFieldName = 'customer_care'
      else if (rn.includes('R09') || rn.includes('Rule 9')) targetFieldName = 'net_quantity'
    }

    // 3. Find matched ExtractedDeclaration
    const matchedDeclaration = check.scan?.extractedDeclarations.find(
      (d) => d.fieldName.toLowerCase() === targetFieldName.toLowerCase()
    ) ?? null

    // 4. Find matched ScanImage
    const matchedImage = check.scan?.images[0] ?? null

    // 5. Find formal Violation if this check produced one (FAIL only)
    const violation = await this.db.violation.findFirst({
      where: {
        inspectionId: check.inspectionId ?? undefined,
        ruleId: check.ruleId,
      },
    })

    // 6. Find attached officer evidence for this finding
    const attachedEvidence = await this.db.evidence.findMany({
      where: {
        complianceCheckId: check.id,
      },
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      complianceCheckId: check.id,
      rule: {
        id: check.rule.id,
        ruleNumber: check.rule.ruleNumber,
        title: check.rule.title,
        requirement: check.rule.requirement,
        sourceDocument: check.rule.sourceDocument,
        sourceReference: check.rule.sourceReference,
        defaultSeverity: check.rule.defaultSeverity,
      },
      ruleVersion: matchedVersion
        ? {
            versionNumber: matchedVersion.versionNumber,
            effectiveDate: matchedVersion.effectiveDate,
            changeDescription: matchedVersion.changeDescription,
            snapshot: matchedVersion.snapshot,
          }
        : null,
      status: check.status,
      isAdvisoryOnly: check.status === 'WARNING',
      evaluationDetails: evalDetails,
      declaration: matchedDeclaration
        ? {
            id: matchedDeclaration.id,
            fieldName: matchedDeclaration.fieldName,
            rawValue: matchedDeclaration.rawValue,
            normalizedValue: matchedDeclaration.normalizedValue,
            confidence: matchedDeclaration.confidence,
            detectionStatus: matchedDeclaration.detectionStatus,
            sourceText: matchedDeclaration.sourceText,
            boundingBox: matchedDeclaration.boundingBox,
          }
        : null,
      scanImage: matchedImage
        ? {
            id: matchedImage.id,
            originalFilename: matchedImage.originalFilename,
            storageKey: matchedImage.storageKey,
            mimeType: matchedImage.mimeType,
            sizeBytes: matchedImage.sizeBytes,
          }
        : null,
      violation: violation
        ? {
            id: violation.id,
            severity: violation.severity,
            description: violation.description,
            remediationGuidance: violation.remediationGuidance,
          }
        : null,
      attachedEvidence: attachedEvidence.map((ev) => ({
        id: ev.id,
        type: ev.type,
        title: ev.title,
        description: ev.description,
        createdAt: ev.createdAt,
        createdByName: ev.createdBy?.name ?? null,
      })),
    }
  }

  /**
   * Builds the Online Evidence Traceability chain for an online discrepancy finding:
   * OnlineDiscrepancy -> OnlineListingSnapshot -> OnlineVerification -> Physical Declaration
   */
  async getOnlineEvidenceTrace(
    onlineDiscrepancyId: string,
    user: { id: string; role: Role },
    expectedInspectionId?: string
  ): Promise<OnlineEvidenceTrace> {
    const discrepancy = await this.db.onlineDiscrepancy.findUnique({
      where: { id: onlineDiscrepancyId },
      include: {
        verification: {
          include: {
            snapshot: true,
            scan: {
              include: {
                inspections: { select: { id: true, officerId: true } },
                extractedDeclarations: true,
              },
            },
          },
        },
      },
    })

    if (!discrepancy) {
      throw new Error(`OnlineDiscrepancy '${onlineDiscrepancyId}' not found`)
    }

    let inspection = null
    const inspections = discrepancy.verification.scan?.inspections || []
    if (expectedInspectionId) {
      inspection = inspections.find((i) => i.id === expectedInspectionId)
      if (!inspection) {
        throw new InspectionAccessError('Online discrepancy does not belong to the specified inspection')
      }
    } else {
      inspection = inspections[0] ?? null
    }

    if (inspection && !canUserAccessInspection(user.role, user.id, inspection.officerId)) {
      throw new InspectionAccessError('You do not have permission to view this online discrepancy evidence trace')
    }

    // Match physical declaration for comparison
    const physicalDecl = discrepancy.verification.scan?.extractedDeclarations.find(
      (d) => d.fieldName.toLowerCase() === discrepancy.fieldName.toLowerCase()
    )

    return {
      onlineDiscrepancyId: discrepancy.id,
      verificationId: discrepancy.verificationId,
      sourceUrl: discrepancy.verification.sourceUrl,
      domain: discrepancy.verification.domain,
      status: discrepancy.verification.status,
      overallMatchStatus: discrepancy.verification.overallMatchStatus,
      verifiedAt: discrepancy.verification.verifiedAt,
      snapshot: discrepancy.verification.snapshot
        ? {
            contentHash: discrepancy.verification.snapshot.contentHash,
            httpStatus: discrepancy.verification.snapshot.httpStatus,
            contentType: discrepancy.verification.snapshot.contentType,
            retrievedAt: discrepancy.verification.snapshot.retrievedAt,
          }
        : null,
      discrepancy: {
        fieldName: discrepancy.fieldName,
        discrepancyType: discrepancy.discrepancyType,
        severity: discrepancy.severity,
        physicalValue: discrepancy.physicalValue,
        onlineValue: discrepancy.onlineValue,
        discrepancyRatio: discrepancy.discrepancyRatio,
        message: discrepancy.message,
        isStatutoryConcern: discrepancy.isStatutoryConcern,
        statutoryReference: discrepancy.statutoryReference,
      },
      matchingPhysicalDeclaration: physicalDecl
        ? {
            fieldName: physicalDecl.fieldName,
            rawValue: physicalDecl.rawValue,
            normalizedValue: physicalDecl.normalizedValue,
          }
        : null,
    }
  }

  /**
   * Assembles a complete, chronological Evidence Timeline for an inspection file,
   * categorizing each artifact by provenance.
   */
  async getInspectionTimeline(
    inspectionId: string,
    user: { id: string; role: Role }
  ): Promise<EvidenceTimelineItem[]> {
    const inspection = await this.db.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        scan: {
          include: {
            images: true,
            extractedDeclarations: true,
            onlineVerifications: {
              include: { discrepancies: true },
            },
          },
        },
        complianceChecks: { include: { rule: true } },
        violations: { include: { rule: true } },
        evidence: { include: { createdBy: { select: { name: true } } } },
        decision: { include: { officer: { select: { name: true } } } },
      },
    })

    if (!inspection) {
      throw new Error(`Inspection '${inspectionId}' not found`)
    }

    if (!canUserAccessInspection(user.role, user.id, inspection.officerId)) {
      throw new InspectionAccessError('You do not have permission to view timeline for this inspection')
    }

    const items: EvidenceTimelineItem[] = []

    // 1. Physical Scan Milestone
    if (inspection.scan) {
      items.push({
        id: `scan-${inspection.scan.id}`,
        timestamp: inspection.scan.createdAt,
        provenance: 'PHYSICAL_SCAN',
        title: 'Physical Package Scan Initiated',
        description: `Commodity scan registered for "${inspection.scan.identifiedProductName || 'Packaged Commodity'}".`,
        type: 'SCAN_SESSION',
        badgeText: 'Scan Session',
        badgeVariant: 'info',
        linkId: inspection.scan.id,
      })

      // Packaging Photos
      for (const img of inspection.scan.images) {
        items.push({
          id: `img-${img.id}`,
          timestamp: img.uploadedAt,
          provenance: 'PHYSICAL_SCAN',
          title: `Packaging Image Uploaded: ${img.originalFilename}`,
          description: `High-resolution photograph stored (${Math.round(img.sizeBytes / 1024)} KB, ${img.mimeType}).`,
          type: 'SCAN_IMAGE',
          badgeText: 'Packaging Photo',
          badgeVariant: 'neutral',
          linkId: img.id,
        })
      }

      // OCR Declarations Extracted
      const detectedDecls = inspection.scan.extractedDeclarations.filter((d) => d.detectionStatus === 'DETECTED')
      if (detectedDecls.length > 0) {
        items.push({
          id: `ocr-${inspection.scan.id}`,
          timestamp: detectedDecls[0]?.createdAt ?? inspection.scan.createdAt,
          provenance: 'AUTOMATED_EXTRACTION',
          title: `Mandatory Declarations Extracted (${detectedDecls.length} fields)`,
          description: `Extracted packaging text: ${detectedDecls.map((d) => d.fieldName).join(', ')}.`,
          type: 'DECLARATION_EXTRACTION',
          badgeText: 'OCR Extraction',
          badgeVariant: 'neutral',
        })
      }

      // Online Verification
      for (const ver of inspection.scan.onlineVerifications) {
        items.push({
          id: `online-${ver.id}`,
          timestamp: ver.verifiedAt,
          provenance: 'ONLINE_ACQUISITION',
          title: `E-commerce Listing Verified: ${ver.domain || 'External Source'}`,
          description: `Public listing verified against physical package. Match status: ${ver.overallMatchStatus}. Found ${ver.discrepancies.length} discrepancy item(s).`,
          type: 'ONLINE_VERIFICATION',
          badgeText: ver.overallMatchStatus === 'MATCH' ? 'Listing Match' : 'Discrepancy Found',
          badgeVariant: ver.overallMatchStatus === 'MATCH' ? 'success' : 'error',
          linkId: ver.id,
        })
      }
    }

    // 2. Deterministic Compliance Analysis Results
    for (const check of inspection.complianceChecks) {
      items.push({
        id: `check-${check.id}`,
        timestamp: check.checkedAt,
        provenance: 'DETERMINISTIC_EVALUATION',
        title: `Statutory Check: ${check.rule.ruleNumber} (${check.status})`,
        description: (check.evaluationDetails as any)?.summary || check.rule.title,
        type: 'COMPLIANCE_CHECK',
        badgeText: check.status,
        badgeVariant:
          check.status === 'PASS'
            ? 'success'
            : check.status === 'FAIL'
            ? 'error'
            : check.status === 'WARNING'
            ? 'warning'
            : 'neutral',
        linkId: check.id,
      })
    }

    // 3. Officer Observations and Field Measurements
    for (const ev of inspection.evidence) {
      const isMeasurement = ev.type === 'FIELD_MEASUREMENT'
      items.push({
        id: `ev-${ev.id}`,
        timestamp: ev.createdAt,
        provenance: 'OFFICER_ENTRY',
        title: ev.title || (isMeasurement ? 'Field Measurement Recorded' : 'Inspector Observation Note'),
        description: ev.description || 'Officer recorded field observation.',
        type: ev.type,
        badgeText: isMeasurement ? 'Measurement' : 'Officer Note',
        badgeVariant: isMeasurement ? 'warning' : 'info',
        linkId: ev.id,
      })
    }

    // 4. Final Officer Decision
    if (inspection.decision) {
      items.push({
        id: `decision-${inspection.decision.id}`,
        timestamp: inspection.decision.decidedAt,
        provenance: 'OFFICER_DECISION',
        title: `Official Authority Verdict: ${inspection.decision.decision}`,
        description: inspection.decision.remarks || 'Statutory inspection file closed.',
        type: 'OFFICER_DECISION',
        badgeText: inspection.decision.decision,
        badgeVariant: inspection.decision.decision === 'COMPLIANT' ? 'success' : 'error',
        linkId: inspection.decision.id,
      })
    }

    // Sort descending by timestamp
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return items
  }
}

export const defaultEvidenceService = new EvidenceService()
