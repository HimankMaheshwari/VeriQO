import { requireRole, ok, notFound, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { defaultInspectionService, InspectionAccessError, InspectionStateTransitionError } from '@/lib/inspections/inspection-service'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'CLOSED']).optional(),
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  productId: z.string().optional().nullable(),
  scanId: z.string().optional().nullable(),
})

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const inspection = await defaultInspectionService.getInspection(params.id, {
      id: session.user.id,
      role: session.user.role,
    })

    if (!inspection) return notFound()
    return ok(inspection)
  } catch (err: any) {
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    console.error('Inspection GET error:', err)
    return serverError()
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = updateSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const updated = await defaultInspectionService.updateInspection(
      params.id,
      { id: session.user.id, role: session.user.role },
      parse.data,
      getIp(request)
    )

    if (!updated) return notFound()
    return ok(updated)
  } catch (err: any) {
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    if (err instanceof InspectionStateTransitionError) {
      return badRequest(err.message)
    }
    console.error('Inspection update error:', err)
    return serverError()
  }
}

