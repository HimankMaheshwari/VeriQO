/**
 * GET /api/v1/bis/standards
 * Search and filter Indian Standards catalog.
 */

import { requireAuth, ok, serverError, getIp } from '@/lib/api-helpers'
import { defaultBisStandardsService } from '@/lib/bis/standards-service'
import { audit } from '@/lib/audit'

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') || undefined
    const standardNumber = url.searchParams.get('standardNumber') || undefined
    const division = url.searchParams.get('division') || undefined
    const status = url.searchParams.get('status') || undefined
    const isMandatoryRaw = url.searchParams.get('isMandatory')
    const isMandatory =
      isMandatoryRaw === 'true' ? true : isMandatoryRaw === 'false' ? false : undefined

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get('pageSize') || '10', 10) || 10)
    )

    const searchQuery = standardNumber || q

    const result = await defaultBisStandardsService.searchStandards({
      q: searchQuery,
      division,
      status,
      isMandatory,
      page,
      pageSize,
    })

    // Audit standards search
    await audit({
      userId: session.user.id,
      action: 'BIS_STANDARDS_SEARCH',
      entityType: 'BisStandard',
      metadata: {
        query: searchQuery || null,
        division: division || null,
        status: status || null,
        isMandatory: isMandatory ?? null,
        resultsCount: result.total,
        page,
        pageSize,
      },
      ipAddress: getIp(request),
    })

    return ok(result)
  } catch (err: unknown) {
    console.error('BIS standards search error:', err)
    return serverError('Failed to search Indian Standards catalog')
  }
}
