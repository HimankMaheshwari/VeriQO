import { requireRole, ok, badRequest, forbidden, notFound, serverError, getIp } from '@/lib/api-helpers'
import { defaultCaseService, CaseAccessError, CasePrerequisiteError } from '@/lib/cases/case-service'
import { z } from 'zod'

const assignSchema = z.object({
  officerId: z.string().min(1, 'Officer ID is required'),
  reason: z.string().max(500).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Only Senior Authority or Admin can assign/reassign cases
  const session = await requireRole(['SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = assignSchema.safeParse(body)
    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message)
    }

    const updated = await defaultCaseService.assignOfficer(
      params.id,
      { id: session.user.id, role: session.user.role as any },
      parse.data,
      getIp(request)
    )

    if (!updated) {
      return notFound('Regulatory case not found')
    }

    return ok(updated, 'Officer assigned successfully')
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    if (err instanceof CasePrerequisiteError) {
      return badRequest(err.message)
    }
    console.error('Assign officer error:', err)
    return serverError()
  }
}
