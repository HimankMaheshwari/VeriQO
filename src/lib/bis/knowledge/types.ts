/**
 * Type definitions and interfaces for SIH 2026 PS107:
 * BIS Knowledge Base & Provider-Agnostic Retrieval Foundation.
 */

export interface BisKnowledgeSourceDto {
  id: string
  standardId?: string | null
  sourceName: string // e.g. "Official Gazette of India", "Bureau of Indian Standards"
  sourceType: 'GAZETTE' | 'BIS_STANDARD_DOCUMENT' | 'QCO_NOTIFICATION' | 'AMENDMENT' | string
  sourceUrl?: string | null
  version?: string | null
  checksum?: string | null
  ingestionStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string
  metadata?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface BisKnowledgeChunkDto {
  id: string
  standardId: string
  standardNumber: string
  standardTitle?: string
  clauseId?: string | null
  clauseNumber?: string | null
  clauseTitle?: string | null
  hierarchyPath?: string | null
  chunkText: string
  normalizedText: string
  chunkIndex: number
  tokenCount?: number | null
  characterCount?: number | null
  sourceReference?: string | null
  metadata?: Record<string, unknown> | null
  embeddingStatus: 'PENDING' | 'GENERATED' | 'NOT_REQUIRED' | string
  isDemoRecord: boolean
  createdAt: string
  updatedAt: string
}

export interface KnowledgeSearchFilters {
  query: string
  standardNumber?: string
  clauseNumber?: string
  category?: string
  limit?: number
  minScore?: number
}

export interface KnowledgeSearchResult {
  chunkId: string
  standardId: string
  standardNumber: string
  title: string
  clauseNumber?: string | null
  clauseTitle?: string | null
  relevantText: string
  sourceReference: string
  relevanceScore: number
  hierarchyPath?: string | null
  isDemoRecord: boolean
  metadata?: Record<string, unknown> | null
}

export interface ChunkingOptions {
  maxChunkCharacters?: number
  minChunkCharacters?: number
  preserveHierarchy?: boolean
  overlapCharacters?: number
}

export interface ClauseInputForChunking {
  id?: string
  clauseNumber: string
  title?: string | null
  content: string
  parentClauseNumber?: string | null
  hierarchyPath?: string | null
  pageNumber?: number | null
  sourceRef?: string | null
  limits?: unknown
  isMandatory?: boolean
}

export interface StandardInputForChunking {
  id: string
  standardNumber: string
  title: string
  description?: string | null
  scope?: string | null
  division?: string | null
  category?: string | null
  edition?: string | null
  year?: number | null
  sourceUrl?: string | null
  sourceType?: string | null
  clauses: ClauseInputForChunking[]
  isDemoRecord?: boolean
}

export interface IKnowledgeService {
  searchKnowledge(filters: KnowledgeSearchFilters): Promise<KnowledgeSearchResult[]>
  getChunkById(id: string): Promise<BisKnowledgeChunkDto | null>
  getChunksByStandard(standardNumber: string): Promise<BisKnowledgeChunkDto[]>
  ingestStandard(standard: StandardInputForChunking): Promise<{ chunksCreated: number; sourceId?: string }>
}
