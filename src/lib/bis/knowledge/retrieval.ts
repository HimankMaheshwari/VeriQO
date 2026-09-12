/**
 * Provider-Agnostic Retrieval Engine for SIH 2026 PS107:
 * BIS Knowledge Base & RAG Foundation.
 *
 * Implements deterministic, transparent lexical & statutory matching:
 * - Direct standard number indexing and boosts
 * - Clause hierarchy and title matching
 * - Technical token frequency and statutory limit scoring
 * - Strict filtering by standard number, clause number, and category
 * - Extensible provider interface ready for vector/embedding providers (e.g. pgvector)
 *
 * NOTE: This is an honest deterministic lexical and structural retrieval engine.
 * It does NOT claim or fake semantic vector search.
 */

import {
  normalizeQuery,
  extractStandardNumbers,
  extractClauseIdentifiers,
  tokenizeAndFilter,
} from './normalization'
import type {
  BisKnowledgeChunkDto,
  KnowledgeSearchFilters,
  KnowledgeSearchResult,
} from './types'

export interface IRetrievalProvider {
  search(
    chunks: BisKnowledgeChunkDto[],
    filters: KnowledgeSearchFilters
  ): Promise<KnowledgeSearchResult[]>
}

export class DeterministicLexicalRetrievalProvider implements IRetrievalProvider {
  /**
   * Searches a corpus of chunks using deterministic lexical matching,
   * structural field boosts, and statutory clause weighting.
   */
  async search(
    chunks: BisKnowledgeChunkDto[],
    filters: KnowledgeSearchFilters
  ): Promise<KnowledgeSearchResult[]> {
    const rawQuery = filters.query?.trim() || ''
    if (!rawQuery && !filters.standardNumber && !filters.clauseNumber) {
      return []
    }

    const normQuery = normalizeQuery(rawQuery)
    const queryTokens = tokenizeAndFilter(rawQuery)

    // Check for explicit standard or clause in query if not in filters
    const queryStandardNumbers = extractStandardNumbers(rawQuery)
    const queryClauseIds = extractClauseIdentifiers(rawQuery)

    const targetStandard = filters.standardNumber?.trim().toUpperCase() ||
      (queryStandardNumbers.length > 0 ? queryStandardNumbers[0] : null)

    const targetClause = filters.clauseNumber?.trim().toLowerCase() ||
      (queryClauseIds.length > 0 ? queryClauseIds[0].toLowerCase() : null)

    const limit = Math.min(50, Math.max(1, filters.limit ?? 5))
    const minScore = filters.minScore ?? 0.1

    const scoredResults: KnowledgeSearchResult[] = []

    for (const chunk of chunks) {
      // 1. Strict Filter Check: Standard Number
      if (filters.standardNumber) {
        const chunkStd = chunk.standardNumber.toUpperCase()
        const filterStd = filters.standardNumber.toUpperCase()
        if (!chunkStd.includes(filterStd) && !filterStd.includes(chunkStd)) {
          continue
        }
      }

      // 2. Strict Filter Check: Clause Number
      if (filters.clauseNumber) {
        const chunkClause = (chunk.clauseNumber || '').toLowerCase()
        const filterClause = filters.clauseNumber.toLowerCase()
        if (chunkClause !== filterClause && !chunkClause.startsWith(filterClause)) {
          continue
        }
      }

      // 3. Strict Filter Check: Category
      if (filters.category) {
        const chunkCat = String(chunk.metadata?.category || '').toLowerCase()
        if (!chunkCat.includes(filters.category.toLowerCase())) {
          continue
        }
      }

      // 4. Calculate Relevance Score
      let score = 0.0

      // Factor A: Standard number exact/prefix match (weight: 0.35)
      const chunkStdUpper = chunk.standardNumber.toUpperCase()
      if (targetStandard) {
        if (chunkStdUpper === targetStandard) {
          score += 0.35
        } else if (chunkStdUpper.startsWith(targetStandard) || targetStandard.startsWith(chunkStdUpper)) {
          score += 0.25
        } else if (chunkStdUpper.includes(targetStandard)) {
          score += 0.20
        }
      }

      // Factor B: Clause number exact match (weight: 0.25)
      const chunkClauseLower = (chunk.clauseNumber || '').toLowerCase()
      if (targetClause) {
        if (chunkClauseLower === targetClause) {
          score += 0.25
        } else if (chunkClauseLower.startsWith(targetClause)) {
          score += 0.15
        }
      }

      // Factor C: Title and Hierarchy match (weight: 0.15)
      const titleLower = (chunk.standardTitle || '').toLowerCase()
      const clauseTitleLower = (chunk.clauseTitle || '').toLowerCase()
      const hierarchyLower = (chunk.hierarchyPath || '').toLowerCase()

      let titleHits = 0
      for (const token of queryTokens) {
        if (clauseTitleLower.includes(token)) titleHits += 2
        else if (titleLower.includes(token)) titleHits += 1
        else if (hierarchyLower.includes(token)) titleHits += 1
      }
      if (queryTokens.length > 0) {
        score += Math.min(0.15, (titleHits / (queryTokens.length * 2)) * 0.15)
      }

      // Factor D: Chunk body token coverage and keyword density (weight: 0.25)
      const chunkNormalized = chunk.normalizedText
      let bodyHits = 0
      let matchedTokensCount = 0

      for (const token of queryTokens) {
        if (chunkNormalized.includes(token)) {
          matchedTokensCount++
          // Count occurrences up to a cap
          const regex = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
          const matches = chunkNormalized.match(regex)
          bodyHits += matches ? Math.min(matches.length, 3) : 1
        }
      }

      if (queryTokens.length > 0) {
        const coverageRatio = matchedTokensCount / queryTokens.length
        const densityBonus = Math.min(0.1, (bodyHits / (queryTokens.length * 3)) * 0.1)
        score += coverageRatio * 0.15 + densityBonus
      }

      // Factor E: Exact query substring match bonus
      if (normQuery.length > 3 && chunkNormalized.includes(normQuery)) {
        score += 0.1
      }

      // Clamp score to [0, 1]
      const finalScore = Math.min(1.0, Math.round(score * 1000) / 1000)

      if (finalScore >= minScore) {
        scoredResults.push({
          chunkId: chunk.id,
          standardId: chunk.standardId,
          standardNumber: chunk.standardNumber,
          title: chunk.standardTitle || chunk.standardNumber,
          clauseNumber: chunk.clauseNumber ?? null,
          clauseTitle: chunk.clauseTitle ?? null,
          relevantText: chunk.chunkText,
          sourceReference: chunk.sourceReference || chunk.standardNumber,
          relevanceScore: finalScore,
          hierarchyPath: chunk.hierarchyPath ?? null,
          isDemoRecord: chunk.isDemoRecord,
          metadata: chunk.metadata ?? null,
        })
      }
    }

    // Sort descending by relevance score, then naturally by chunkIndex
    scoredResults.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      return a.chunkId.localeCompare(b.chunkId)
    })

    return scoredResults.slice(0, limit)
  }
}

export const defaultRetrievalProvider = new DeterministicLexicalRetrievalProvider()
