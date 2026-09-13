/**
 * PS107 Indian Standards & BIS Regulations Type Definitions
 * VeriQO 2.0 - Bureau of Indian Standards (BIS) & Quality Control Orders (QCO)
 */

export interface StandardClause {
  clauseNumber: string
  title: string
  description: string
  testingMethod?: string
  prescribedTolerance?: string
  isMandatoryCheck: boolean
}

export interface IndianStandardSummary {
  id: string
  standardNumber: string         // e.g. "IS 14543:2016"
  title: string                  // e.g. "Packaged Drinking Water (Other Than Packaged Natural Mineral Water)"
  year: number
  category: string               // e.g. "Food & Agriculture", "Chemicals", "Electronics"
  isMandatoryQco: boolean        // Subject to mandatory Quality Control Order
  qcoNotificationNumber?: string // e.g. "S.O. 1234(E)"
  status: 'ACTIVE' | 'SUPERSEDED' | 'UNDER_REVISION'
  applicableCommodities: string[]
  labCount?: number
}

export interface IndianStandardDetail extends IndianStandardSummary {
  scope: string
  criticalParameters: string[]
  clauses: StandardClause[]
  applicableScheme: 'SCHEME_I' | 'SCHEME_II' | 'SCHEME_X' | 'HALLMARKING'
  accreditedLabCount: number
  documentReferenceUrl?: string
}

export type SchemeType = 'SCHEME_I' | 'SCHEME_II' | 'SCHEME_X' | 'HALLMARKING'

export interface CertificationScheme {
  id: string
  code: SchemeType
  name: string                   // e.g. "Product Certification Scheme (ISI Mark)"
  markName: string               // e.g. "ISI Mark"
  description: string
  applicableTo: string
  regulatoryAct: string          // e.g. "BIS Act, 2016"
  steps: {
    stepNumber: number
    title: string
    description: string
    requiredDocuments: string[]
    estimatedDays?: number
  }[]
  feeStructureSummary: string
  renewalPeriod: string
}

export interface TestingLaboratory {
  id: string
  name: string
  registrationNumber: string     // e.g. "BIS-LAB-2024-049" or NABL Accreditation No.
  labType: 'BIS_CENTRAL' | 'BIS_REGIONAL' | 'NABL_ACCREDITED' | 'RECOGNIZED_PRIVATE'
  address: string
  city: string
  state: string
  pincode: string
  contactPhone?: string
  contactEmail?: string
  supportedStandards: string[]   // Array of IS codes, e.g. ["IS 14543", "IS 1061"]
  validUntil: string | Date
  status: 'ACTIVE' | 'SUSPENDED'
  isDemoData?: boolean
}

export interface HallmarkingGuideline {
  id: string
  metal: 'GOLD' | 'SILVER'
  purityGrade: string            // e.g. "22K916", "18K750", "14K585"
  fineness: number               // e.g. 916.0
  standardCode: string           // e.g. "IS 1417" for Gold, "IS 2112" for Silver
  description: string
  mandatorySymbols: {
    symbolName: string
    description: string
    visualDescription: string
  }[]
  huidFormatDescription: string // 6-digit alphanumeric e.g. "AB1234"
}

export const STANDARDS_CATEGORIES = [
  'All Sectors',
  'Food & Agriculture',
  'Electronics & IT',
  'Chemicals & Plastics',
  'Civil Engineering & Cement',
  'Mechanical & Automotive',
  'Textiles & Garments',
  'Medical Equipment',
  'Jewellery & Precious Metals',
] as const

export type StandardsCategory = typeof STANDARDS_CATEGORIES[number]

export type MatchLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface StandardMatchReasoning {
  summary: string
  matchedKeywords: string[]
  applicabilityNotes: string
  regulatoryStatusNote: string
}

export interface StandardDiscoveryItem extends IndianStandardDetail {
  shortDescription: string
  matchScore: number             // 0-100 advisory match confidence
  matchLevel: MatchLevel
  reasoning?: StandardMatchReasoning
  officialSource: {
    gazetteNumber?: string
    bisPortalUrl?: string
    yearOfPublication: number
    ministryOrDepartment?: string
  }
}

export type QcoFilterOption = 'ALL' | 'MANDATORY' | 'VOLUNTARY'
export type SortOption = 'RELEVANCE' | 'STANDARD_ASC' | 'YEAR_DESC'

export interface StandardsFilterState {
  query: string
  productDescription: string
  category: string
  qcoType: QcoFilterOption
  sortBy: SortOption
}

export interface StandardsDiscoveryResult {
  items: StandardDiscoveryItem[]
  totalCount: number
  hasSearched: boolean
  appliedQuery?: string
  appliedDescription?: string
}

export interface StandardsDiscoveryService {
  searchStandards(filters: Partial<StandardsFilterState>): Promise<StandardsDiscoveryResult>
  getStandardById(id: string): Promise<StandardDiscoveryItem | null>
  getFeaturedStandards(): Promise<StandardDiscoveryItem[]>
  findStandardsByDescription(description: string): Promise<StandardsDiscoveryResult>
}
