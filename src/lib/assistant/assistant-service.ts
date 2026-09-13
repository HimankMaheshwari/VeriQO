import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import type {
  IAssistantService,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantConversationDto,
  CitationSource,
  RetrievedEvidenceItem,
} from './types'
import { defaultCitationValidator } from './citation-validator'
import { defaultBisStandardsService } from '@/lib/bis/standards-service'
import { defaultQualityControlOrderService } from '@/lib/bis/qco-service'
import { defaultBisKnowledgeService } from '@/lib/bis/knowledge/knowledge-service'
import {
  getGroundedGenerationProvider,
  type IGroundedGenerationProvider,
} from './gemini-grounded-provider'
import { ConfidenceCalculator } from './confidence-calculator'
import {
  extractStandardNumbers,
  extractClauseIdentifiers,
} from '@/lib/bis/knowledge/normalization'
import { audit } from '@/lib/audit'
import { randomUUID } from 'crypto'

export class BisAssistantService implements IAssistantService {
  private db: PrismaClient
  private provider?: IGroundedGenerationProvider

  constructor(client?: PrismaClient, provider?: IGroundedGenerationProvider) {
    this.db = client ?? prisma
    this.provider = provider
  }

  private getProvider(): IGroundedGenerationProvider {
    return this.provider || getGroundedGenerationProvider()
  }

