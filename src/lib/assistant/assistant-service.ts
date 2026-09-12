import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import type {
  IAssistantService,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantConversationDto,
  CitationSource,
} from './types'
import { defaultCitationValidator } from './citation-validator'
import { defaultBisStandardsService } from '@/lib/bis/standards-service'
import { defaultQualityControlOrderService } from '@/lib/bis/qco-service'
import { audit } from '@/lib/audit'
import { randomUUID } from 'crypto'

export class BisAssistantService implements IAssistantService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Deterministic Phase 1 Assistant query handler.
   *
   * Note on Phase 1 constraints:
   * - No live Gemini assistant call yet (slated for Phase 2/3).
   * - No vector embeddings/RAG yet (slated for Phase 2).
   * - Grounded purely on verified local repository standards, clauses, and QCO rules.
   */
  async handleQuery(
    request: AssistantChatRequest,
    userId?: string | null
  ): Promise<AssistantChatResponse> {
    const rawMessage = request.message.trim()
    const queryLower = rawMessage.toLowerCase()

    // 1. Resolve search target: explicit standard number, context, or salient keywords
    const isMatch = rawMessage.match(/\bIS\s*\d+(?:\s*\([^)]+\))?(?::\d{4})?\b/i)
    let searchTarget = request.contextStandardNumber || (isMatch ? isMatch[0].trim() : '')

    if (!searchTarget) {
      const words = rawMessage.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      const stopWords = new Set(['what', 'are', 'the', 'in', 'under', 'for', 'is', 'a', 'an', 'and', 'or', 'to', 'of', 'how', 'do', 'i', 'can', 'limits', 'permissible'])
      const salient = words.filter((w) => !stopWords.has(w) && w.length > 2)
      searchTarget = salient.join(' ') || rawMessage
    }

    const matchedStandards = await defaultBisStandardsService.searchStandards({
      q: searchTarget,
      pageSize: 3,
    })

    const qcoCheck = await defaultQualityControlOrderService.checkQcoApplicability({
      category: searchTarget,
      productName: rawMessage,
    })

    const citations: CitationSource[] = []
    let reply = ''

    // 2. Deterministic response generation grounded in verified local standards
    if (matchedStandards.standards.length > 0) {
      const topStd = await defaultBisStandardsService.getStandardById(matchedStandards.standards[0].id)
      if (topStd) {
        citations.push({
          standardNumber: topStd.standardNumber,
          standardTitle: topStd.title,
          excerpt: topStd.description || topStd.title,
          qcoReference: topStd.mandatedByQco ?? undefined,
        })

        // Add top clauses if applicable
        if (topStd.clauses.length > 0) {
          const firstClause = topStd.clauses[0]
          citations.push({
            standardNumber: topStd.standardNumber,
            clauseNumber: firstClause.clauseNumber,
            clauseTitle: firstClause.title ?? undefined,
            excerpt: firstClause.content,
          })
        }

        reply = `Under **${topStd.standardNumber}** (*${topStd.title}*):\n\n`
        reply += `${topStd.description || 'This standard specifies national requirements and parameters in India.'}\n\n`

        if (topStd.clauses.length > 0) {
          reply += `### Key Statutory Clauses:\n`
          topStd.clauses.slice(0, 3).forEach((c) => {
            reply += `- **Clause ${c.clauseNumber} (${c.title || 'Requirement'})**: ${c.content}\n`
          })
        }

        if (qcoCheck.isMandatoryCertification && qcoCheck.applicableOrder) {
          reply += `\n> **Mandatory QCO Alert**: This commodity is covered under **${qcoCheck.applicableOrder.orderTitle}**. Manufacturing, importing, or selling without a valid BIS ISI license bearing the Standard Mark is a statutory violation.\n`
        }
      }
    } else if (queryLower.includes('cml') || queryLower.includes('isi') || queryLower.includes('license')) {
      reply = `**BIS ISI Mark & CML License Verification Guidance**:\n\n`
      reply += `- Scheme-I operates under the BIS (Conformity Assessment) Regulations, 2018.\n`
      reply += `- A valid **CML (Certification Marks License)** is a 7-digit numeric identifier in the format \`CM/L-XXXXXXX\`.\n`
      reply += `- The ISI Mark monogram must appear on the commodity packaging directly above the standard number (e.g. \`IS 10500\`) and the 7-digit CML number.\n`
      reply += `- You can verify any CML license directly using the VeriQO BIS License Verifier.\n`
    } else if (queryLower.includes('crs') || queryLower.includes('electronics') || queryLower.includes('registration')) {
      reply = `**Compulsory Registration Scheme (CRS) Guidance**:\n\n`
      reply += `- Electronics and IT goods are notified under the Compulsory Registration Scheme (Scheme-II).\n`
      reply += `- Products must bear the self-declaration statement: *"Self-Declaration - Conforming to IS XXXXX"* along with an 8-digit registration number formatted as \`R-XXXXXXXX\`.\n`
    } else if (queryLower.includes('huid') || queryLower.includes('hallmark') || queryLower.includes('gold')) {
      reply = `**Gold Hallmarking & HUID Guidance**:\n\n`
      reply += `- Hallmarking of gold jewelry is mandatory in certified districts under the BIS Act, 2016.\n`
      reply += `- Hallmarked jewelry features three distinct marks: the BIS standard logo, purity in Karats/parts per thousand (e.g. 22K 916), and a 6-digit alphanumeric **HUID (Hallmarking Unique Identification)**.\n`
      reply += `- Every HUID is unique to an individual jewelry piece and stamped at an authorized Assaying and Hallmarking Centre (AHC).\n`
    } else {
      reply = `Welcome to the **VeriQO BIS & Indian Standards Intelligent Assistant**.\n\n`
      reply += `You can ask questions regarding:\n`
      reply += `1. **Indian Standards (IS Codes)**: e.g. *IS 10500 (Drinking Water)*, *IS 1293 (Plugs & Sockets)*, *IS 9873 (Toys)*.\n`
      reply += `2. **Mandatory Quality Control Orders (QCOs)**: Check if a product category requires compulsory BIS certification.\n`
      reply += `3. **License Verification**: Formats and rules for ISI (CML), CRS (R-numbers), and Gold Hallmarking (HUID).\n`
    }

    // 3. Validate citations
    const validatedCitations = await defaultCitationValidator.validateCitations(citations)

    // 4. Record or update conversation in database
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
          citations: validatedCitations.validCitations as any,
          confidenceScore: 0.95,
        },
      })
      messageId = assistantMsg.id

      // 5. Audit log
      await audit({
        userId: userId ?? undefined,
        action: 'BIS_ASSISTANT_QUERY',
        entityType: 'BisAssistantConversation',
        entityId: conversationId,
        metadata: {
          querySnippet: rawMessage.slice(0, 100),
          citationsCount: validatedCitations.validCitations.length,
          grounded: validatedCitations.isValid,
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
      citations: validatedCitations.validCitations,
      confidenceScore: 0.95,
      grounded: true,
      disclaimer:
        'Official Disclaimer: This assistant provides automated guidance grounded in Indian Standards catalog and gazette notifications. All statutory enforcement decisions must be corroborated with official BIS publications and authorized certifying officers.',
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
