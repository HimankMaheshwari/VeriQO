/**
 * PS107 AI Conversational Assistant Type Definitions
 * VeriQO 2.0 - Indian Standards & BIS Regulatory Assistant
 * Unifies Frontend UI Models and Backend DTO Contracts.
 */

export type MessageRole = 'user' | 'assistant' | 'system' | 'USER' | 'ASSISTANT' | 'SYSTEM'

export type MessageStatus = 'sending' | 'streaming' | 'complete' | 'error'

export interface Citation {
  id?: string
  standardNumber: string      // e.g. "IS 14543:2016" or "IS 1061:1997"
  clauseNumber: string        // e.g. "Clause 5.2" or "Section 4.1"
  title: string               // e.g. "Packaged Drinking Water — Specification"
  excerpt: string             // Verbatim excerpt or official text summary
  sourceUrl?: string          // Link to official BIS portal, gazette or standard document
  isMandatoryQco?: boolean    // Whether this standard falls under a mandatory Quality Control Order
}

export interface ChatMessage {
  id: string
  threadId: string
  role: MessageRole
  content: string
  timestamp: string | Date
  language?: string           // 'en', 'hi', 'ta', 'te', 'bn', etc.
  citations?: Citation[]
  status?: MessageStatus
  audioUrl?: string           // Text-to-speech audio playback URL if generated
  metadata?: Record<string, unknown>
}

export interface ConversationThread {
  id: string
  userId: string
  title: string
  createdAt: string | Date
  updatedAt: string | Date
  messageCount?: number
  lastMessageSnippet?: string
}

export interface AssistantStreamChunk {
  threadId: string
  messageId: string
  delta: string
  done: boolean
  citations?: Citation[]
}

export interface SuggestedPrompt {
  id: string
  category: 'standards' | 'schemes' | 'testing' | 'hallmarking' | 'consumer'
  title: string
  prompt: string
  badgeText?: string
}

export interface SupportedLanguage {
  code: string
  name: string
  nativeName: string
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
]

export const STARTER_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'p1',
    category: 'standards',
    title: 'Packaged Drinking Water',
    prompt: 'What Indian Standards and testing requirements apply to packaged drinking water?',
    badgeText: 'IS 14543',
  },
  {
    id: 'p2',
    category: 'schemes',
    title: 'ISI Mark Certification Process',
    prompt: 'Explain the step-by-step procedure to obtain an ISI mark license under Scheme I.',
    badgeText: 'Scheme I',
  },
  {
    id: 'p3',
    category: 'hallmarking',
    title: 'Verify HUID Hallmarking',
    prompt: 'How do I verify a 6-digit HUID number on gold jewellery and what do the hallmark symbols mean?',
    badgeText: 'Gold 916 / 22K',
  },
  {
    id: 'p4',
    category: 'testing',
    title: 'Food Packaging Testing Labs',
    prompt: 'Which BIS-recognized or NABL-accredited laboratories test food grade plastic packaging?',
    badgeText: 'Labs Directory',
  },
  {
    id: 'p5',
    category: 'consumer',
    title: 'Report Misuse of ISI Mark',
    prompt: 'How can a consumer verify ISI mark authenticity and report fraudulent packaging marks under the BIS Act 2016?',
    badgeText: 'Consumer Rights',
  },
]

// ── Extended PS107 Assistant Contracts ──────────────────────────

export type AssistantMode = 'consumer' | 'authority'

export interface StandardContext {
  standardNumber: string      // e.g. "IS 14543:2016"
  title: string               // e.g. "Packaged Drinking Water"
  category?: string           // e.g. "Food & Agriculture"
  qcoNotificationNumber?: string
  isMandatoryQco?: boolean
}

export interface ProductContext {
  productName: string
  productDescription: string
  intendedUseCategory?: string
  category?: string
}

export interface AssistantSource {
  id: string
  documentTitle: string       // e.g. "IS 14543:2016 Packaged Drinking Water Specification"
  standardNumber: string      // e.g. "IS 14543:2016"
  clauseReference: string     // e.g. "Clause 4.1 & Clause 6.1"
  excerpt: string             // Authentic statutory/specification excerpt
  sourceUrl?: string          // External BIS standards link or gazette
  isMandatoryQco: boolean
  relevanceScore?: number     // 0-100 advisory confidence score
}

export interface AssistantEvidence {
  matchedProductDescription?: string
  relevantKeywords: string[]
  sources: AssistantSource[]
  contextConsidered: string
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  advisoryNote?: string
}

export interface AssistantMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  status?: MessageStatus
  evidence?: AssistantEvidence
  standardContext?: StandardContext
  productContext?: ProductContext
  errorMessage?: string
}

export interface AssistantConversation {
  id: string
  title: string
  mode: AssistantMode
  createdAt: string
  messages: AssistantMessage[]
  standardContext?: StandardContext
  productContext?: ProductContext
}

export interface AssistantRequest {
  query: string
  mode: AssistantMode
  conversationId: string
  standardContext?: StandardContext
  productContext?: ProductContext
  language?: string
}

export interface AssistantResponse {
  messageId: string
  content: string
  evidence?: AssistantEvidence
  timestamp: string
}

export interface AssistantService {
  sendMessage(request: AssistantRequest): Promise<AssistantResponse>
  getInitialWelcomeMessage(mode: AssistantMode, standardContext?: StandardContext, language?: string): AssistantMessage
  getSuggestedPrompts(mode: AssistantMode, standardContext?: StandardContext, language?: string): SuggestedPrompt[]
}

// ── Backend DTO Contracts ──────────────────────────────────────

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
