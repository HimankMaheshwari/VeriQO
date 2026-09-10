import type { ComplianceStatus, ViolationSeverity, DetectionStatus } from '@prisma/client'

export type RuleSeverity = ViolationSeverity
export type RuleResultStatus = ComplianceStatus

export type ConditionOperator =
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'MATCHES_REGEX'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'ONE_OF'
  | 'NUMERIC_GT'
  | 'NUMERIC_GTE'
  | 'NUMERIC_LT'
  | 'NUMERIC_LTE'
  | 'NUMERIC_RANGE'
  | 'DATE_FORMAT_VALID'
  | 'DATE_BEFORE_NOW'
  | 'DAYS_BETWEEN'

export interface RuleCondition {
  field: string
  operator: ConditionOperator
  value?: any
  params?: Record<string, any>
  failureMessage?: string
}

export interface RuleConditionGroup {
  operator: 'AND' | 'OR'
  conditions: Array<RuleCondition | RuleConditionGroup>
}

export function isConditionGroup(
  item: RuleCondition | RuleConditionGroup
): item is RuleConditionGroup {
  return 'operator' in item && ('AND' === item.operator || 'OR' === item.operator) && Array.isArray((item as any).conditions)
}

export interface ExtractedFieldSnapshot {
  declarationId: string
  fieldName: string
  rawValue: string | null
  normalizedValue: string | null
  confidence: number
  detectionStatus: DetectionStatus
  sourceText: string | null
  scanImageId?: string
}

export interface RuleEngineContext {
  scanId: string
  inspectionId?: string
  product: {
    name: string | null
    brand: string | null
    category: string | null
    manufacturer: string | null
    confidence: number
    isIndustrialOrInstitutional?: boolean
  }
  declarations: Record<string, ExtractedFieldSnapshot>
  packagingDate?: Date | null
  consumerType?: 'RETAIL' | 'INDUSTRIAL' | 'INSTITUTIONAL'
  isIndustrialOrInstitutional?: boolean
  images: Array<{
    id: string
    storageKey: string
    originalFilename: string
    ocrText?: string | null
  }>
  evaluatedAt: Date
}

export interface MachineReadableRule {
  id: string
  ruleNumber: string
  title: string
  requirement: string
  applicability?: string | null
  ruleCategory?: string | null
  defaultSeverity: RuleSeverity
  productCategoryId?: string | null
  applicabilityCriteria?: RuleConditionGroup
  conditions: RuleConditionGroup
  exceptions?: RuleConditionGroup[]
  remediationGuidance?: string | null
  sourceDocument: string
  sourceReference?: string | null
  effectiveDate: Date
  expiryDate?: Date | null
  versionNumber: number
}

export interface ConditionEvaluationResult {
  condition: RuleCondition
  satisfied: boolean
  actualValue: any
  message?: string
}

export interface RuleEvidenceItem {
  declarationId?: string
  imageId?: string
  sourceText?: string
  confidence?: number
  description?: string
}

export interface RuleEvaluationResult {
  ruleId: string
  ruleNumber: string
  title: string
  versionNumber: number
  status: RuleResultStatus
  severity?: RuleSeverity
  summary: string
  applicable: boolean
  notApplicableReason?: string
  conditionResults: ConditionEvaluationResult[]
  evidence: RuleEvidenceItem[]
  remediationGuidance?: string | null
}

export interface ViolationCandidate {
  ruleId: string
  ruleNumber: string
  description: string
  severity: RuleSeverity
  remediationGuidance?: string | null
  evidence: RuleEvidenceItem[]
}

export interface EngineExecutionSummary {
  scanId: string
  inspectionId?: string
  evaluatedAt: Date
  totalEvaluated: number
  passedCount: number
  warningCount: number
  failedCount: number
  notApplicableCount: number
  reviewCount: number
  results: RuleEvaluationResult[]
  violations: ViolationCandidate[]
}
