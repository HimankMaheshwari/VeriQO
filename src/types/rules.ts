// Legal Rule types — mirrors Prisma LegalRule model
// Phase 3 will populate actual rule data from Legal Metrology Act, 2009
// and Legal Metrology (Packaged Commodities) Rules, 2011

export interface LegalRule {
  id: string
  ruleNumber: string
  title: string
  requirement: string
  applicability?: string
  productCategoryId?: string
  conditions?: Record<string, unknown>
  exceptions?: Record<string, unknown>
  evidenceRequirement?: string
  sourceDocument: string
  sourceReference?: string
  isActive: boolean
  effectiveDate: Date
  expiryDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface RuleVersion {
  id: string
  ruleId: string
  versionNumber: number
  changeDescription: string
  changedById: string
  effectiveDate: Date
  snapshot: Record<string, unknown>
  createdAt: Date
}

export interface CreateRuleInput {
  ruleNumber: string
  title: string
  requirement: string
  applicability?: string
  productCategoryId?: string
  conditions?: Record<string, unknown>
  exceptions?: Record<string, unknown>
  evidenceRequirement?: string
  sourceDocument: string
  sourceReference?: string
  effectiveDate: Date
  expiryDate?: Date
}
