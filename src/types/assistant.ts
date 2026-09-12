/**
 * Type definitions and DTOs for SIH 2026 PS107:
 * AI-Powered Intelligent Assistant for Indian Standards & BIS Services.
 */

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

export interface CitationSource {
  standardNumber: string // e.g. "IS 10500:2012"
  standardTitle?: string
  clauseNumber?: string // e.g. "Table 1", "Clause 4.2"
  clauseTitle?: string
  excerpt: string
  qcoReference?: string
  chunkId?: string
  sourceReference?: string
  relevanceScore?: number
}

export interface AssistantMessageDto {
  id: string
  role: MessageRole
  content: string
  citations?: CitationSource[] | null
  confidenceScore?: number | null
  createdAt: string
}

export interface AssistantConversationDto {
  id: string
  userId?: string | null
  title: string
  contextStandardId?: string | null
  messages: AssistantMessageDto[]
  createdAt: string
  updatedAt: string
}

export interface AssistantChatRequest {
  message: string
  conversationId?: string
  contextStandardNumber?: string
}

export interface RetrievedEvidenceItem {
  chunkId: string
  standardNumber: string
  standardTitle?: string
  clauseNumber?: string | null
  clauseTitle?: string | null
  text: string
  score: number
  sourceReference: string
  isDemoRecord?: boolean
}

export interface AssistantChatResponse {
  conversationId: string
  messageId: string
  reply: string
  citations: CitationSource[]
  confidenceScore: number
  grounded: boolean
  disclaimer: string
  retrievedEvidence?: RetrievedEvidenceItem[]
  insufficientEvidence?: boolean
  provider?: string
  model?: string
  isDemoData?: boolean
}

export interface CitationTraceability {
  citation: CitationSource
  standardVerified: boolean
  clauseVerified: boolean
  chunkVerified: boolean
  status:
    | 'VERIFIED'
    | 'NONEXISTENT_STANDARD'
    | 'NONEXISTENT_CLAUSE'
    | 'MISMATCHED_STANDARD_CLAUSE'
    | 'FABRICATED'
    | 'NOT_IN_RETRIEVED_EVIDENCE'
  reason?: string
}

export interface CitationValidationResult {
  isValid: boolean
  validCitations: CitationSource[]
  unverifiedReferences: string[]
  reasons: string[]
  traceability?: CitationTraceability[]
}

export interface GroundedGenerationInput {
  userQuery: string
  retrievedEvidence: RetrievedEvidenceItem[]
  conversationHistory?: Array<{ role: 'USER' | 'ASSISTANT'; content: string }>
}

export interface GroundedCitation {
  standardNumber: string
  clauseNumber?: string
  chunkId?: string
  excerpt?: string
}

export interface GroundedGenerationOutput {
  answer: string
  citations: CitationSource[]
  confidence: number
  grounded: boolean
  refusalReason?: string
  provider?: string
  model?: string
}

export interface IGroundedGenerationProvider {
  readonly providerName: string
  generateGroundedResponse(input: GroundedGenerationInput): Promise<GroundedGenerationOutput>
}

