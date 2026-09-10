/**
 * VeriQO — Phase 5C: Risk & Regulatory Intelligence Types
 *
 * Hard Architectural Invariant:
 * Risk scoring is an investigative prioritization tool only.
 * It NEVER determines statutory compliance, modifies violations,
 * alters RuleVersions, or replaces the deterministic rule engine.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type RiskFactorCategory =
  | 'VIOLATION'
  | 'COMPLAINT'
  | 'ENFORCEMENT_STATUS'
  | 'ONLINE_DISCREPANCY'
  | 'COMPLIANCE_HISTORY'

export interface RiskContributingFactor {
  id: string
  category: RiskFactorCategory
  title: string
  description: string
  points: number
  severity?: string
  sourceRef?: string
}

export interface RiskMetrics {
  formalViolationsCount: number
  criticalViolationsCount: number
  highViolationsCount: number
  mediumViolationsCount: number
  lowViolationsCount: number
  complaintsCount: number
  activeCasesCount: number
  totalCasesCount: number
  onlineDiscrepanciesCount: number
  statutoryDiscrepanciesCount: number
  inspectionsCount: number
  nonCompliantDecisionsCount: number
  recentEnforcementCount: number
}

export interface RiskAssessment {
  entityType: 'CASE' | 'PRODUCT' | 'MANUFACTURER'
  entityId: string
  entityIdentifier?: string
  score: number // 0 - 100
  level: RiskLevel
  explanation: string
  factors: RiskContributingFactor[]
  metrics: RiskMetrics
  assessedAt: Date
}

export interface RiskQueueItem {
  caseId: string
  caseNumber: string
  title: string
  status: string
  priority: string
  assignedOfficer: string | null
  assignedOfficerId: string | null
  productName: string | null
  brand: string | null
  manufacturer: string | null
  riskScore: number
  riskLevel: RiskLevel
  topFactors: string[]
  createdAt: Date
}

export interface RiskQueueFilters {
  level?: RiskLevel | 'ALL'
  status?: string
  sortBy?: 'score' | 'createdAt' | 'priority'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface RiskQueueResponse {
  items: RiskQueueItem[]
  total: number
  page: number
  pageSize: number
  summary: {
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    totalActive: number
  }
}