  /**
   * Phase 4 Grounded Assistant query handler.
   *
   * Upgraded Retrieval + Grounded Generation Pipeline:
   * 1. Query Normalization & statutory entity extraction (IS codes, clauses)
   * 2. Knowledge Retrieval: Queries the BIS Knowledge Base for ranked evidence chunks
   * 3. Pre-Gemini Guardrail: If 0 evidence matches a factual query, Gemini is NEVER called
   * 4. Context Isolation: Conversation history passed as context dialogue only, not evidence
   * 5. Gemini Grounded Provider: Synthesizes response inside strict statutory XML fences
   * 6. Post-Generation Citation Validation (5th Gate): Citations must exist in retrieved evidence
   * 7. Deterministic Confidence Calculation: Application owns final confidence score
   * 8. Transparent Demo Data & Provider Disclosure
   */
  async handleQuery(
    request: AssistantChatRequest,
    userId?: string | null
  ): Promise<AssistantChatResponse> {
    const rawMessage = request.message.trim()
    const queryLower = rawMessage.toLowerCase()

    // 1. Resolve search targets: explicit standard number or extracted from query
    const extractedStandards = extractStandardNumbers(rawMessage)
    const extractedClauses = extractClauseIdentifiers(rawMessage)
    const targetStandard =
      request.contextStandardNumber ||
      (extractedStandards.length > 0 ? extractedStandards[0] : undefined)
    const targetClause = extractedClauses.length > 0 ? extractedClauses[0] : undefined

    // 2. Knowledge Retrieval: Always search fresh knowledge chunks from BisKnowledgeService
    const knowledgeResults = await defaultBisKnowledgeService.searchKnowledge({
      query: rawMessage,
      standardNumber: targetStandard,
      clauseNumber: targetClause,
      limit: 5,
    })

    const retrievedEvidence: RetrievedEvidenceItem[] = knowledgeResults.map((r) => ({
      chunkId: r.chunkId,
      standardNumber: r.standardNumber,
      standardTitle: r.title,
      clauseNumber: r.clauseNumber,
      clauseTitle: r.clauseTitle,
      text: r.relevantText,
      score: r.relevanceScore,
      sourceReference: r.sourceReference,
      isDemoRecord: true,
    }))

    let citations: CitationSource[] = []
    let reply = ''
    let confidenceScore = 0.0
    let grounded = false
    let insufficientEvidence = false
    let activeProvider = 'deterministic-rules'
    let activeModel: string | undefined = undefined

    // 3. Pre-search triage: Statutory licensing procedures vs Standards knowledge retrieval
    const isLicensingOrHelpQuery =
      !targetStandard &&
      (queryLower.includes('cml') ||
        queryLower.includes('isi') ||
        queryLower.includes('license') ||
        queryLower.includes('crs') ||
        queryLower.includes('electronics') ||
        queryLower.includes('registration') ||
        queryLower.includes('huid') ||
        queryLower.includes('hallmark') ||
        queryLower.includes('gold') ||
        rawMessage.length < 5 ||
        queryLower.includes('hello') ||
        queryLower.includes('help') ||
        queryLower === 'hi')

    if (isLicensingOrHelpQuery) {
      if (
        queryLower.includes('cml') ||
        queryLower.includes('isi') ||
        queryLower.includes('license')
      ) {
        grounded = true
        confidenceScore = 0.95
        activeProvider = 'deterministic-rules'
        activeModel = 'statutory-guidance-rules'
        reply = `**BIS ISI Mark & CML License Verification Guidance**:\n\n`
        reply += `- Scheme-I operates under the BIS (Conformity Assessment) Regulations, 2018.\n`
        reply += `- A valid **CML (Certification Marks License)** is a 7-digit numeric identifier in the format \`CM/L-XXXXXXX\`.\n`
        reply += `- The ISI Mark monogram must appear on the commodity packaging directly above the standard number (e.g. \`IS 10500\`) and the 7-digit CML number.\n`
        reply += `- You can verify any CML license directly using the VeriQO BIS License Verifier.\n`
      } else if (
        queryLower.includes('crs') ||
        queryLower.includes('electronics') ||
        queryLower.includes('registration')
      ) {
        grounded = true
        confidenceScore = 0.95
        activeProvider = 'deterministic-rules'
        activeModel = 'statutory-guidance-rules'
        reply = `**Compulsory Registration Scheme (CRS) Guidance**:\n\n`
        reply += `- Electronics and IT goods are notified under the Compulsory Registration Scheme (Scheme-II).\n`
        reply += `- Products must bear the self-declaration statement: *"Self-Declaration - Conforming to IS XXXXX"* along with an 8-digit registration number formatted as \`R-XXXXXXXX\`.\n`
      } else if (
        queryLower.includes('huid') ||
        queryLower.includes('hallmark') ||
        queryLower.includes('gold')
      ) {
        grounded = true
        confidenceScore = 0.95
        activeProvider = 'deterministic-rules'
        activeModel = 'statutory-guidance-rules'
        reply = `**Gold Hallmarking & HUID Guidance**:\n\n`
        reply += `- Hallmarking of gold jewelry is mandatory in certified districts under the BIS Act, 2016.\n`
        reply += `- Hallmarked jewelry features three distinct marks: the BIS standard logo, purity in Karats/parts per thousand (e.g. 22K 916), and a 6-digit alphanumeric **HUID (Hallmarking Unique Identification)**.\n`
        reply += `- Every HUID is unique to an individual jewelry piece and stamped at an authorized Assaying and Hallmarking Centre (AHC).\n`
      } else {
        grounded = true
        confidenceScore = 0.9
        activeProvider = 'deterministic-rules'
        activeModel = 'statutory-guidance-rules'
        reply = `Welcome to the **VeriQO BIS & Indian Standards Intelligent Assistant**.\n\n`
        reply += `You can ask questions regarding:\n`
        reply += `1. **Indian Standards (IS Codes)**: e.g. *IS 10500 (Drinking Water)*, *IS 1293 (Plugs & Sockets)*, *IS 9873 (Toys)*.\n`
        reply += `2. **Mandatory Quality Control Orders (QCOs)**: Check if a product category requires compulsory BIS certification.\n`
        reply += `3. **License Verification**: Formats and rules for ISI (CML), CRS (R-numbers), and Gold Hallmarking (HUID).\n`
      }
    } else if (knowledgeResults.length > 0 && knowledgeResults[0].relevanceScore >= 0.15) {
      // Retrieve recent conversation history for clarification context (max 4 turns)
      let conversationHistory: Array<{ role: 'USER' | 'ASSISTANT'; content: string }> | undefined
      if (request.conversationId) {
        try {
          const pastMessages = await this.db.bisAssistantMessage.findMany({
            where: { conversationId: request.conversationId },
            orderBy: { createdAt: 'desc' },
            take: 4,
          })
          if (pastMessages.length > 0) {
            conversationHistory = pastMessages.reverse().map((m) => ({
              role: m.role as 'USER' | 'ASSISTANT',
              content: m.content,
            }))
          }
        } catch {
          // Proceed if DB history fetch fails
        }
      }

      // Invoke Grounded Generation Provider (Gemini or deterministic fallback)
      const provider = this.getProvider()
      const genOutput = await provider.generateGroundedResponse({
        userQuery: rawMessage,
        retrievedEvidence,
        conversationHistory,
      })

      // 4. Post-generation citation validation against retrieved evidence (Condition 5)
      const validatedCitations = await defaultCitationValidator.validateCitations(
        genOutput.citations,
        retrievedEvidence
      )

      // 5. Hallucination & Grounding Guardrails
      if (genOutput.grounded === false || genOutput.refusalReason) {
        grounded = false
        insufficientEvidence = true
        reply = genOutput.answer
        confidenceScore = 0.0
        citations = []
      } else if (validatedCitations.validCitations.length === 0 && genOutput.citations.length > 0) {
        // Model generated citations, but NONE belonged to retrieved evidence!
        grounded = false
        insufficientEvidence = true
        reply = `Verified statutory evidence from the repository is insufficient to validate the claims for this query. The generated references could not be verified against retrieved standards.`
        confidenceScore = 0.0
        citations = []
      } else {
        grounded = true
        insufficientEvidence = false
        reply = genOutput.answer
        citations = validatedCitations.validCitations

        if (!reply.includes('Retrieved Statutory Evidence')) {
          reply += `\n\n### Retrieved Statutory Evidence & Clauses:\n`
          retrievedEvidence.slice(0, 3).forEach((r) => {
            const clauseHeader = r.clauseNumber
              ? `Clause ${r.clauseNumber}${r.clauseTitle ? ` (${r.clauseTitle})` : ''}`
              : 'Specification'
            const cleanContent = r.text.replace(/^\[[\s\S]*?\][^\n]*\n/, '').trim()
            reply += `- **${clauseHeader}**: ${cleanContent}\n\n`
          })
        }

        // Append QCO Alert if applicable and not already present
        const topResult = knowledgeResults[0]
        const topStd = await defaultBisStandardsService.getStandardByNumber(topResult.standardNumber)
        const qcoCheck = await defaultQualityControlOrderService.checkQcoApplicability({
          category: topStd?.division || rawMessage,
          productName: rawMessage,
        })

        if (
          qcoCheck.isMandatoryCertification &&
          qcoCheck.applicableOrder &&
          !reply.toLowerCase().includes('mandatory qco alert')
        ) {
          reply += `\n\n> **Mandatory QCO Alert**: This commodity is covered under **${qcoCheck.applicableOrder.orderTitle}**. Manufacturing, importing, or selling without a valid BIS ISI license bearing the Standard Mark is a statutory violation.`
        }

        // Compute deterministic confidence (Application owns score)
        confidenceScore = ConfidenceCalculator.calculateConfidence({
          topRetrievalScore: retrievedEvidence[0]?.score ?? 0,
          evidenceCount: retrievedEvidence.length,
          validCitationCount: validatedCitations.validCitations.length,
          totalCitationCount: genOutput.citations.length,
          grounded: true,
          insufficientEvidence: false,
          hasDemoRecords: true,
        })
      }

      activeProvider = genOutput.provider || provider.providerName
      activeModel = genOutput.model
    } else {
      // 6. Pre-flight Guardrail: Zero Retrieval Results -> Immediate Refusal without LLM invocation
      insufficientEvidence = true
      grounded = false
      confidenceScore = 0.0
      activeProvider = 'deterministic-guardrail'
      activeModel = 'rule-gate'
      reply = `**Insufficient Knowledge-Base Evidence**:\n\n`
      reply += `No verified Indian Standards, clauses, or statutory specifications matching "${rawMessage}" were found in the local knowledge base.\n\n`
      reply += `To retrieve grounded compliance information, please specify an IS code (e.g. *IS 10500*, *IS 1293*, *IS 9873*) or a recognized product category.`
    }

    // 7. Record or update conversation in database
    let conversationId = request.conversationId
    let messageId: string = randomUUID()

    try {
      if (!conversationId) {
        const conv = await this.db.bisAssistantConversation.create({
          data: {
            userId: userId ?? null,
            title: rawMessage.slice(0, 50),
          },
        })
        conversationId = conv.id
      }

      // Record User Message
      await this.db.bisAssistantMessage.create({
        data: {
          conversationId,
          role: 'USER',
          content: rawMessage,
        },
      })

      // Record Assistant Message
      const assistantMsg = await this.db.bisAssistantMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: reply,
          citations: citations as any,
          confidenceScore,
        },
      })
      messageId = assistantMsg.id

      // 8. Audit log
      await audit({
        userId: userId ?? undefined,
        action: 'BIS_ASSISTANT_QUERY',
        entityType: 'BisAssistantConversation',
        entityId: conversationId,
        metadata: {
          querySnippet: rawMessage.slice(0, 100),
          citationsCount: citations.length,
          evidenceCount: retrievedEvidence.length,
          grounded,
          insufficientEvidence,
          provider: activeProvider,
        },
      })
    } catch {
      // If database is not active, fallback to in-memory response ID
      conversationId = conversationId || `conv-${randomUUID().slice(0, 8)}`
    }

    return {
      conversationId,
      messageId,
      reply,
      citations,
      confidenceScore,
      grounded,
      disclaimer:
        'Official Disclaimer: This assistant provides automated guidance grounded in Indian Standards catalog and gazette notifications. All statutory enforcement decisions must be corroborated with official BIS publications and authorized certifying officers.',
      retrievedEvidence,
      insufficientEvidence,
      provider: activeProvider,
      model: activeModel,
      isDemoData: true,
    }
  }

  async getConversation(id: string): Promise<AssistantConversationDto | null> {
    try {
      const conv = await this.db.bisAssistantConversation.findUnique({
        where: { id },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      })

      if (conv) {
        return {
          id: conv.id,
          userId: conv.userId,
          title: conv.title,
          contextStandardId: conv.contextStandardId,
          messages: conv.messages.map((m) => ({
            id: m.id,
            role: m.role as any,
            content: m.content,
            citations: m.citations as any,
            confidenceScore: m.confidenceScore,
            createdAt: m.createdAt.toISOString(),
          })),
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
        }
      }
    } catch {
      // Fall through
    }
    return null
  }

  async listUserConversations(
    userId?: string | null
  ): Promise<Array<{ id: string; title: string; createdAt: string; updatedAt: string }>> {
    try {
      const convs = await this.db.bisAssistantConversation.findMany({
        where: userId ? { userId } : {},
        orderBy: { updatedAt: 'desc' },
        take: 20,
      })

      return convs.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))
    } catch {
      return []
    }
  }
}

export const defaultBisAssistantService = new BisAssistantService()
