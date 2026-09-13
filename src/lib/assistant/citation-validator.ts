import { defaultBisStandardsService } from '@/lib/bis/standards-service'
import { defaultBisKnowledgeService } from '@/lib/bis/knowledge/knowledge-service'
import type {
  CitationSource,
  CitationValidationResult,
  CitationTraceability,
  RetrievedEvidenceItem,
} from './types'

function normalizeStdCode(val: string): string {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export class CitationValidator {
  /**
   * Validates an array of citations to verify that:
   * 1. Standard exists in verified repository
   * 2. Clause exists in the standard (if specified)
   * 3. Chunk exists in knowledge base (if specified)
   * 4. Chunk belongs to the cited standard
   * 5. Cited standard/chunk was ACTUALLY retrieved for this query (Gate 5)
   *
   * Rejects nonexistent, mismatched, fabricated, or unretrieved citations.
   */
  async validateCitations(
    citations: CitationSource[],
    retrievedEvidence?: RetrievedEvidenceItem[]
  ): Promise<CitationValidationResult> {
    const validCitations: CitationSource[] = []
    const unverifiedReferences: string[] = []
    const reasons: string[] = []
    const traceability: CitationTraceability[] = []

    for (const c of citations) {
      // 1. Verify Standard Existence
      const std = await defaultBisStandardsService.getStandardByNumber(c.standardNumber)
      if (!std) {
        unverifiedReferences.push(c.standardNumber)
        const reason = `Standard "${c.standardNumber}" is not indexed in the verified Indian Standards repository.`
        reasons.push(reason)
        traceability.push({
          citation: c,
          standardVerified: false,
          clauseVerified: false,
          chunkVerified: false,
          status: 'NONEXISTENT_STANDARD',
          reason,
        })
        continue
      }

      // 2. Verify Clause Existence if specified
      let clauseMatch: any = null
      if (c.clauseNumber) {
        clauseMatch = std.clauses?.find(
          (cl) =>
            cl.clauseNumber.toLowerCase() === c.clauseNumber?.toLowerCase() ||
            cl.clauseNumber.toLowerCase().includes(c.clauseNumber?.toLowerCase() || '')
        )

        if (!clauseMatch) {
          const unverifiedRef = `${std.standardNumber} Clause ${c.clauseNumber}`
          unverifiedReferences.push(unverifiedRef)
          const reason = `Clause "${c.clauseNumber}" does not exist in ${std.standardNumber}.`
          reasons.push(reason)
          traceability.push({
            citation: c,
            standardVerified: true,
            clauseVerified: false,
            chunkVerified: false,
            status: 'NONEXISTENT_CLAUSE',
            reason,
          })
          continue
        }
      }

      // 3. Verify Knowledge Chunk if chunkId is provided
      let chunkVerified = false
      if (c.chunkId) {
        const chunk = await defaultBisKnowledgeService.getChunkById(c.chunkId)
        if (!chunk) {
          unverifiedReferences.push(c.chunkId)
          const reason = `Knowledge chunk "${c.chunkId}" does not exist in the knowledge base.`
          reasons.push(reason)
          traceability.push({
            citation: c,
            standardVerified: true,
            clauseVerified: !!clauseMatch,
            chunkVerified: false,
            status: 'FABRICATED',
            reason,
          })
          continue
        }

        // Verify standard match on chunk
        const chunkStd = chunk.standardNumber.toUpperCase()
        const citedStd = std.standardNumber.toUpperCase()
        if (!chunkStd.includes(citedStd) && !citedStd.includes(chunkStd)) {
          unverifiedReferences.push(c.chunkId)
          const reason = `Knowledge chunk "${c.chunkId}" belongs to ${chunk.standardNumber}, not ${std.standardNumber}.`
          reasons.push(reason)
          traceability.push({
            citation: c,
            standardVerified: true,
            clauseVerified: false,
            chunkVerified: false,
            status: 'MISMATCHED_STANDARD_CLAUSE',
            reason,
          })
          continue
        }
        chunkVerified = true
      }

      // 5th Gate: Verify that citation belongs to the retrieved evidence for THIS query
      let matchingEvidenceItem: RetrievedEvidenceItem | undefined
      if (retrievedEvidence !== undefined) {
        const citedStdNorm = normalizeStdCode(c.standardNumber)
        matchingEvidenceItem = retrievedEvidence.find((e) => {
          const evNorm = normalizeStdCode(e.standardNumber)
          return evNorm.includes(citedStdNorm) || citedStdNorm.includes(evNorm)
        })

        if (!matchingEvidenceItem) {
          unverifiedReferences.push(c.standardNumber)
          const reason = `Standard "${c.standardNumber}" exists in the catalog but was NOT retrieved as evidence for this query.`
          reasons.push(reason)
          traceability.push({
            citation: c,
            standardVerified: true,
            clauseVerified: !!clauseMatch,
            chunkVerified,
            status: 'NOT_IN_RETRIEVED_EVIDENCE',
            reason,
          })
          continue
        }

        // If chunkId was explicitly cited, ensure that exact chunk was in the retrieved evidence
        if (c.chunkId && !retrievedEvidence.some((e) => e.chunkId === c.chunkId)) {
          unverifiedReferences.push(c.chunkId)
          const reason = `Knowledge chunk "${c.chunkId}" belongs to ${std.standardNumber} but was NOT part of the retrieved evidence for this query.`
          reasons.push(reason)
          traceability.push({
            citation: c,
            standardVerified: true,
            clauseVerified: !!clauseMatch,
            chunkVerified: true,
            status: 'NOT_IN_RETRIEVED_EVIDENCE',
            reason,
          })
          continue
        }
      }

      // 4. Citation is fully verified
      const sourceRef =
        c.sourceReference ||
        matchingEvidenceItem?.sourceReference ||
        (clauseMatch
          ? `${std.standardNumber}, Clause ${clauseMatch.clauseNumber}`
          : std.standardNumber)

      const verifiedCitation: CitationSource = {
        standardNumber: std.standardNumber,
        standardTitle: std.title,
        clauseNumber: clauseMatch?.clauseNumber ?? c.clauseNumber ?? undefined,
        clauseTitle: clauseMatch?.title ?? c.clauseTitle ?? undefined,
        excerpt: c.excerpt || clauseMatch?.content || std.description || std.title,
        qcoReference: c.qcoReference ?? std.mandatedByQco ?? undefined,
        chunkId: c.chunkId || matchingEvidenceItem?.chunkId,
        sourceReference: sourceRef,
        relevanceScore:
          typeof c.relevanceScore === 'number'
            ? c.relevanceScore
            : (matchingEvidenceItem?.score ?? 0.95),
      }

      validCitations.push(verifiedCitation)
      traceability.push({
        citation: verifiedCitation,
        standardVerified: true,
        clauseVerified: !!clauseMatch || !c.clauseNumber,
        chunkVerified,
        status: 'VERIFIED',
      })
    }

    return {
      isValid: unverifiedReferences.length === 0,
      validCitations,
      unverifiedReferences,
      reasons,
      traceability,
    }
  }

  /**
   * Scans text for mentions of Indian Standards (e.g. "IS 10500", "IS 1293:2019")
   * and maps them to known repository citations.
   */
  async extractKnownStandardCitations(text: string): Promise<CitationSource[]> {
    const isMatches = text.match(/\bIS\s*\d+(?:\s*\([^)]+\))?(?::\d{4})?\b/gi) || []
    const uniqueRefs = Array.from(new Set(isMatches.map((m) => m.toUpperCase().trim())))
    const citations: CitationSource[] = []

    for (const ref of uniqueRefs) {
      const std = await defaultBisStandardsService.getStandardByNumber(ref)
      if (std) {
        citations.push({
          standardNumber: std.standardNumber,
          standardTitle: std.title,
          excerpt: std.description || std.title,
          qcoReference: std.mandatedByQco ?? undefined,
          sourceReference: std.standardNumber,
        })
      }
    }

    return citations
  }
}

export const defaultCitationValidator = new CitationValidator()

