/**
 * GET /api/v1/inspections/[id]/traceability/online/[discrepancyId]
 * Retrieves the online discrepancy evidence traceability chain.
 */

import { requireRole, ok, forbidden, serverError } from '@/lib/api-helpers'
import { defaultEvidenceService } from '@/lib/inspections/evidence-service'
import { InspectionAccessError } from '@/lib/inspections/types'

export async function GET(
  request: Request,
  { params }: { params: { id: string; discrepancyId: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const trace = await defaultEvidenceService.getOnlineEvidenceTrace(
      params.discrepancyId,
      { id: session.user.id, role: session.user.role },
      params.id
    )

    return ok(trace)
  } catch (err: any) {
    console.error('Online evidence trace error:', err)
    if (err instanceof InspectionAccessError) {
      return forbidden(err.message)
    }
    return serverError(err.message || 'Error fetching online evidence trace')
  }
}
