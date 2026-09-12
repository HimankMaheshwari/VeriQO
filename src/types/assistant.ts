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

export interface AssistantChatResponse {
  conversationId: string
  messageId: string
  reply: string
  citations: CitationSource[]
  confidenceScore: number
  grounded: boolean
  disclaimer: string
}

export interface CitationValidationResult {
  isValid: boolean
  validCitations: CitationSource[]
  unverifiedReferences: string[]
  reasons: string[]
}
