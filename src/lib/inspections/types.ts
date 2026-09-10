import type {
  InspectionStatus,
  AuthorityDecision,
  EvidenceType,
  ComplianceStatus,
  ViolationSeverity,
  Role,
} from '@prisma/client'

export interface CreateInspectionInput {
  productId?: string | null
  scanId?: string | null
  title?: string | null
  notes?: string | null
}

export interface UpdateInspectionInput {
  title?: string
  notes?: string
  status?: InspectionStatus
  productId?: string | null
  scanId?: string | null
}

export interface OfficerDecisionInput {
  decision: AuthorityDecision
  remarks?: string | null
}

export interface AttachEvidenceInput {
  type: EvidenceType
  title?: string | null
  source?: string | null
  description?: string | null
  confidence?: number | null
  scanImageId?: string | null
  extractedDeclarationId?: string | null
  onlineVerificationId?: string | null
  complianceCheckId?: string | null
  violationId?: string | null
  onlineDiscrepancyId?: string | null
  metadata?: Record<string, any> | null
}

export interface PhysicalEvidenceTrace {
  complianceCheckId: string
  rule: {
    id: string
    ruleNumber: string
    title: string
    requirement: string
    sourceDocument: string
    sourceReference: string | null
    defaultSeverity: ViolationSeverity
  }
  ruleVersion: {
    versionNumber: number
    effectiveDate: string | Date
    changeDescription: string
    snapshot: any
  } | null
  status: ComplianceStatus
  isAdvisoryOnly: boolean
  evaluationDetails: {
    summary?: string
    conditions?: any[]
    applicable?: boolean
    notApplicableReason?: string
  } | null
  declaration: {
    id: string
    fieldName: string
    rawValue: string | null
    normalizedValue: string | null
    confidence: number | null
    detectionStatus: string
    sourceText: string | null
    boundingBox: any | null
  } | null
  scanImage: {
    id: string
    originalFilename: string
    storageKey: string
    mimeType: string
    sizeBytes: number
  } | null
  violation: {
    id: string
    severity: ViolationSeverity
    description: string
    remediationGuidance: string | null
  } | null
  attachedEvidence: Array<{
    id: string
    type: EvidenceType
    title: string | null
    description: string | null
    createdAt: string | Date
    createdByName?: string | null
  }>
}

export interface OnlineEvidenceTrace {
  onlineDiscrepancyId: string
  verificationId: string
  sourceUrl: string
  domain: string | null
  status: string
  overallMatchStatus: string
  verifiedAt: string | Date
  snapshot: {
    contentHash: string
    httpStatus: number
    contentType: string | null
    retrievedAt: string | Date
  } | null
  discrepancy: {
    fieldName: string
    discrepancyType: string
    severity: ViolationSeverity
    physicalValue: string | null
    onlineValue: string | null
    discrepancyRatio: number | null
    message: string
    isStatutoryConcern: boolean
    statutoryReference: string | null
  }
  matchingPhysicalDeclaration: {
    fieldName: string
    rawValue: string | null
    normalizedValue: string | null
  } | null
}

export type TimelineProvenance =
  | 'PHYSICAL_SCAN'
  | 'AUTOMATED_EXTRACTION'
  | 'DETERMINISTIC_EVALUATION'
  | 'ONLINE_ACQUISITION'
  | 'OFFICER_ENTRY'
  | 'OFFICER_DECISION'

export interface EvidenceTimelineItem {
  id: string
  timestamp: string | Date
  provenance: TimelineProvenance
  title: string
  description: string
  type: string
  badgeText?: string
  badgeVariant?: 'success' | 'error' | 'warning' | 'info' | 'neutral'
  metadata?: Record<string, any>
  linkId?: string
}

export interface InspectionAnalysisResult {
  inspectionId: string
  scanId: string
  totalRulesEvaluated: number
  passedCount: number
  warningCount: number
  failedCount: number
  notApplicableCount: number
  reviewCount: number
  checksCreated: number
  violationsCreated: number
}

export const PERMISSIBLE_TRANSITIONS: Record<InspectionStatus, InspectionStatus[]> = {
  DRAFT: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['PENDING_REVIEW', 'DRAFT', 'CLOSED'],
  PENDING_REVIEW: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['IN_PROGRESS'], // Only Senior Authority / Admin can reopen
}

export function canUserAccessInspection(
  userRole: Role,
  userId: string,
  inspectionOfficerId: string
): boolean {
  if (userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN') {
    return true
  }
  return userRole === 'AUTHORITY_OFFICER' && userId === inspectionOfficerId
}

