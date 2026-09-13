/**
 * Domain types and DTOs for Phase 5:
 * Unified BIS + Legal Metrology (LMPC) Packaging Verification.
 */

import type { LicenseType, LicenseVerificationResult, QualityControlOrderItem } from './bis'

export type BisIdentifierType =
  | 'ISI_MARK'
  | 'CML_NUMBER'
  | 'CRS_REGISTRATION'
  | 'HALLMARK_HUID'
  | 'INDIAN_STANDARD_NUMBER'

export type DetectionState = 'DETECTED' | 'NOT_DETECTED' | 'UNCERTAIN'

export type DetectionSource =
  | 'OCR_TEXT'
  | 'EXTRACTED_DECLARATION'
  | 'VISUAL_INSPECTION'
  | 'HEURISTIC'

export interface BisDetectedIdentifier {
  type: BisIdentifierType
  state: DetectionState
  detectedValue: string | null
  normalizedValue: string | null
  source: DetectionSource
  confidence: number
  evidenceReference: string | null
  isDemoRecord: boolean
}

export type CandidateStandardState = 'ASSOCIATED' | 'UNKNOWN' | 'NEEDS_REVIEW'

export interface CandidateStandardAssociation {
  standardNumber: string
  title: string
  relevance: number
  matchReason: string
  supportingEvidence: string
  clauseReferences: string[]
  chunkReferences: string[]
  isDemoRecord: boolean
  state: CandidateStandardState
}

export type QcoApplicabilityStatus =
  | 'APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'NOT_YET_EFFECTIVE'
  | 'UNKNOWN'

export interface QcoApplicabilityResult {
  status: QcoApplicabilityStatus
  isMandatoryCertification: boolean
  orderTitle: string | null
  orderNumber: string | null
  applicableStandards: string[]
  effectiveDate: string | null
  isExempt: boolean
  exemptionReason: string | null
  guidance: string
  isDemoRecord: boolean
}

export interface BisVerificationSummary {
  identifierType: BisIdentifierType
  identifierValue: string
  status: 'VERIFIED' | 'NOT_VERIFIED' | 'UNKNOWN'
  details: LicenseVerificationResult | null
  isDemoRecord: boolean
}

export type BisFindingStatus =
  | 'CLEAR'
  | 'NEEDS_REVIEW'
  | 'POTENTIAL_NON_COMPLIANCE'
  | 'NOT_APPLICABLE'

export type BisFindingSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface BisFinding {
  domain: 'BIS'
  status: BisFindingStatus
  severity: BisFindingSeverity
  code: string
  title: string
  explanation: string
  recommendation: string
  evidence: string
  standardReference?: string | null
  clauseReference?: string | null
  qcoReference?: string | null
  verificationResult?: string | null
  isDemoRecord: boolean
}

export interface BisInspectionResult {
  status: BisFindingStatus
  identifiers: BisDetectedIdentifier[]
  candidateStandards: CandidateStandardAssociation[]
  qcoChecks: QcoApplicabilityResult[]
  verifications: BisVerificationSummary[]
  findings: BisFinding[]
  evidence: Array<{ id: string; snippet: string; source: string }>
  isDemoData: boolean
  evaluatedAt: string
}

export type OverallInspectionStatus =
  | 'COMPLIANT'
  | 'NEEDS_REVIEW'
  | 'POTENTIAL_NON_COMPLIANCE'
  | 'ACTION_REQUIRED'

export interface UnifiedInspectionResult {
  scanId: string
  evaluatedAt: string
  lmpc: {
    status: string
    summary: string
    declarationsCount?: number
    violationsCount?: number
    details?: Record<string, unknown>
  }
  bis: BisInspectionResult
  overall: {
    status: OverallInspectionStatus
    summary: string
    requiresOfficerReview: boolean
    statutoryAuthority: string
  }
  humanInTheLoop: {
    stage: 'AUTOMATED_DETECTION' | 'DETERMINISTIC_CHECK' | 'VERIFICATION_RESULT' | 'OFFICER_DECISION'
    officerStatus: 'PENDING_OFFICER_REVIEW' | 'OFFICER_VERIFIED' | 'OFFICER_REJECTED'
    advisoryNotice: string
  }
}

/**
 * Structured inspection report data prepared for unified dual-domain reporting.
 * Designed to directly plug into existing PDF/Report generators in future phases.
 */
export interface UnifiedInspectionReportData {
  reportRef: string
  generatedAt: string
  scanId: string
  inspectionId?: string | null
  product: {
    name: string | null
    brand: string | null
    category: string | null
    manufacturer: string | null
  } | null
  lmpc: {
    status: string
    summary: string
    declarationsCount: number
    violationsCount: number
  }
  bis: BisInspectionResult
  overall: {
    status: OverallInspectionStatus
    summary: string
    requiresOfficerReview: boolean
  }
  humanInTheLoop: {
    stage: string
    officerStatus: string
    advisoryNotice: string
  }
  isDemoData: boolean
  securityHash: string
}
