/**
 * GET /api/v1/bis/knowledge/chunks/[id]
 * Retrieve a single knowledge chunk with traceability and source citation metadata.
 */

import { requireAuth, ok, notFound, serverError, badRequest } from '@/lib/api-helpers'
import { defaultBisKnowledgeService } from '@/lib/bis/knowledge/knowledge-service'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const chunkId = params.id?.trim()
    if (!chunkId) {
      return badRequest('Chunk ID is required.')
    }

    const chunk = await defaultBisKnowledgeService.getChunkById(chunkId)
    if (!chunk) {
      return notFound(`Knowledge chunk "${chunkId}" not found.`)
    }

    return ok({
      chunk,
      isDemoData: chunk.isDemoRecord,
    })
  } catch (err: unknown) {
    console.error('Error fetching knowledge chunk:', err)
    return serverError('Failed to fetch knowledge chunk.')
  }
}
