/**
 * PS107 Authority Officer & QCO Verification Type Definitions
 * VeriQO 2.0 - Bridging Legal Metrology with BIS Standards
 */

export type OfficerVerificationStatus =
  | 'AI_ADVISORY'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED_BY_OFFICER'
  | 'REQUIRES_FURTHER_REVIEW'

export interface VerificationEvidenceItem {
  id: string
  source: string              // e.g. "Physical Package Label", "OCR Extraction", "QCO Order Database"
  documentReference: string   // e.g. "LMPC Rule 6(1)", "IS 14543:2016", "Gazette S.O. 3932(E)"
  clauseReference?: string    // e.g. "Clause 4.1", "Rule 6(1)(a)"
  evidenceText: string        // Verbatim or extracted text snippet
  originatingWorkflow: string // e.g. "Legal Metrology OCR", "BIS Standards Directory", "Field Inspection"
  timestamp: string
  verificationStatus: OfficerVerificationStatus
}

export interface QcoReferenceInfo {
  standardNumber: string
  standardTitle: string
  qcoNotificationNumber: string
  issuingMinistry: string
  verificationStatus: string
  isMandatory: boolean
}

export interface OfficerVerificationRecord {
  inspectionId: string
  status: OfficerVerificationStatus
  verifiedByOfficerName?: string
  verifiedByOfficerRole?: string
  verifiedAt?: string
  comments?: string
  checklist: Record<string, boolean>
}

export interface AuthorityVerificationService {
  getQcoReferenceForProduct(
    productName: string,
    category?: string | null
  ): QcoReferenceInfo

  getTraceabilityEvidenceItems(
    inspectionId: string,
    scanId?: string | null,
    productName?: string
  ): VerificationEvidenceItem[]

  getInitialVerificationRecord(
    inspectionId: string
  ): OfficerVerificationRecord
}
