import type { MatchStatus, ViolationSeverity } from '@prisma/client'

export type OnlineDiscrepancyType =
  | 'PRICE_MISMATCH'
  | 'QUANTITY_MISMATCH'
  | 'MANUFACTURER_MISMATCH'
  | 'ORIGIN_MISMATCH'
  | 'GENERIC_NAME_MISMATCH'
  | 'MISSING_ONLINE_MANDATORY_DECLARATION'
  | 'USP_MISMATCH'
  | 'OTHER_MISMATCH'

export interface FetchOptions {
  timeoutMs?: number
  maxSizeBytes?: number
  headers?: Record<string, string>
}

export interface FetchResult {
  url: string
  finalUrl: string
  httpStatus: number
  contentType: string
  htmlContent: string
  contentHash: string
  retrievedAt: Date
  headers: Record<string, string>
}

export interface RawOnlineListing {
  title?: string | null
  brand?: string | null
  manufacturer?: string | null
  packer?: string | null
  importer?: string | null
  countryOfOrigin?: string | null
  genericName?: string | null
  netQuantity?: string | null
  mrp?: string | null
  sellingPrice?: string | null
  unitSalePrice?: string | null
  consumerCare?: string | null
  dateOfPackingOrExpiry?: string | null
  images?: string[]
  sourceUrl: string
  domain: string
  retrievedAt: Date
  extractionSource?: 'json_ld' | 'meta_tags' | 'dom_tables' | 'ai_assist' | 'mixed'
  rawFields?: Record<string, string | null>
}

export interface NormalizedQuantity {
  raw: string
  numericValue: number
  unit: 'mg' | 'g' | 'kg' | 'ml' | 'l' | 'm' | 'cm' | 'mm' | 'piece' | 'units' | 'unknown'
  standardDisplay: string // e.g. "500 g", "1 kg"
  baseGramsOrMl?: number | null // for cross-unit comparison (e.g. 1 kg -> 1000)
}

export interface NormalizedPrice {
  raw: string
  numericValue: number // decimal coinage in INR
  currency: string // 'INR'
  formatted: string // e.g. "₹ 250.00"
}

export interface NormalizedOnlineListing {
  sourceUrl: string
  canonicalUrl: string
  domain: string
  retrievedAt: Date

  title: string | null
  brand: string | null
  genericName: string | null

  manufacturer: string | null
  packer: string | null
  importer: string | null
  countryOfOrigin: string | null

  netQuantity: NormalizedQuantity | null
  mrp: NormalizedPrice | null
  sellingPrice: NormalizedPrice | null
  unitSalePrice: string | null

  consumerCare: string | null
  dateInfo: string | null
  images: string[]

  extractionSource: string
  confidence: number
}

export interface DiscrepancyItem {
  fieldName: string
  discrepancyType: OnlineDiscrepancyType
  severity: ViolationSeverity
  physicalValue: string | null
  onlineValue: string | null
  discrepancyRatio?: number | null
  message: string
  isStatutoryConcern: boolean
  statutoryReference?: string | null
}

export interface ComparisonResult {
  overallMatchStatus: MatchStatus
  matchCount: number
  mismatchCount: number
  unverifiedCount: number
  discrepancies: DiscrepancyItem[]
  matchedFields: string[]
  unverifiedFields: string[]
  summary: string
}

export interface OnlineVerificationRunResult {
  verificationId?: string
  scanId: string
  url: string
  domain: string
  status: 'SUCCESS' | 'FAILED'
  errorMessage?: string
  overallMatchStatus: MatchStatus
  snapshot?: {
    contentHash: string
    httpStatus: number
    contentType?: string
    retrievedAt: Date
  }
  normalizedListing?: NormalizedOnlineListing
  comparison?: ComparisonResult
  ruleEngineEvaluation?: any
}
