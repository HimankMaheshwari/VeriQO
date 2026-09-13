/**
 * GET    /api/v1/assistant/conversations/[id]  — Retrieve conversation and messages with ownership check
 * DELETE /api/v1/assistant/conversations/[id]  — Delete owned conversation thread
 */

import { requireAuth, ok, notFound, forbidden, serverError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const conversation = await prisma.bisAssistantConversation.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return notFound('Conversation not found')
    }

    // Enforce ownership: user cannot view another user's conversation
    if (conversation.userId && conversation.userId !== session.user.id) {
      return forbidden('You do not have permission to access this conversation thread')
    }

    const payload = {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      contextStandardId: conversation.contextStandardId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations,
        confidenceScore: m.confidenceScore,
        createdAt: m.createdAt.toISOString(),
      })),
    }

    return ok(payload)
  } catch (err: unknown) {
    console.error('Get conversation error:', err)
    return serverError('Failed to retrieve conversation')
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const conversation = await prisma.bisAssistantConversation.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    })

    if (!conversation) {
      return notFound('Conversation not found')
    }

    // Enforce ownership: user can only delete their own conversation
    if (conversation.userId && conversation.userId !== session.user.id) {
      return forbidden('You do not have permission to delete this conversation')
    }

    await prisma.bisAssistantConversation.delete({
      where: { id: params.id },
    })

    return ok({ id: params.id, deleted: true }, 'Conversation deleted successfully')
  } catch (err: unknown) {
    console.error('Delete conversation error:', err)
    return serverError('Failed to delete conversation')
  }
}
