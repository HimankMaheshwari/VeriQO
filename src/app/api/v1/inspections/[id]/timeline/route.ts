/**
 * GET /api/v1/inspections/[id]/timeline
 * Retrieves the chronological evidence timeline for an inspection.
 */

import { requireRole, ok, notFound, serverError } from '@/lib/api-helpers'
import { defaultEvidenceService } from '@/lib/inspections/evidence-service'
import { InspectionAccessError } from '@/lib/inspections/types'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const timeline = await defaultEvidenceService.getInspectionTimeline(
      params.id,
      { id: session.user.id, role: session.user.role }
    )

    return ok(timeline)
  } catch (err: any) {
    console.error('Inspection timeline GET error:', err)
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    return serverError(err.message || 'Error fetching inspection timeline')
  }
}
