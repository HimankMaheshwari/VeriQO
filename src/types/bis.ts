/**
 * Type definitions and DTOs for SIH 2026 PS107:
 * Indian Standards & Bureau of Indian Standards (BIS) Services.
 */

// ─────────────────────────────────────────────────────────────
// 1. INDIAN STANDARDS & CLAUSES
// ─────────────────────────────────────────────────────────────

export type StandardDivision =
  | 'FAD' // Food and Agriculture
  | 'ETD' // Electrotechnical
  | 'CED' // Civil Engineering
  | 'MED' // Mechanical Engineering
  | 'TXD' // Textile
  | 'CHTD' // Chemical
  | 'MSD' // Management and Systems
  | 'PCD' // Petroleum, Coal and Related Products
  | 'LITD' // Electronics and Information Technology
  | string

export type StandardStatus = 'ACTIVE' | 'REVISED' | 'WITHDRAWN'

export type ClauseType =
  | 'SPECIFICATION'
  | 'TEST_METHOD'
  | 'SAMPLING'
  | 'PACKAGING_MARKING'
  | 'SAFETY_REQUIREMENT'
  | string

export interface StandardLimit {
  parameter: string
  requirement: string
  unit?: string
  min?: number
  max?: number
  testMethod?: string
}

export interface BisStandardClauseDto {
  id: string
  standardId: string
  clauseNumber: string
  title: string | null
  content: string
  isMandatory: boolean
  clauseType: ClauseType | null
  limits?: StandardLimit[] | null
  orderIndex: number
}

export interface BisStandardItem {
  id: string
  standardNumber: string // e.g. "IS 10500:2012"
  title: string
  edition?: string | null
  year?: number | null
  status: StandardStatus | string
  division?: StandardDivision | null
  icsCode?: string | null
  isMandatory: boolean
  mandatedByQco?: string | null
  clausesCount?: number
  createdAt: string
  updatedAt: string
}

export interface BisStandardDetail extends BisStandardItem {
  description?: string | null
  pdfStorageKey?: string | null
  metadata?: Record<string, unknown> | null
  clauses: BisStandardClauseDto[]
  qcos?: QualityControlOrderItem[]
}

export interface StandardSearchFilters {
  q?: string
  division?: string
  isMandatory?: boolean
  status?: string
  page?: number
  pageSize?: number
}

// ─────────────────────────────────────────────────────────────
// 2. BIS LICENSES & SCHEMES
// ─────────────────────────────────────────────────────────────

export type LicenseType = 'ISI_CML' | 'CRS_REGISTRATION' | 'HALLMARK_HUID'

export type LicenseStatus =
  | 'OPERATIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'SURRENDERED'
  | 'NOT_FOUND'
  | 'INVALID_FORMAT'

export interface VerifyCmlInput {
  cmlNumber: string
  standardNumber?: string
}

export interface VerifyCrsInput {
  registrationNumber: string
  brand?: string
}

export interface VerifyHuidInput {
  huid: string
}

export interface LicenseVerificationResult {
  isValid: boolean
  status: LicenseStatus
  licenseType: LicenseType
  licenseNumber: string
  standardNumber?: string | null
  licenseeName?: string | null
  brandName?: string | null
  factoryAddress?: string | null
  validFrom?: string | null
  validUntil?: string | null
  productCategory?: string | null
  varietyDescription?: string | null
  details?: Record<string, unknown> | null
  isDemoRecord: boolean
  message: string
}

// ─────────────────────────────────────────────────────────────
// 3. QUALITY CONTROL ORDERS (QCO)
// ─────────────────────────────────────────────────────────────

export type QcoStatus = 'IN_FORCE' | 'EXTENDED' | 'SUPERSEDED' | 'DRAFT'

export interface QualityControlOrderItem {
  id: string
  orderTitle: string
  orderNumber: string
  ministry: string
  notifiedDate: string
  effectiveDate: string
  status: QcoStatus | string
  standardId?: string | null
  standardNumber?: string | null
  applicableProducts: string
  hsCodes?: string[] | null
  isExemptionApplicable: boolean
  exemptionDetails?: string | null
  gazetteUrl?: string | null
  isDemoRecord: boolean
}

export interface QcoCheckInput {
  category: string
  productName?: string
  hsCode?: string
  manufacturingDate?: string
}

export interface QcoCheckResult {
  isMandatoryCertification: boolean
  applicableOrder?: QualityControlOrderItem | null
  applicableStandards: string[]
  effectiveDate?: string | null
  isExempt: boolean
  exemptionReason?: string | null
  guidance: string
}

// ─────────────────────────────────────────────────────────────
// 4. DUAL-COMPLIANCE VERIFICATION
// ─────────────────────────────────────────────────────────────

export interface PackagingDualComplianceResult {
  scanId: string
  evaluatedAt: string
  qcoApplicable: boolean
  mandatedStandards: string[]
  markDetected: boolean
  detectedMarkType?: LicenseType | null
  declaredLicenseNumber?: string | null
  licenseVerification?: LicenseVerificationResult | null
  isCompliant: boolean
  findings: Array<{
    code: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    title: string
    description: string
    statutoryRemedy: string
  }>
}

// ─────────────────────────────────────────────────────────────
// 5. KNOWLEDGE BASE & RAG TYPES
// ─────────────────────────────────────────────────────────────

export * from '@/lib/bis/knowledge/types'

// ─────────────────────────────────────────────────────────────
// 6. PHASE 5: UNIFIED PACKAGING INSPECTION TYPES
// ─────────────────────────────────────────────────────────────

export * from './bis-inspection'

