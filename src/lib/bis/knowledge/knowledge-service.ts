/**
 * BIS Knowledge Base Service for SIH 2026 PS107:
 * Standards Ingestion, Chunk Management, and Provider-Agnostic Retrieval.
 */

import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import type {
  IKnowledgeService,
  BisKnowledgeChunkDto,
  KnowledgeSearchFilters,
  KnowledgeSearchResult,
  StandardInputForChunking,
} from './types'
import {
  DeterministicLexicalRetrievalProvider,
  defaultRetrievalProvider,
  type IRetrievalProvider,
} from './retrieval'
import { chunkStandard } from './chunking'
import {
  DEMO_KNOWLEDGE_CHUNKS,
  DEMO_STANDARDS_KNOWLEDGE,
} from './demo-knowledge'

export class BisKnowledgeService implements IKnowledgeService {
  private db: PrismaClient
  private retrievalProvider: IRetrievalProvider
  private inMemoryChunks: Map<string, BisKnowledgeChunkDto> = new Map()

  constructor(client?: PrismaClient, retrievalProvider?: IRetrievalProvider) {
    this.db = client ?? prisma
    this.retrievalProvider = retrievalProvider ?? defaultRetrievalProvider

    // Initialize in-memory cache with demo chunks
    for (const chunk of DEMO_KNOWLEDGE_CHUNKS) {
      this.inMemoryChunks.set(chunk.id, chunk)
    }
  }

  /**
   * Searches the Knowledge Base using provider-agnostic retrieval.
   * Checks database first; falls back cleanly to deterministic demo chunks if DB is offline or empty.
   */
  async searchKnowledge(filters: KnowledgeSearchFilters): Promise<KnowledgeSearchResult[]> {
    let chunksToSearch: BisKnowledgeChunkDto[] = []

    try {
      // Build Prisma query condition
      const where: any = {}
      if (filters.standardNumber) {
        where.standard = {
          standardNumber: {
            contains: filters.standardNumber.trim(),
            mode: 'insensitive',
          },
        }
      }

      const dbChunks = await this.db.bisKnowledgeChunk.findMany({
        where,
        take: 100,
        include: {
          standard: true,
          clause: true,
        },
      })

      if (dbChunks && dbChunks.length > 0) {
        chunksToSearch = dbChunks.map((c) => ({
          id: c.id,
          standardId: c.standardId,
          standardNumber: c.standard.standardNumber,
          standardTitle: c.standard.title,
          clauseId: c.clauseId,
          clauseNumber: c.clause?.clauseNumber ?? (c.metadata as any)?.clauseNumber ?? null,
          clauseTitle: c.clause?.title ?? (c.metadata as any)?.clauseTitle ?? null,
          hierarchyPath: c.clause?.hierarchyPath ?? (c.metadata as any)?.hierarchyPath ?? null,
          chunkText: c.chunkText,
          normalizedText: c.normalizedText,
          chunkIndex: c.chunkIndex,
          tokenCount: c.tokenCount,
          characterCount: c.characterCount,
          sourceReference: c.sourceReference,
          metadata: (c.metadata as Record<string, unknown>) ?? null,
          embeddingStatus: c.embeddingStatus,
          isDemoRecord: !!(c.metadata as any)?.isDemoRecord,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        }))
      }
    } catch {
      // Fall through to in-memory demo chunks
    }

    if (chunksToSearch.length === 0) {
      chunksToSearch = Array.from(this.inMemoryChunks.values())
    }

    return this.retrievalProvider.search(chunksToSearch, filters)
  }

  /**
   * Retrieves a single knowledge chunk by its ID.
   */
  async getChunkById(id: string): Promise<BisKnowledgeChunkDto | null> {
    try {
      const dbChunk = await this.db.bisKnowledgeChunk.findUnique({
        where: { id },
        include: {
          standard: true,
          clause: true,
        },
      })

      if (dbChunk) {
        return {
          id: dbChunk.id,
          standardId: dbChunk.standardId,
          standardNumber: dbChunk.standard.standardNumber,
          standardTitle: dbChunk.standard.title,
          clauseId: dbChunk.clauseId,
          clauseNumber: dbChunk.clause?.clauseNumber ?? null,
          clauseTitle: dbChunk.clause?.title ?? null,
          hierarchyPath: dbChunk.clause?.hierarchyPath ?? null,
          chunkText: dbChunk.chunkText,
          normalizedText: dbChunk.normalizedText,
          chunkIndex: dbChunk.chunkIndex,
          tokenCount: dbChunk.tokenCount,
          characterCount: dbChunk.characterCount,
          sourceReference: dbChunk.sourceReference,
          metadata: (dbChunk.metadata as Record<string, unknown>) ?? null,
          embeddingStatus: dbChunk.embeddingStatus,
          isDemoRecord: !!(dbChunk.metadata as any)?.isDemoRecord,
          createdAt: dbChunk.createdAt.toISOString(),
          updatedAt: dbChunk.updatedAt.toISOString(),
        }
      }
    } catch {
      // Fall through
    }

    return this.inMemoryChunks.get(id) ?? null
  }

