/**
 * POST /api/v1/assistant/chat
 * Query the BIS Intelligent Assistant (deterministic grounded Phase 2 foundation).
 */

import { requireAuth, ok, badRequest, forbidden, serverError } from '@/lib/api-helpers'
import { defaultBisAssistantService } from '@/lib/assistant/assistant-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  let body: any
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON payload')
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return badRequest('Message (message) is required')
  }

  const conversationId =
    typeof body.conversationId === 'string' && body.conversationId.trim()
      ? body.conversationId.trim()
      : undefined

  // Enforce conversation ownership if an existing conversationId was provided
  if (conversationId) {
    try {
      const existingConv = await prisma.bisAssistantConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, userId: true },
      })

      if (existingConv && existingConv.userId && existingConv.userId !== session.user.id) {
        return forbidden('You do not have permission to access this conversation thread')
      }
    } catch {
      // If DB error, proceed to service
    }
  }

  const contextStandardId =
    typeof body.contextStandardId === 'string' ? body.contextStandardId.trim() : undefined

  try {
    const result = await defaultBisAssistantService.handleQuery(
      {
        message,
        conversationId,
        contextStandardNumber: contextStandardId,
      },
      session.user.id
    )

    return ok({
      conversationId: result.conversationId,
      message: result.reply,
      reply: result.reply,
      citations: result.citations,
      confidenceScore: result.confidenceScore,
      grounded: result.grounded,
      insufficientEvidence: result.insufficientEvidence ?? false,
      retrievedEvidence: result.retrievedEvidence,
      provider: result.provider,
      model: result.model,
      disclaimer: result.disclaimer,
      isDemoData: true, // Grounded on local simulated demo standards catalog
    })
  } catch (err: unknown) {
    // Sanitize error: never leak API keys, user queries, or internal stack traces
    console.error('Assistant chat error:', err instanceof Error ? err.message : 'Unknown error')
    return serverError('Internal error processing assistant query')
  }
}
