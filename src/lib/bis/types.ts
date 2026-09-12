/**
 * Type definitions for the BIS (Bureau of Indian Standards) Knowledge Retrieval Service.
 * Isolated from Legal Metrology compliance types.
 */

import type { BisKnowledgeService } from './bis-knowledge-service'

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

// ─────────────────────────────────────────────────────────────
// ASSISTANT & INTENT TYPES (PS107 Task #3)
// ─────────────────────────────────────────────────────────────

export type BisQueryIntent =
  | 'STANDARD_DISCOVERY'
  | 'STANDARD_DETAILS'
  | 'RELATED_STANDARDS'
  | 'CERTIFICATION_GUIDANCE'
  | 'TESTING_REQUIREMENTS'
  | 'LABORATORY_DISCOVERY'
  | 'HALLMARKING'
  | 'BIS_PROCESS'
  | 'TECHNICAL_QUERY'
  | 'PRODUCT_ANALYSIS'
  | 'CONSUMER_QUERY'
  | 'GENERAL_BIS'
  | 'UNKNOWN'

export interface BisIntentResult {
  intent: BisQueryIntent
  confidence: number
}

export interface StructuredBisQuery {
  originalQuery: string
  normalizedQuery: string
  productName?: string | null
  category?: string | null
  intent: BisQueryIntent
  keywords: string[]
  standardNumber?: string | null
}

export interface BisStandardMatch {
  standardNumber: string
  title: string
  relevance: number
  whyApplicable: string
  evidence?: string[]
}

export interface BisSourceCitation {
  sourceTitle: string
  documentId?: string | null
  standardNumber?: string | null
  section?: string | null
  clause?: string | null
  page?: string | null
  url?: string | null
}

export type BisAssistantConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'

export interface BisAssistantResult {
  answer: string
  intent: BisQueryIntent
  confidence: BisAssistantConfidence
  product?: {
    productName: string | null
    category: string | null
  } | null
  standards: BisStandardMatch[]
  sources: BisSourceCitation[]
  nextSteps?: string[]
  isDemoData?: boolean
}

export interface BisAssistantOptions {
  knowledgeService?: BisKnowledgeService
  apiKey?: string
  modelName?: string
  temperature?: number
}
