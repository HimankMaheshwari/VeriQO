/**
 * POST /api/v1/inspections/[id]/decision — Record official Authority Officer final decision
 */

import { requireRole, ok, badRequest, notFound, serverError, getIp } from '@/lib/api-helpers'
import { defaultInspectionService, InspectionAccessError, RegulatoryDecisionConsistencyError } from '@/lib/inspections/inspection-service'
import { z } from 'zod'

const decisionSchema = z.object({
  decision: z.enum(['COMPLIANT', 'NON_COMPLIANT', 'FURTHER_INVESTIGATION', 'DISMISSED']),
  remarks: z.string().max(2000).optional().nullable(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = decisionSchema.safeParse(body)
    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message ?? 'Invalid decision input')
    }

    const decision = await defaultInspectionService.recordDecision(
      params.id,
      { id: session.user.id, role: session.user.role },
      parse.data,
      getIp(request)
    )

    return ok(decision)
  } catch (err: any) {
    console.error('Inspection decision POST error:', err)
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    if (err instanceof RegulatoryDecisionConsistencyError || err.name === 'RegulatoryDecisionConsistencyError') {
      return badRequest(err.message)
    }
    return serverError(err.message || 'Error recording officer decision')
  }
}
