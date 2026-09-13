/**
 * GET /api/v1/bis/standards/[id]
 * Retrieve single Indian Standard with full clause details and linked QCOs.
 */

import { requireAuth, ok, notFound, serverError } from '@/lib/api-helpers'
import { defaultBisStandardsService } from '@/lib/bis/standards-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const id = decodeURIComponent(params.id).trim()
    if (!id) {
      return notFound('Standard ID or number is required')
    }

    // Try by ID first, then by standard number
    let standard = await defaultBisStandardsService.getStandardById(id)
    if (!standard) {
      standard = await defaultBisStandardsService.getStandardByNumber(id)
    }

    if (!standard) {
      return notFound(`Indian Standard with identifier "${id}" not found`)
    }

    return ok(standard)
  } catch (err: unknown) {
    console.error('BIS standard detail error:', err)
    return serverError('Failed to retrieve Indian Standard details')
  }
}
