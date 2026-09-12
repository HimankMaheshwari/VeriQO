/**
 * IdentifierDetector — High-precision detection & normalization of BIS statutory identifiers
 * from existing OCR text and extracted declarations.
 *
 * CRITICAL ARCHITECTURAL SAFEGUARDS:
 * 1. Reuses existing OCR output; does not run or duplicate OCR pipelines.
 * 2. Clearly distinguishes DETECTED, NOT_DETECTED, and UNCERTAIN states.
 * 3. DETECTION IS NOT VERIFICATION. Finding a CML string on packaging does NOT mean
 *    the license is operative or valid. Verification must proceed through BisLicenseService.
 * 4. Provenance propagation: isDemoRecord is inherited from the underlying scan/evidence
 *    context, not blindly hardcoded.
 */

import type {
  BisDetectedIdentifier,
  BisIdentifierType,
  DetectionSource,
  DetectionState,
} from '@/types/bis-inspection'

export interface IdentifierDetectionInput {
  rawOcrText?: string | null
  imageOcrTexts?: Array<{ imageId: string; text: string }>
  extractedDeclarations?: Array<{
    fieldName: string
    rawValue: string | null
    normalizedValue: string | null
    confidence?: number | null
    sourceText?: string | null
  }>
  isDemoRecord?: boolean
}

export class IdentifierDetector {
  /**
   * Scans text and structured declarations to detect and normalize all statutory BIS identifiers.
   */
  detectIdentifiers(input: IdentifierDetectionInput): BisDetectedIdentifier[] {
    const rawText = (input.rawOcrText || '').trim()
    const declarationsText = (input.extractedDeclarations || [])
      .map((d) => `${d.fieldName}: ${d.normalizedValue || d.rawValue || ''} ${d.sourceText || ''}`)
      .join('\n')
    const combinedText = `${rawText}\n${declarationsText}`.trim()
    const isDemoRecord = input.isDemoRecord ?? false

    const results: BisDetectedIdentifier[] = []

    // 1. Detect Indian Standard numbers (e.g. IS 10500:2012, IS 1293:2019, IS 9873)
    results.push(this.detectStandardNumber(combinedText, isDemoRecord))

    // 2. Detect ISI / BIS Certification Marks License (CML)
    results.push(this.detectCmlNumber(combinedText, isDemoRecord))

    // 3. Detect Compulsory Registration Scheme (CRS) Registration Number
    results.push(this.detectCrsNumber(combinedText, isDemoRecord))

    // 4. Detect Hallmark Unique Identification (HUID)
    results.push(this.detectHuid(combinedText, isDemoRecord))

    // 5. Detect ISI Mark Claim / Visual Textual Mention
    results.push(this.detectIsiMarkMention(combinedText, isDemoRecord))

    return results
  }

