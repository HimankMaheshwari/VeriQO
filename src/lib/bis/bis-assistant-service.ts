import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiApiKey } from '@/lib/ocr/env'
import { getBisKnowledgeService, BisKnowledgeService } from './bis-knowledge-service'
import { understandBisQuery } from './query-understanding'
import type {
  BisAssistantResult,
  BisAssistantOptions,
  BisAssistantConfidence,
  BisStandardMatch,
  BisSourceCitation,
  CompactBisStandard,
  StructuredBisQuery,
} from './types'

export class BisAssistantService {
  private knowledgeService: BisKnowledgeService
  private genAI: GoogleGenerativeAI | null = null
  private primaryModel: string

  constructor(
    knowledgeService?: BisKnowledgeService,
    options?: BisAssistantOptions
  ) {
    this.knowledgeService = knowledgeService || getBisKnowledgeService()
    const apiKey = options?.apiKey || getGeminiApiKey()
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey.trim())
    }
    this.primaryModel =
      options?.modelName ||
      process.env.GEMINI_AI_MODEL ||
      process.env.GEMINI_MODEL ||
      'gemini-flash-latest'
  }

  /**
   * Main entry point to answer a user's BIS query.
   * Orchestrates intent detection, query understanding, knowledge retrieval,
   * context formation, answer generation, and confidence/citation extraction.
   */
  async answerQuery(
    rawQuery: string,
    options?: BisAssistantOptions
  ): Promise<BisAssistantResult> {
    const query = (rawQuery || '').trim()

    // 1. Query Understanding & Intent Detection
    const parsedQuery: StructuredBisQuery = understandBisQuery(query)

    // Early Return 1: If intent is UNKNOWN, return deterministic message immediately.
    // Skips knowledge retrieval and Gemini entirely.
    if (parsedQuery.intent === 'UNKNOWN') {
      return {
        answer: this.generateDeterministicAnswer(query, parsedQuery, []),
        intent: 'UNKNOWN',
        confidence: 'UNKNOWN',
        product: null,
        standards: [],
        sources: [],
        nextSteps: this.generateNextSteps(parsedQuery, []),
        isDemoData: true,
      }
    }

    // 2. BIS Knowledge Retrieval
    const retrievedStandards = await this.retrieveRelevantStandards(parsedQuery)

    // Early Return 2: If no matching standards found, return deterministic message immediately.
    // Skips Gemini entirely to avoid hallucination or token waste.
    if (retrievedStandards.length === 0) {
      return {
        answer: this.generateDeterministicAnswer(query, parsedQuery, []),
        intent: parsedQuery.intent,
        confidence: 'LOW',
        product: parsedQuery.productName
          ? {
              productName: parsedQuery.productName,
              category: parsedQuery.category || null,
            }
          : null,
        standards: [],
        sources: [],
        nextSteps: this.generateNextSteps(parsedQuery, []),
        isDemoData: true,
      }
    }

    // 3. Build Standard Matches
    const standards: BisStandardMatch[] = retrievedStandards.map((std, idx) => ({
      standardNumber: std.standardNumber,
      title: std.title,
      relevance: idx === 0 ? 0.95 : Math.max(0.7, 0.9 - idx * 0.1),
      whyApplicable: std.isMandatory
        ? `Mandatory standard governing ${std.productCategory || std.category}.`
        : `Voluntary quality specification applicable to ${std.productCategory || std.category}.`,
      evidence: std.qcoReference ? [std.qcoReference] : [],
    }))

    // 4. Build Citation-Ready Sources (strictly anti-hallucination: clauses/pages are null)
    const sources: BisSourceCitation[] = retrievedStandards.map((std) => ({
      sourceTitle: `${std.title} (${std.standardNumber}) [Prototype Knowledge Record]`,
      documentId: std.id,
      standardNumber: std.standardNumber,
      section: null,
      clause: null,
      page: null,
      url: null,
    }))

    // 5. Compute Confidence
    const confidence = this.computeConfidence(parsedQuery, retrievedStandards)

    // 6. Generate Context-Constrained Answer (Gemini or Deterministic Fallback)
    const answer = await this.generateAnswer(
      query,
      parsedQuery,
      retrievedStandards,
      options
    )

    // 7. Actionable Next Steps
    const nextSteps = this.generateNextSteps(parsedQuery, retrievedStandards)

    return {
      answer,
      intent: parsedQuery.intent,
      confidence,
      product: parsedQuery.productName
        ? {
            productName: parsedQuery.productName,
            category: parsedQuery.category || null,
          }
        : null,
      standards,
      sources,
      nextSteps,
      isDemoData: true,
    }
  }

  /**
   * Retrieves relevant standards from the BIS knowledge base using clean non-redundant lookup.
   */
  private async retrieveRelevantStandards(
    parsed: StructuredBisQuery
  ): Promise<CompactBisStandard[]> {
    // 1. Direct standard number lookup (STANDARD_DETAILS)
    if (parsed.standardNumber) {
      const exact = await this.knowledgeService.getStandardByNumber(parsed.standardNumber)
      if (exact) return [exact]
    }

    // 2. Category lookup when category detected and no specific product mapped
    if (parsed.category && !parsed.productName) {
      const categoryResults = await this.knowledgeService.getStandardsByCategory(parsed.category, 5)
      if (categoryResults.length > 0) return categoryResults
    }

    // 3. Search standards by product name, keywords, or normalized query
    const searchQuery = parsed.productName || parsed.keywords.join(' ') || parsed.normalizedQuery
    if (searchQuery.length > 0) {
      const res = await this.knowledgeService.searchStandards(searchQuery, {
        category: parsed.category || undefined,
        limit: 5,
      })
      if (res.standards.length > 0) return res.standards

      // If multi-word search returned 0, try primary keyword
      const primaryKeyword = parsed.keywords.find((kw) => kw.length >= 4)
      if (primaryKeyword && primaryKeyword !== searchQuery) {
        const kwRes = await this.knowledgeService.searchStandards(primaryKeyword, { limit: 5 })
        if (kwRes.standards.length > 0) return kwRes.standards
      }
    }

    return []
  }

  /**
   * Computes retrieval confidence without asserting legal certainty.
   */
  private computeConfidence(
    parsed: StructuredBisQuery,
    standards: CompactBisStandard[]
  ): BisAssistantConfidence {
    if (parsed.intent === 'UNKNOWN' && standards.length === 0) {
      return 'UNKNOWN'
    }

    if (standards.length === 0) {
      return parsed.intent === 'UNKNOWN' ? 'UNKNOWN' : 'LOW'
    }

    if (parsed.standardNumber && standards.some((s) => s.standardNumber === parsed.standardNumber)) {
      return 'HIGH'
    }

    if (parsed.productName && standards.length > 0 && parsed.intent !== 'UNKNOWN') {
      return 'HIGH'
    }

    if (standards.length > 0) {
      return 'MEDIUM'
    }

    return 'LOW'
  }

  /**
   * Generates a context-bounded answer using single Gemini model when available,
   * or a clean deterministic synthesizer as fallback.
   */
  private async generateAnswer(
    originalQuery: string,
    parsed: StructuredBisQuery,
    standards: CompactBisStandard[],
    options?: BisAssistantOptions
  ): Promise<string> {
    const apiKey = options?.apiKey || getGeminiApiKey()

    if (apiKey && this.genAI && standards.length > 0 && parsed.intent !== 'UNKNOWN') {
      try {
        const geminiAnswer = await this.callGeminiAssistant(
          originalQuery,
          parsed,
          standards,
          options
        )
        if (geminiAnswer && geminiAnswer.trim().length > 0) {
          return geminiAnswer.trim()
        }
      } catch (err) {
        console.warn('[BisAssistantService] Gemini call failed, falling back to deterministic answer:', err)
      }
    }

    return this.generateDeterministicAnswer(originalQuery, parsed, standards)
  }

  /**
   * Calls Google Gemini with a strictly anti-hallucinatory prompt using ONE configured model.
   */
  private async callGeminiAssistant(
    query: string,
    parsed: StructuredBisQuery,
    standards: CompactBisStandard[],
    options?: BisAssistantOptions
  ): Promise<string> {
    if (!this.genAI) return ''

    const contextSnippet = standards
      .map(
        (s, idx) => `
[Standard ${idx + 1}]
- Number: ${s.standardNumber}
- Title: ${s.title}
- Category: ${s.category} (Product: ${s.productCategory || 'N/A'})
- Mandatory under QCO: ${s.isMandatory ? 'Yes' : 'No'}
- Certification Scheme: ${s.certificationScheme || 'N/A'}
- Description: ${s.description || 'N/A'}
- Notice: Prototype / Demo knowledge record (Verify with official Gazette)
`
      )
      .join('\n')

    const prompt = `You are the VeriQO Bureau of Indian Standards (BIS) AI Assistant for packaged commodities and industrial standards in India.

USER QUERY: "${query}"
DETECTED INTENT: ${parsed.intent}

RETRIEVED BIS KNOWLEDGE CONTEXT:
${contextSnippet}

STRICT ANTI-HALLUCINATION AND CITATION RULES:
1. Answer ONLY based on the supplied retrieved BIS knowledge context above.
2. NEVER invent, fabricate, or hallucinate BIS standard numbers, technical parameters, or certification requirements.
3. NEVER invent laboratory names, clause numbers, page numbers, or official URLs.
4. If the retrieved context does not contain enough information to answer the question, clearly state: "No matching standard was found in the current BIS knowledge base."
5. Clearly indicate that the retrieved records are prototype demonstration knowledge and that users must consult the official BIS portal (bis.gov.in) for legal enforcement.
6. Provide concise, clear, and actionable explanations.
7. Do not make legal compliance or violation decisions.

YOUR CONCISE ANSWER:`

    const modelName =
      options?.modelName || this.primaryModel || 'gemini-flash-latest'

    const model = this.genAI.getGenerativeModel(
      {
        model: modelName,
        generationConfig: {
          temperature: options?.temperature ?? 0.1,
        },
      },
      { timeout: 15000 }
    )

    const response = await model.generateContent([prompt])
    const text = response.response.text()
    return text ? text.trim() : ''
  }

  /**
   * Deterministic answer synthesizer for fast, reliable, zero-hallucination responses
   * when LLM is unavailable or in automated test environments.
   */
  private generateDeterministicAnswer(
    query: string,
    parsed: StructuredBisQuery,
    standards: CompactBisStandard[]
  ): string {
    if (parsed.intent === 'UNKNOWN' && standards.length === 0) {
      return `I could not find a relevant Bureau of Indian Standards (BIS) standard for your query: "${query}". Please verify the product name or standard number (e.g. "IS [number]") and consult bis.gov.in.`
    }

    if (standards.length === 0) {
      return `No matching standard was found in the current BIS knowledge base for "${query}". You may verify official product standards on the Bureau of Indian Standards portal (https://www.bis.gov.in).`
    }

    const primary = standards[0]
    const mandatoryNotice = primary.isMandatory
      ? 'This standard is classified as MANDATORY under Quality Control Orders (QCO).'
      : 'This standard is currently voluntary / reference specification unless mandated by specific departmental orders.'

    const schemeInfo = primary.certificationScheme
      ? `Applicable Scheme: ${primary.certificationScheme} certification.`
      : ''

    let details = `Based on the BIS standards registry, the relevant standard is **${primary.standardNumber}**: "${primary.title}". ${mandatoryNotice} ${schemeInfo}`

    if (standards.length > 1) {
      const otherList = standards
        .slice(1)
        .map((s) => `${s.standardNumber} (${s.title})`)
        .join(', ')
      details += ` Other related standards include: ${otherList}.`
    }

    details += `\n\n*(Notice: Prototype knowledge record. Consult official BIS publications at bis.gov.in for statutory verification.)*`

    return details
  }

  /**
   * Generates actionable next steps based on query intent and matching standards.
   */
  private generateNextSteps(
    parsed: StructuredBisQuery,
    standards: CompactBisStandard[]
  ): string[] {
    const steps: string[] = []

    if (standards.length > 0) {
      const primary = standards[0]
      if (primary.certificationScheme === 'ISI') {
        steps.push(
          `Verify valid ISI certification and CM/L license number on product packaging.`
        )
      } else if (primary.certificationScheme === 'CRS') {
        steps.push(
          `Check Compulsory Registration Scheme (CRS) R-XXXXXXXX identifier.`
        )
      } else if (primary.certificationScheme === 'Hallmarking') {
        steps.push(
          `Verify 6-digit alphanumeric HUID code using the BIS CARE portal or mobile app.`
        )
      }
    }

    steps.push(
      'Verify official Quality Control Orders (QCO) and gazetted notifications at bis.gov.in.'
    )

    return steps
  }
}

let assistantInstance: BisAssistantService | null = null

export function getBisAssistantService(): BisAssistantService {
  if (!assistantInstance) {
    assistantInstance = new BisAssistantService()
  }
  return assistantInstance
}

/**
 * Top-level convenience function to answer a BIS query.
 */
export async function answerBisQuery(
  query: string,
  options?: BisAssistantOptions
): Promise<BisAssistantResult> {
  const service = options?.knowledgeService
    ? new BisAssistantService(options.knowledgeService, options)
    : getBisAssistantService()
  return service.answerQuery(query, options)
}
