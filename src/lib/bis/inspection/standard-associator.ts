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

// Generic descriptor words that must NOT by themselves create a substantive standard association
const GENERIC_DESCRIPTORS = new Set([
  'household',
  'commercial',
  'industrial',
  'general',
  'standard',
  'standards',
  'purpose',
  'purposes',
  'packaged',
  'commodity',
  'commodities',
  'liquid',
  'solid',
  'concentrated',
  'gel',
  'powder',
  'material',
  'materials',
  'product',
  'products',
  'device',
  'devices',
  'system',
  'systems',
  'other',
  'similar',
  'equipment',
  'item',
  'items',
  'good',
  'goods',
  'pack',
  'package',
  'packaging',
  'specification',
  'specifications',
  'requirement',
  'requirements',
  'quality',
  'control',
  'order',
])

export interface StandardAssociationInput {
  detectedStandardNumber?: string | null
  productName?: string | null
  category?: string | null
  brand?: string | null
  rawOcrText?: string | null
  extractedDeclarations?: Array<{
    fieldName: string
    rawValue: string | null
    normalizedValue: string | null
  }> | null
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
   * Prioritizes substantive commodity relevance over generic lexical overlap.
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

    // 2. Extract substantive commodity terms (filtering out generic descriptor tokens)
    const rawTerms = [input.productName, input.category]
      .filter((t): t is string => Boolean(t && t.trim().length > 2))
      .map((t) => t.trim())

    const inputSubstantiveTokens = rawTerms
      .flatMap((t) => t.toLowerCase().split(/[\s,/._-]+/))
      .filter((w) => w.length >= 3 && !GENERIC_DESCRIPTORS.has(w))

    // If no substantive commodity terms exist (e.g. only "Household" or "Liquid"), do not search catalog blindly
    if (inputSubstantiveTokens.length > 0) {
      // Form substantive search queries (e.g. "toys", "drinking water", "plugs")
      const substantiveQueries = Array.from(new Set(inputSubstantiveTokens))

      for (const term of substantiveQueries) {
        try {
          const searchResult = await this.standardsService.searchStandards({
            q: term,
            pageSize: 5,
          })

          for (const std of searchResult.standards) {
            if (candidates.some((c) => c.standardNumber === std.standardNumber)) {
              continue
            }

            // Extract substantive tokens from standard title & description
            const stdTitleTokens = `${std.title} ${(std as any).description || ''}`
              .toLowerCase()
              .split(/[\s,/._-]+/)
              .filter((w) => w.length >= 3 && !GENERIC_DESCRIPTORS.has(w))

            // Check substantive overlap: at least one core commodity term must match
            const overlap = inputSubstantiveTokens.filter((token) =>
              stdTitleTokens.some((st) => st.includes(token) || token.includes(st))
            )

            // Strictly require substantive overlap — matching only generic words like "household" is rejected
            if (overlap.length > 0) {
              const relevance = Math.min(0.95, Math.max(0.65, overlap.length / Math.min(inputSubstantiveTokens.length, 3)))
              const isDemoRecord = (std as any).isDemoRecord ?? true
              candidates.push({
                standardNumber: std.standardNumber,
                title: std.title,
                relevance: Math.round(relevance * 100) / 100,
                matchReason: `Substantive commodity match: "${overlap.join(', ')}" corresponds to Indian Standard scope`,
                supportingEvidence: `Product commodity concept matches Indian Standard: "${std.title}"`,
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

    // 3. Knowledge retrieval search for high-relevance chunks (only if substantive terms exist)
    if (candidates.length === 0 && inputSubstantiveTokens.length > 0) {
      const searchQuery = inputSubstantiveTokens.join(' ')
      try {
        const chunkResults = await this.knowledgeService.searchKnowledge({
          query: searchQuery,
          limit: 3,
        })

        if (chunkResults.length > 0 && chunkResults[0].relevanceScore >= 0.75) {
          const topChunk = chunkResults[0]
          const chunkTokens = `${topChunk.title} ${topChunk.relevantText}`
            .toLowerCase()
            .split(/[\s,/._-]+/)
            .filter((w) => w.length >= 3 && !GENERIC_DESCRIPTORS.has(w))

          const hasSubstantiveChunkOverlap = inputSubstantiveTokens.some((t) =>
            chunkTokens.some((ct) => ct.includes(t) || t.includes(ct))
          )

          if (hasSubstantiveChunkOverlap) {
            candidates.push({
              standardNumber: topChunk.standardNumber,
              title: topChunk.title || topChunk.standardNumber,
              relevance: Math.round(topChunk.relevanceScore * 100) / 100,
              matchReason: `Knowledge-base substantive match: retrieved evidence for ${topChunk.standardNumber}`,
              supportingEvidence: `Statutory clause ${topChunk.clauseNumber || topChunk.chunkId} matches commodity query "${searchQuery}"`,
              clauseReferences: topChunk.clauseNumber ? [topChunk.clauseNumber] : [],
              chunkReferences: [topChunk.chunkId],
              isDemoRecord: topChunk.isDemoRecord ?? true,
              state: 'ASSOCIATED',
            })
          }
        }
      } catch {
        // Fall through
      }
    }

    // 4. If explicit standard number was claimed on packaging but could NOT be found in catalog
    if (explicitNumber && candidates.length === 0) {
      candidates.push({
        standardNumber: explicitNumber,
        title: 'Uncatalogued Standard Claimed',
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

    // 5. If no candidate could be identified with sufficient confidence: NOT DETERMINED / NEEDS REVIEW
    if (candidates.length === 0) {
      candidates.push({
        standardNumber: 'NOT_DETERMINED',
        title: 'No Applicable Indian Standard Identified',
        relevance: 0.0,
        matchReason: 'Insufficient evidence to associate an Indian Standard',
        supportingEvidence: 'Neither an explicit IS number nor a recognized BIS standard commodity category was detected',
        clauseReferences: [],
        chunkReferences: [],
        isDemoRecord: false,
        state: 'NEEDS_REVIEW',
      })
    }

    return candidates
  }
}

export const defaultStandardAssociator = new StandardAssociator()
