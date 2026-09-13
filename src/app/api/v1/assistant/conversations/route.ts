/**
 * GET /api/v1/assistant/conversations
 * List conversation threads owned by the authenticated user.
 * Strictly scopes queries to session.user.id.
 */

import { requireAuth, ok, serverError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    // Strictly scoped to session.user.id
    const conversations = await prisma.bisAssistantConversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        contextStandardId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    })

    const payload = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      contextStandardId: c.contextStandardId,
      messagesCount: c._count.messages,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))

    return ok(payload)
  } catch (err: unknown) {
    console.error('List conversations error:', err)
    return serverError('Failed to retrieve user assistant conversations')
  }
}
