/**
 * GET /api/v1/bis/knowledge/search
 * Provider-agnostic lexical & statutory search across the BIS Knowledge Base.
 */

import { requireAuth, ok, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { defaultBisKnowledgeService } from '@/lib/bis/knowledge/knowledge-service'
import { audit } from '@/lib/audit'

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim()
    const standardNumber = url.searchParams.get('standardNumber')?.trim() || undefined
    const clauseNumber = url.searchParams.get('clauseNumber')?.trim() || undefined
    const category = url.searchParams.get('category')?.trim() || undefined
    const limitRaw = url.searchParams.get('limit')
    const limit = Math.min(50, Math.max(1, limitRaw ? parseInt(limitRaw, 10) || 5 : 5))

    if (!q && !standardNumber && !clauseNumber) {
      return badRequest('At least one of "q", "standardNumber", or "clauseNumber" must be provided.')
    }

    const results = await defaultBisKnowledgeService.searchKnowledge({
      query: q || '',
      standardNumber,
      clauseNumber,
      category,
      limit,
    })

    await audit({
      userId: session.user.id,
      action: 'BIS_STANDARDS_SEARCH',
      entityType: 'BisKnowledgeChunk',
      metadata: {
        query: q || null,
        standardNumber: standardNumber || null,
        clauseNumber: clauseNumber || null,
        resultsCount: results.length,
        limit,
      },
      ipAddress: getIp(request),
    })

    return ok({
      results,
      count: results.length,
      isDemoData: true,
    })
  } catch (err: unknown) {
    console.error('BIS knowledge search error:', err)
    return serverError('Failed to search BIS knowledge base.')
  }
}
