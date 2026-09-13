/**
 * GET /api/v1/bis/standards/[id]/clauses
 * Retrieve clauses for a specific Indian Standard with optional pagination.
 */

import { requireAuth, ok, notFound, serverError } from '@/lib/api-helpers'
import { defaultBisStandardsService } from '@/lib/bis/standards-service'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const id = decodeURIComponent(params.id).trim()
    if (!id) {
      return notFound('Standard ID or number is required')
    }

    let standard = await defaultBisStandardsService.getStandardById(id)
    if (!standard) {
      standard = await defaultBisStandardsService.getStandardByNumber(id)
    }

    if (!standard) {
      return notFound(`Indian Standard with identifier "${id}" not found`)
    }

    const url = new URL(request.url)
    const clauseQuery = url.searchParams.get('clauseNumber')?.trim().toLowerCase()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20)
    )

    let clauses = standard.clauses
    if (clauseQuery) {
      clauses = clauses.filter(
        (c) =>
          c.clauseNumber.toLowerCase().includes(clauseQuery) ||
          (c.title && c.title.toLowerCase().includes(clauseQuery))
      )
    }

    const total = clauses.length
    const start = (page - 1) * pageSize
    const paginatedClauses = clauses.slice(start, start + pageSize)

    return ok({
      standardId: standard.id,
      standardNumber: standard.standardNumber,
      standardTitle: standard.title,
      clauses: paginatedClauses,
      total,
      page,
      pageSize,
    })
  } catch (err: unknown) {
    console.error('BIS standard clauses error:', err)
    return serverError('Failed to retrieve standard clauses')
  }
}
