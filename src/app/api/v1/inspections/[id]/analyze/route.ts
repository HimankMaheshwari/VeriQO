/**
 * POST /api/v1/inspections/[id]/analyze — Execute deterministic Legal Metrology compliance analysis
 */

import { requireRole, ok, badRequest, notFound, serverError, getIp } from '@/lib/api-helpers'
import { defaultInspectionService, InspectionAccessError } from '@/lib/inspections/inspection-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const result = await defaultInspectionService.runComplianceAnalysis(
      params.id,
      { id: session.user.id, role: session.user.role },
      getIp(request)
    )

    return ok(result)
  } catch (err: any) {
    console.error('Inspection analyze POST error:', err)
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    if (err.message && err.message.includes('not linked to any physical ProductScan')) {
      return badRequest(err.message)
    }
    return serverError(err.message || 'Error running compliance analysis')
  }
}
