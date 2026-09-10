/**
 * GET /api/v1/inspections/[id]/traceability/[checkId]
 * Retrieves the end-to-end physical evidence traceability chain for a compliance check finding.
 */

import { requireRole, ok, forbidden, serverError } from '@/lib/api-helpers'
import { defaultEvidenceService } from '@/lib/inspections/evidence-service'
import { InspectionAccessError } from '@/lib/inspections/types'

export async function GET(
  request: Request,
  { params }: { params: { id: string; checkId: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const trace = await defaultEvidenceService.getPhysicalEvidenceTrace(
      params.checkId,
      { id: session.user.id, role: session.user.role },
      params.id
    )

    return ok(trace)
  } catch (err: any) {
    console.error('Physical evidence trace error:', err)
    if (err instanceof InspectionAccessError) {
      return forbidden(err.message)
    }
    return serverError(err.message || 'Error fetching physical evidence trace')
  }
}