  /**
   * Retrieves all chunks belonging to a specific standard number.
   */
  async getChunksByStandard(standardNumber: string): Promise<BisKnowledgeChunkDto[]> {
    const cleanStd = standardNumber.trim().toUpperCase()

    try {
      const dbChunks = await this.db.bisKnowledgeChunk.findMany({
        where: {
          standard: {
            standardNumber: { contains: cleanStd, mode: 'insensitive' },
          },
        },
        orderBy: { chunkIndex: 'asc' },
        include: {
          standard: true,
          clause: true,
        },
      })

      if (dbChunks && dbChunks.length > 0) {
        return dbChunks.map((c) => ({
          id: c.id,
          standardId: c.standardId,
          standardNumber: c.standard.standardNumber,
          standardTitle: c.standard.title,
          clauseId: c.clauseId,
          clauseNumber: c.clause?.clauseNumber ?? null,
          clauseTitle: c.clause?.title ?? null,
          hierarchyPath: c.clause?.hierarchyPath ?? null,
          chunkText: c.chunkText,
          normalizedText: c.normalizedText,
          chunkIndex: c.chunkIndex,
          tokenCount: c.tokenCount,
          characterCount: c.characterCount,
          sourceReference: c.sourceReference,
          metadata: (c.metadata as Record<string, unknown>) ?? null,
          embeddingStatus: c.embeddingStatus,
          isDemoRecord: !!(c.metadata as any)?.isDemoRecord,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        }))
      }
    } catch {
      // Fall through
    }

    return Array.from(this.inMemoryChunks.values()).filter(
      (c) =>
        c.standardNumber.toUpperCase().includes(cleanStd) ||
        cleanStd.includes(c.standardNumber.toUpperCase())
    )
  }

  /**
   * Ingests a standard and its clauses, generating deterministic chunks.
   * Persists to database if available; always updates in-memory registry.
   */
  async ingestStandard(
    standard: StandardInputForChunking
  ): Promise<{ chunksCreated: number; sourceId?: string }> {
    const chunks = chunkStandard(standard)

    // Update in-memory registry
    for (const chunk of chunks) {
      this.inMemoryChunks.set(chunk.id, chunk)
    }

    try {
      // 1. Create or update source
      const source = await this.db.bisKnowledgeSource.create({
        data: {
          sourceName: `[DEMO TEST RECORD] ${standard.standardNumber} Ingestion Batch`,
          sourceType: standard.sourceType || 'BIS_STANDARD_DOCUMENT',
          sourceUrl: standard.sourceUrl ?? null,
          version: standard.edition ?? '1.0',
          ingestionStatus: 'COMPLETED',
          metadata: {
            standardNumber: standard.standardNumber,
            isDemoRecord: standard.isDemoRecord ?? true,
          },
        },
      })

      // 2. Persist chunks
      for (const chk of chunks) {
        await this.db.bisKnowledgeChunk.upsert({
          where: { id: chk.id },
          create: {
            id: chk.id,
            standardId: standard.id,
            clauseId: chk.clauseId,
            chunkText: chk.chunkText,
            normalizedText: chk.normalizedText,
            chunkIndex: chk.chunkIndex,
            tokenCount: chk.tokenCount,
            characterCount: chk.characterCount,
            sourceReference: chk.sourceReference,
            metadata: chk.metadata as any,
            embeddingStatus: 'NOT_REQUIRED',
          },
          update: {
            chunkText: chk.chunkText,
            normalizedText: chk.normalizedText,
            chunkIndex: chk.chunkIndex,
            tokenCount: chk.tokenCount,
            characterCount: chk.characterCount,
            sourceReference: chk.sourceReference,
            metadata: chk.metadata as any,
          },
        })
      }

      return { chunksCreated: chunks.length, sourceId: source.id }
    } catch {
      // Return in-memory ingestion result
      return { chunksCreated: chunks.length, sourceId: `src-mem-${Date.now()}` }
    }
  }
}

export const defaultBisKnowledgeService = new BisKnowledgeService()
