/**
 * Type definitions for the BIS (Bureau of Indian Standards) Knowledge Retrieval Service.
 * Isolated from Legal Metrology compliance types.
 */

export interface CompactBisStandard {
  id: string
  standardNumber: string
  title: string
  category: string
  productCategory: string | null
  isMandatory: boolean
  qcoReference: string | null
  certificationScheme: string | null
  keyRequirements: any
  description?: string | null
}

export interface BisSearchFilters {
  category?: string
  productCategory?: string
  isMandatory?: boolean
  certificationScheme?: string
  limit?: number
  offset?: number
}

export interface BisSearchResponse {
  total: number
  standards: CompactBisStandard[]
}

export interface BisStandardCreateInput {
  id?: string
  standardNumber: string
  title: string
  description?: string | null
  category: string
  productCategory?: string | null
  isMandatory?: boolean
  qcoReference?: string | null
  effectiveDate?: Date | null
  certificationScheme?: string | null
  keyRequirements?: any
  recognizedLabs?: any
}