export function canUserReopenInspection(userRole: Role): boolean {
  return userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN'
}

export class InspectionAccessError extends Error {
  constructor(message: string = 'Access denied to inspection') {
    super(message)
    this.name = 'InspectionAccessError'
  }
}

export class RegulatoryDecisionConsistencyError extends Error {
  constructor(message: string = 'Substantive justification required for contradictory regulatory decision') {
    super(message)
    this.name = 'RegulatoryDecisionConsistencyError'
  }
}

export interface InspectionReportData {
  reportRef: string
  generatedAt: Date
  securityHash: string
  inspection: {
    id: string
    title: string
    status: InspectionStatus
    notes: string | null
    createdAt: Date
    updatedAt: Date
  }
  officer: {
    id: string
    name: string
    email: string
    role: Role
  }
  product: {
    id: string | null
    name: string
    brand: string | null
    genericName: string | null
    category: string | null
    manufacturer: string | null
    packer: string | null
    importer: string | null
    countryOfOrigin: string | null
    barcode: string | null
  } | null
  scan: {
    id: string
    createdAt: Date
    identificationStatus: string | null
    identifiedProductName: string | null
    identifiedBrand: string | null
    identifiedCategory: string | null
    identifiedManufacturer: string | null
    images: Array<{
      id: string
      originalFilename: string
      storageKey: string
      mimeType: string
      sizeBytes: number
      uploadedAt: Date
    }>
  } | null
  declarations: Array<{
    id: string
    fieldName: string
    rawValue: string | null
    normalizedValue: string | null
    confidence: number | null
    detectionStatus: string
    sourceText: string | null
  }>
  complianceChecks: Array<{
    id: string
    ruleId: string
    ruleNumber: string
    ruleTitle: string
    ruleRequirement: string
    ruleVersionNumber: number
    ruleEffectiveDate: Date | null
    ruleChangeDescription: string | null
    sourceDocument: string
    sourceReference: string | null
    status: ComplianceStatus
    isAdvisoryOnly: boolean
    evaluationSummary: string | null
    checkedAt: Date
  }>
  violations: Array<{
    id: string
    ruleNumber: string
    ruleTitle: string
    severity: ViolationSeverity
    description: string
    remediationGuidance: string | null
    detectedAt: Date
  }>
  onlineVerification: {
    id: string
    sourceUrl: string
    domain: string | null
    overallMatchStatus: string
    verifiedAt: Date
    snapshot: {
      contentHash: string
      httpStatus: number
      contentType: string | null
      retrievedAt: Date
    } | null
    discrepancies: Array<{
      id: string
      fieldName: string
      discrepancyType: string
      severity: ViolationSeverity
      physicalValue: string | null
      onlineValue: string | null
      discrepancyRatio: number | null
      message: string
      isStatutoryConcern: boolean
      statutoryReference: string | null
    }>
  } | null
  evidenceItems: Array<{
    id: string
    type: EvidenceType
    title: string | null
    source: string | null
    description: string | null
    confidence: number | null
    createdByName: string | null
    createdAt: Date
    complianceCheckId: string | null
    violationId: string | null
  }>
  decision: {
    id: string
    decision: AuthorityDecision
    remarks: string | null
    decidedAt: Date
    officerName: string
  } | null
}

export interface AuthorityAnalytics {
  scope: 'OFFICER' | 'GLOBAL'
  officerId?: string
  totalInspections: number
  inspectionsByStatus: {
    DRAFT: number
    IN_PROGRESS: number
    PENDING_REVIEW: number
    CLOSED: number
  }
  officerDecisions: {
    COMPLIANT: number
    NON_COMPLIANT: number
    FURTHER_INVESTIGATION: number
    DISMISSED: number
    PENDING: number
  }
  violationsBySeverity: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
    TOTAL: number
  }
  topViolatedRules: Array<{
    ruleId: string
    ruleNumber: string
    title: string
    count: number
    severity: ViolationSeverity
  }>
  onlineVerificationStats: {
    totalChecked: number
    matchedCount: number
    mismatchCount: number
    statutoryConcernsCount: number
    matchRatePercentage: number
  }
  recentActivity: Array<{
    id: string
    title: string
    productName: string
    officerName: string
    status: InspectionStatus
    decision: AuthorityDecision | null
    createdAt: Date
    updatedAt: Date
  }>
  monthlyTrends: Array<{
    month: string
    label: string
    inspectionsCreated: number
    inspectionsClosed: number
    violationsDetected: number
  }>
}

