import { defaultBisStandardsService } from '@/lib/bis/standards-service'
import type { CitationSource, CitationValidationResult } from './types'

export class CitationValidator {
  /**
   * Validates an array of citations to verify that the cited standard and clause actually exist.
   */
  async validateCitations(citations: CitationSource[]): Promise<CitationValidationResult> {
    const validCitations: CitationSource[] = []
    const unverifiedReferences: string[] = []
    const reasons: string[] = []

    for (const c of citations) {
      const std = await defaultBisStandardsService.getStandardByNumber(c.standardNumber)
      if (!std) {
        unverifiedReferences.push(c.standardNumber)
        reasons.push(`Standard "${c.standardNumber}" is not indexed in the verified Indian Standards repository.`)
        continue
      }

      // Check if clause exists in the standard if clauseNumber is specified
      if (c.clauseNumber) {
        const clauseMatch = std.clauses.find(
          (cl) =>
            cl.clauseNumber.toLowerCase() === c.clauseNumber?.toLowerCase() ||
            cl.clauseNumber.toLowerCase().includes(c.clauseNumber?.toLowerCase() || '')
        )
        if (!clauseMatch) {
          reasons.push(
            `Clause "${c.clauseNumber}" was not confirmed in ${std.standardNumber}, but standard exists.`
          )
        }
      }

      validCitations.push({
        standardNumber: std.standardNumber,
        standardTitle: std.title,
        clauseNumber: c.clauseNumber ?? undefined,
        clauseTitle: c.clauseTitle ?? undefined,
        excerpt: c.excerpt,
        qcoReference: c.qcoReference ?? std.mandatedByQco ?? undefined,
      })
    }

    return {
      isValid: unverifiedReferences.length === 0,
      validCitations,
      unverifiedReferences,
      reasons,
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
        })
      }
    }

    return citations
  }
}

export const defaultCitationValidator = new CitationValidator()
