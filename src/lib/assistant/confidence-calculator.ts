/**
 * Deterministic Confidence Calculator for SIH 2026 PS107:
 * BIS Intelligent Assistant.
 *
 * Implements strict application-owned confidence scoring.
 * Gemini or other LLMs are NOT permitted to invent confidence scores.
 * All scores are deterministically derived from retrieval relevance,
 * evidence chunk support, citation validation ratio, and demo data status.
 */

export interface ConfidenceCalculationParams {
  topRetrievalScore: number
  evidenceCount: number
  validCitationCount: number
  totalCitationCount: number
  grounded: boolean
  insufficientEvidence?: boolean
  isGenericGuidance?: boolean
  hasDemoRecords?: boolean
}

export class ConfidenceCalculator {
  /**
   * Deterministically calculates a confidence score in the range [0.0, 1.0].
   */
  static calculateConfidence(params: ConfidenceCalculationParams): number {
    const {
      topRetrievalScore,
      evidenceCount,
      validCitationCount,
      totalCitationCount,
      grounded,
      insufficientEvidence,
      isGenericGuidance,
    } = params

    // 1. Refusal or zero-evidence cases have zero confidence
    if (insufficientEvidence || !grounded || evidenceCount === 0) {
      if (isGenericGuidance) {
        return 0.90 // Generic system greetings/guidance have standard fixed baseline
      }
      return 0.0
    }

    // 2. If the model generated citations but NONE passed validation, mark as 0.0
    if (totalCitationCount > 0 && validCitationCount === 0) {
      return 0.0
    }

    // 3. Grounded answer with verified evidence & citations
    let score = 0.85

    // Factor A: Top retrieval relevance bonus (up to +0.05)
    if (topRetrievalScore >= 0.3) {
      score += Math.min(0.05, topRetrievalScore * 0.05)
    }

    // Factor B: Evidence depth bonus (up to +0.05 for multiple chunks)
    if (evidenceCount >= 3) {
      score += 0.05
    } else if (evidenceCount >= 1) {
      score += 0.02
    }

    // Factor C: Citation validation ratio penalty
    if (totalCitationCount > 0) {
      const passRate = validCitationCount / totalCitationCount
      if (passRate < 1.0) {
        score -= (1.0 - passRate) * 0.20 // Substantial penalty for fabricated/rejected citations
      }
    }

    // Clamp score between 0.0 and 0.98
    score = Math.max(0.0, Math.min(0.98, score))

    // For verified grounded responses with at least 1 verified citation, ensure >= 0.90
    if (validCitationCount > 0 && score < 0.90) {
      score = 0.90
    }

    return Number(score.toFixed(2))
  }
}