  /**
   * Indian Standard number detection & normalization.
   * Matches patterns like "IS 10500:2012", "IS 1293", "IS:9873 (Part 1):2019", "IS/ISO ...".
   */
  private detectStandardNumber(text: string, isDemoRecord: boolean): BisDetectedIdentifier {
    if (!text) {
      return {
        type: 'INDIAN_STANDARD_NUMBER',
        state: 'NOT_DETECTED',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0,
        evidenceReference: null,
        isDemoRecord,
      }
    }

    // Pattern matching standard notations (including parenthetical parts like (Part 1))
    const pattern = /\b(IS(?:\/ISO)?\s*[:/]?\s*(\d{3,5}(?:\s*\([^)]+\))?(?:\s*:\s*\d{4})?))(?:\b|(?<=\)))/i
    const match = text.match(pattern)

    if (match) {
      const detected = match[1].trim()
      // Normalize spacing and formatting: "IS : 10500:2012" -> "IS 10500:2012"
      const normalized = detected
        .toUpperCase()
        .replace(/\s*:\s*/g, ':')
        .replace(/^IS\s*[:/]?\s*/i, 'IS ')

      return {
        type: 'INDIAN_STANDARD_NUMBER',
        state: 'DETECTED',
        detectedValue: detected,
        normalizedValue: normalized,
        source: 'OCR_TEXT',
        confidence: 0.95,
        evidenceReference: this.extractSnippet(text, match.index ?? 0, detected.length),
        isDemoRecord,
      }
    }

    // Check for ambiguous or partial standard references e.g. "conforms to IS standard" without numbers
    if (/\b(?:conforms\s+to\s+IS\b|Indian\s+Standards?\b|as\s+per\s+IS\b|as\s+per\s+Indian\s+Standards?\b|IS\s+Standards?\b)/i.test(text)) {
      return {
        type: 'INDIAN_STANDARD_NUMBER',
        state: 'UNCERTAIN',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0.4,
        evidenceReference: 'Text references Indian Standard compliance without identifiable numeric standard code',
        isDemoRecord,
      }
    }

    return {
      type: 'INDIAN_STANDARD_NUMBER',
      state: 'NOT_DETECTED',
      detectedValue: null,
      normalizedValue: null,
      source: 'OCR_TEXT',
      confidence: 0,
      evidenceReference: null,
      isDemoRecord,
    }
  }

  /**
   * CML (Certification Marks License) detection & normalization.
   * Matches "CM/L-8400123", "CML: 8400123", "CM/L 8400123", "Licence No. CM/L-8400123",
   * or a 7-digit license number in proximity to "ISI" or "BIS".
   */
  private detectCmlNumber(text: string, isDemoRecord: boolean): BisDetectedIdentifier {
    if (!text) {
      return {
        type: 'CML_NUMBER',
        state: 'NOT_DETECTED',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0,
        evidenceReference: null,
        isDemoRecord,
      }
    }

    // Pattern 1: Explicit CM/L or CML prefix
    const explicitPattern = /\b(?:CM[\s/]*L[\s:-]*|CML[\s:-]*|LIC(?:ENCE|ENSE)?[\s.]*NO[\s.:-]*CM[\s/]*L[\s:-]*)(\d{7,8})\b/i
    const explicitMatch = text.match(explicitPattern)

    if (explicitMatch) {
      const fullMatch = explicitMatch[0].trim()
      const digits = explicitMatch[1]
      const normalized = `CM/L-${digits}`

      return {
        type: 'CML_NUMBER',
        state: 'DETECTED',
        detectedValue: fullMatch,
        normalizedValue: normalized,
        source: 'OCR_TEXT',
        confidence: 0.95,
        evidenceReference: this.extractSnippet(text, explicitMatch.index ?? 0, fullMatch.length),
        isDemoRecord,
      }
    }

    // Pattern 2: Isolated 7 digits adjacent to "ISI" or "BIS" or "Standard Mark"
    const proximityPattern = /(?:ISI|BIS|STANDARD\s*MARK)[\s\S]{0,35}\b(\d{7})\b|\b(\d{7})\b[\s\S]{0,35}(?:ISI|BIS|STANDARD\s*MARK)/i
    const proxMatch = text.match(proximityPattern)

    if (proxMatch) {
      const digits = proxMatch[1] || proxMatch[2]
      return {
        type: 'CML_NUMBER',
        state: 'DETECTED',
        detectedValue: digits,
        normalizedValue: `CM/L-${digits}`,
        source: 'HEURISTIC',
        confidence: 0.8,
        evidenceReference: this.extractSnippet(text, proxMatch.index ?? 0, proxMatch[0].length),
        isDemoRecord,
      }
    }

    // Pattern 3: Ambiguous CML prefix without 7 valid digits (e.g. "CM/L-123" or "CML-XXXX")
    const brokenCmlPattern = /\b(?:CM[\s/]*L|CML)[\s:-]*([A-Z0-9-]{1,10})\b/i
    const brokenMatch = text.match(brokenCmlPattern)

    if (brokenMatch && !/^\d{7}$/.test(brokenMatch[1])) {
      return {
        type: 'CML_NUMBER',
        state: 'UNCERTAIN',
        detectedValue: brokenMatch[0].trim(),
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0.35,
        evidenceReference: `Potential partial or malformed CML reference: "${brokenMatch[0].trim()}" (expected 7 digits)`,
        isDemoRecord,
      }
    }

    return {
      type: 'CML_NUMBER',
      state: 'NOT_DETECTED',
      detectedValue: null,
      normalizedValue: null,
      source: 'OCR_TEXT',
      confidence: 0,
      evidenceReference: null,
      isDemoRecord,
    }
  }

  /**
   * CRS (Compulsory Registration Scheme) registration number detection.
   * Format: R-XXXXXXXX (8 digits)
   */
  private detectCrsNumber(text: string, isDemoRecord: boolean): BisDetectedIdentifier {
    if (!text) {
      return {
        type: 'CRS_REGISTRATION',
        state: 'NOT_DETECTED',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0,
        evidenceReference: null,
        isDemoRecord,
      }
    }

    const crsPattern = /\b(?:CRS[\s:-]*|REGN[\s.]*NO[\s.:-]*|REGISTRATION[\s.:-]*|IS\/IES[\s\S]{0,20})?(R[\s:-]?\d{8})\b/i
    const match = text.match(crsPattern)

    if (match) {
      const raw = match[1].replace(/[\s:-]/g, '').toUpperCase()
      const normalized = `R-${raw.substring(1)}`

      return {
        type: 'CRS_REGISTRATION',
        state: 'DETECTED',
        detectedValue: match[0].trim(),
        normalizedValue: normalized,
        source: 'OCR_TEXT',
        confidence: 0.95,
        evidenceReference: this.extractSnippet(text, match.index ?? 0, match[0].length),
        isDemoRecord,
      }
    }

    // Uncertain CRS mention
    if (/\b(?:CRS\s*Regn|Compulsory\s*Registration\s*Scheme|CRS\s*Mark)\b/i.test(text)) {
      return {
        type: 'CRS_REGISTRATION',
        state: 'UNCERTAIN',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0.4,
        evidenceReference: 'Text references Compulsory Registration Scheme without 8-digit R- registration number',
        isDemoRecord,
      }
    }

    return {
      type: 'CRS_REGISTRATION',
      state: 'NOT_DETECTED',
      detectedValue: null,
      normalizedValue: null,
      source: 'OCR_TEXT',
      confidence: 0,
      evidenceReference: null,
      isDemoRecord,
    }
  }

  /**
   * HUID (Hallmark Unique Identification) detection.
   * Format: 6-character alphanumeric identifier.
   */
  private detectHuid(text: string, isDemoRecord: boolean): BisDetectedIdentifier {
    if (!text) {
      return {
        type: 'HALLMARK_HUID',
        state: 'NOT_DETECTED',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0,
        evidenceReference: null,
        isDemoRecord,
      }
    }

    const huidPattern = /\b(?:HUID[\s.:-]*|HALLMARK[\s.:-]*|HALLMARKING[\s.:-]*)([A-Z0-9]{6})\b/i
    const match = text.match(huidPattern)

    if (match) {
      const code = match[1].toUpperCase()
      return {
        type: 'HALLMARK_HUID',
        state: 'DETECTED',
        detectedValue: match[0].trim(),
        normalizedValue: code,
        source: 'OCR_TEXT',
        confidence: 0.9,
        evidenceReference: this.extractSnippet(text, match.index ?? 0, match[0].length),
        isDemoRecord,
      }
    }

    if (/\b(?:BIS\s*Hallmark|Hallmarked\s*Jewellery|HUID)\b/i.test(text)) {
      return {
        type: 'HALLMARK_HUID',
        state: 'UNCERTAIN',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0.4,
        evidenceReference: 'Hallmark claimed without legible 6-character HUID identifier code',
        isDemoRecord,
      }
    }

    return {
      type: 'HALLMARK_HUID',
      state: 'NOT_DETECTED',
      detectedValue: null,
      normalizedValue: null,
      source: 'OCR_TEXT',
      confidence: 0,
      evidenceReference: null,
      isDemoRecord,
    }
  }

  /**
   * Detects explicit textual claims of ISI Mark or Standard Mark.
   */
  private detectIsiMarkMention(text: string, isDemoRecord: boolean): BisDetectedIdentifier {
    if (!text) {
      return {
        type: 'ISI_MARK',
        state: 'NOT_DETECTED',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0,
        evidenceReference: null,
        isDemoRecord,
      }
    }

    const markPattern = /\b(ISI\s*MARK|ISI\s*CERTIFIED|STANDARD\s*MARK|BUREAU\s*OF\s*INDIAN\s*STANDARDS\s*CERTIFIED|CERTIFIED\s*BY\s*BIS|BEARS\s*ISI\s*MARK)\b/i
    const match = text.match(markPattern)

    if (match) {
      return {
        type: 'ISI_MARK',
        state: 'DETECTED',
        detectedValue: match[1].trim(),
        normalizedValue: 'ISI_STANDARD_MARK',
        source: 'OCR_TEXT',
        confidence: 0.9,
        evidenceReference: this.extractSnippet(text, match.index ?? 0, match[1].length),
        isDemoRecord,
      }
    }

    // Isolated mention of "ISI" (could be false positive e.g. "VISITING" or acronym)
    if (/\bISI\b/i.test(text)) {
      return {
        type: 'ISI_MARK',
        state: 'UNCERTAIN',
        detectedValue: 'ISI',
        normalizedValue: 'ISI_STANDARD_MARK',
        source: 'OCR_TEXT',
        confidence: 0.5,
        evidenceReference: 'Isolated "ISI" acronym detected on packaging surface',
        isDemoRecord,
      }
    }

    return {
      type: 'ISI_MARK',
      state: 'NOT_DETECTED',
      detectedValue: null,
      normalizedValue: null,
      source: 'OCR_TEXT',
      confidence: 0,
      evidenceReference: null,
      isDemoRecord,
    }
  }

  /**
   * Extracts a contextual snippet around the match for verifiable auditability.
   */
  private extractSnippet(text: string, startIndex: number, length: number): string {
    const contextRadius = 40
    const start = Math.max(0, startIndex - contextRadius)
    const end = Math.min(text.length, startIndex + length + contextRadius)
    const prefix = start > 0 ? '...' : ''
    const suffix = end < text.length ? '...' : ''
    return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`
  }
}

export const defaultIdentifierDetector = new IdentifierDetector()
