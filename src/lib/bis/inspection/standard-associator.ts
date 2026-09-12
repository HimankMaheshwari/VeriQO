/**
 * StandardAssociator — Deterministic association of packaged product data with
 * Indian Standards in the structured BIS catalog and knowledge base.
 *
 * RULES:
 * 1. Consumes existing BisStandardsService and BisKnowledgeService.
 * 2. Does NOT invent standards.
 * 3. Prioritizes explicit IS numbers extracted from packaging OCR.
 * 4. Falls back to product name and category semantic matching.
 * 5. Returns UNKNOWN / NEEDS_REVIEW if evidence is insufficient.
 * 6. Propagates isDemoRecord provenance from the catalog entity.
 */

import { BisStandardsService } from '@/lib/bis/standards-service'
import { BisKnowledgeService, defaultBisKnowledgeService } from '@/lib/bis/knowledge/knowledge-service'
import type { CandidateStandardAssociation } from '@/types/bis-inspection'

export interface StandardAssociationInput {
  detectedStandardNumber?: string | null
  productName?: string | null
  category?: string | null
  brand?: string | null
  rawOcrText?: string | null
}

export class StandardAssociator {
  private standardsService: BisStandardsService
  private knowledgeService: BisKnowledgeService

  constructor(
    standardsService?: BisStandardsService,
    knowledgeService?: BisKnowledgeService
  ) {
    this.standardsService = standardsService ?? new BisStandardsService()
    this.knowledgeService = knowledgeService ?? defaultBisKnowledgeService
  }

  /**
   * Associates a product inspection with candidate Indian Standards based on evidence.
   */
  async associateStandards(input: StandardAssociationInput): Promise<CandidateStandardAssociation[]> {
    const candidates: CandidateStandardAssociation[] = []
    const explicitNumber = input.detectedStandardNumber?.trim()

    // 1. Direct match by explicit IS Number detected from OCR
    if (explicitNumber) {
      try {
        const std = await this.standardsService.getStandardByNumber(explicitNumber)
        if (std) {
          const isDemoRecord = (std as any).isDemoRecord ?? true
          candidates.push({
            standardNumber: std.standardNumber,
            title: std.title,
            relevance: 1.0,
            matchReason: `Direct match: standard number "${explicitNumber}" was detected on the packaging surface`,
            supportingEvidence: `Packaging states conformance to ${std.standardNumber} (${std.title})`,
            clauseReferences: (std.clauses || []).map((c) => c.clauseNumber),
            chunkReferences: [],
            isDemoRecord,
            state: 'ASSOCIATED',
          })
          return candidates
        }
      } catch {
        // Fall through to search/knowledge retrieval if exact number not found
      }
    }

    // 2. Category & Product Name search across structured BIS catalog
    const rawTerms = [input.productName, input.category, input.brand]
      .filter((t): t is string => Boolean(t && t.trim().length > 2))
      .map((t) => t.trim())

    const subTokens = rawTerms
      .flatMap((t) => t.split(/[\s,/]+/).filter((w) => w.length >= 4))
    const queryTerms = Array.from(new Set([...rawTerms, ...subTokens]))

    if (queryTerms.length > 0) {
      for (const term of queryTerms) {
        try {
          const searchResult = await this.standardsService.searchStandards({
            q: term,
            pageSize: 3,
          })

          for (const std of searchResult.standards) {
            // Check if already in candidates
            if (!candidates.some((c) => c.standardNumber === std.standardNumber)) {
              const isDemoRecord = (std as any).isDemoRecord ?? true
              candidates.push({
                standardNumber: std.standardNumber,
                title: std.title,
                relevance: 0.8,
                matchReason: `Catalog match: product descriptor "${term}" matches standard scope`,
                supportingEvidence: `Identified product description matches Indian Standard title: "${std.title}"`,
                clauseReferences: [],
                chunkReferences: [],
                isDemoRecord,
                state: 'ASSOCIATED',
              })
            }
          }
        } catch {
          // Continue to next term
        }
      }
    }

    // 3. Knowledge retrieval search for high-relevance chunks
    if (candidates.length === 0 && (input.productName || input.category || explicitNumber)) {
      const searchQuery = explicitNumber || `${input.productName || ''} ${input.category || ''}`.trim()
      try {
        const chunkResults = await this.knowledgeService.searchKnowledge({
          query: searchQuery,
          limit: 3,
        })

        if (chunkResults.length > 0 && chunkResults[0].relevanceScore >= 0.7) {
          const topChunk = chunkResults[0]
          candidates.push({
            standardNumber: topChunk.standardNumber,
            title: topChunk.title || topChunk.standardNumber,
            relevance: Math.round(topChunk.relevanceScore * 100) / 100,
            matchReason: `Knowledge-base semantic match: retrieved evidence for ${topChunk.standardNumber}`,
            supportingEvidence: `Statutory chunk ${topChunk.clauseNumber || topChunk.chunkId} matches query "${searchQuery}"`,
            clauseReferences: topChunk.clauseNumber ? [topChunk.clauseNumber] : [],
            chunkReferences: [topChunk.chunkId],
            isDemoRecord: topChunk.isDemoRecord ?? true,
            state: 'ASSOCIATED',
          })
        }
      } catch {
        // Fall through
      }
    }

    // 4. If explicit standard number was claimed on packaging but could NOT be found in catalog
    if (explicitNumber && candidates.length === 0) {
      candidates.push({
        standardNumber: explicitNumber,
        title: 'Unknown Standard Reference',
        relevance: 0.3,
        matchReason: `Packaging claims "${explicitNumber}", but standard was not found in the verified BIS catalog`,
        supportingEvidence: `Detected text claims ${explicitNumber}, requiring officer verification`,
        clauseReferences: [],
        chunkReferences: [],
        isDemoRecord: false,
        state: 'NEEDS_REVIEW',
      })
      return candidates
    }

    // 5. If no candidate could be identified
    if (candidates.length === 0) {
      candidates.push({
        standardNumber: 'UNKNOWN',
        title: 'No Indian Standard Associated',
        relevance: 0.0,
        matchReason: 'Insufficient packaging evidence to associate an Indian Standard',
        supportingEvidence: 'Neither an explicit IS number nor a recognized BIS standard commodity category was detected',
        clauseReferences: [],
        chunkReferences: [],
        isDemoRecord: false,
        state: 'UNKNOWN',
      })
    }

    return candidates
  }
}

export const defaultStandardAssociator = new StandardAssociator()
