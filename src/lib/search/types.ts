import { Role } from '@prisma/client'

export type SearchEntityType =
  | 'ALL'
  | 'CASE'
  | 'COMPLAINT'
  | 'INSPECTION'
  | 'PRODUCT'
  | 'MANUFACTURER'
  | 'BRAND'
  | 'VIOLATION'
  | 'DISCREPANCY'

export interface SearchQueryFilters {
  q?: string
  type?: SearchEntityType
  status?: string
  priority?: string
  severity?: string
  officer?: string
  manufacturer?: string
  brand?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface NormalizedSearchResult {
  id: string
  type: SearchEntityType
  title: string
  subtitle?: string
  status?: string
  priority?: string
  severity?: string
  badgeText?: string
  metadata: Record<string, any>
  href: string
  createdAt?: Date | string
}

export interface SearchResponse {
  results: NormalizedSearchResult[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

export interface ProductInvestigationDossier {
  product: {
    id: string
    name: string
    brand: string | null
    manufacturer: string | null
    category: string | null
    barcode: string | null
    standardQuantity: string | null
    declaredMrp: number | null
    createdAt: Date
  }
  packagingDeclarations: Array<{
    id: string
    name: string
    rawValue: string | null
    normalizedValue: string | null
    status: string
    confidence: number | null
  }>
  scans: Array<{
    id: string
    status: string
    createdAt: Date
    imagesCount: number
  }>
  complaints: Array<{
    id: string
    complaintRef: string
    title: string
    status: string
    createdAt: Date
  }>
  cases: Array<{
    id: string
    caseNumber: string
    title: string
    status: string
    priority: string
    assignedOfficer: string | null
    createdAt: Date
  }>
  inspections: Array<{
    id: string
    title: string | null
    status: string
    officerName: string
    decision: string | null
    createdAt: Date
  }>
  violations: Array<{
    id: string
    ruleNumber: string
    severity: string
    description: string
    remediation: string | null
    inspectionId: string
    createdAt: Date
  }>
  onlineDiscrepancies: Array<{
    id: string
    discrepancyType: string
    domain: string
    physicalValue: string | null
    onlineValue: string | null
    severity: string
    createdAt: Date
  }>
  reports: Array<{
    id: string
    reportRef: string
    title: string | null
    format: string
    generatedAt: Date
  }>
}

export interface EntityInvestigationSummary {
  name: string
  type: 'MANUFACTURER' | 'BRAND'
  summaryCounts: {
    productsCount: number
    complaintsCount: number
    casesCount: number
    inspectionsCount: number
    violationsCount: number
    onlineDiscrepanciesCount: number
  }
  products: Array<{
    id: string
    name: string
    brand: string | null
    manufacturer?: string | null
    category: string | null
    standardQuantity?: string | null
    declaredMrp?: number | null
    createdAt: Date
  }>
  cases: Array<{
    id: string
    caseNumber: string
    title: string
    status: string
    priority: string
    assignedOfficer: string | null
    createdAt: Date
  }>
  complaints: Array<{
    id: string
    complaintRef: string
    title: string
    status: string
    createdAt: Date
  }>
  inspections: Array<{
    id: string
    title: string | null
    status: string
    officerName: string
    decision: string | null
    createdAt: Date
  }>
  violations: Array<{
    id: string
    ruleNumber: string
    severity: string
    description: string
    remediation?: string | null
    inspectionId: string
    createdAt: Date
  }>
  onlineDiscrepancies: Array<{
    id: string
    discrepancyType: string
    domain: string
    physicalValue: string | null
    onlineValue: string | null
    severity: string
    createdAt: Date
  }>
}

export interface ViolationInvestigationDossier {
  violation: {
    id: string
    ruleNumber: string
    severity: string
    description: string
    remediation: string | null
    createdAt: Date
  }
  complianceCheck: {
    id: string
    status: string
    evaluationDetails: any
    officerNote: string | null
    checkedAt: Date
  } | null
  rule: {
    id: string
    ruleNumber: string
    title: string
    description: string
    sourceDocument: string
    sourceReference: string | null
    defaultSeverity: string
    effectiveDate: Date
  }
  historicalRuleVersion: {
    versionNumber: number
    changeDescription: string
    effectiveDate: Date
    snapshot: any
  } | null
  inspection: {
    id: string
    title: string | null
    status: string
    officerName: string
    createdAt: Date
    decision: {
      decision: string
      remarks: string | null
      decidedAt: Date
    } | null
  }
  case: {
    id: string
    caseNumber: string
    title: string
    status: string
    priority: string
  } | null
  relatedActiveCase?: {
    id: string
    caseNumber: string
    title: string
    status: string
    priority: string
  } | null
  product: {
    id: string
    name: string
    brand: string | null
    manufacturer: string | null
  } | null
  evidenceItems: Array<{
    id: string
    type: string
    title: string
    notes: string | null
    sha256Hash?: string
    createdAt: Date
  }>
}

