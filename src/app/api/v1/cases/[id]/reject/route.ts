import { requireRole, ok, badRequest, forbidden, notFound, serverError, getIp } from '@/lib/api-helpers'
import { defaultCaseService, CaseAccessError, CasePrerequisiteError, CaseStateTransitionError } from '@/lib/cases/case-service'
import { z } from 'zod'

const rejectSchema = z.object({
  reason: z.string().min(15, 'Rejection justification must be at least 15 characters').max(2000),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = rejectSchema.safeParse(body)
    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message)
    }

    const updated = await defaultCaseService.rejectCase(
      params.id,
      { id: session.user.id, role: session.user.role as any },
      parse.data,
      getIp(request)
    )

    if (!updated) {
      return notFound('Regulatory case not found')
    }

    return ok(updated, 'Regulatory case rejected')
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    if (err instanceof CasePrerequisiteError || err instanceof CaseStateTransitionError) {
      return badRequest(err.message)
    }
    console.error('Reject case error:', err)
    return serverError()
  }
}
