/**
 * Service interfaces and domain types for BIS Intelligent Assistant module.
 */

export * from '@/types/assistant'

import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantConversationDto,
  CitationSource,
  CitationValidationResult,
} from '@/types/assistant'

export interface IAssistantService {
  handleQuery(request: AssistantChatRequest, userId?: string | null): Promise<AssistantChatResponse>
  getConversation(id: string): Promise<AssistantConversationDto | null>
  listUserConversations(userId?: string | null): Promise<Array<{ id: string; title: string; createdAt: string; updatedAt: string }>>
}

export interface ICitationValidator {
  validateCitations(citations: CitationSource[]): Promise<CitationValidationResult>
  extractKnownStandardCitations(text: string): Promise<CitationSource[]>
}
