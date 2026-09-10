import { requireRole, ok, badRequest, forbidden, notFound, serverError, getIp } from '@/lib/api-helpers'
import { defaultCaseService, CaseAccessError, CaseStateTransitionError } from '@/lib/cases/case-service'
import { z } from 'zod'

const closeSchema = z.object({
  remarks: z.string().max(2000).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Only Senior Authority or Admin can formally close a case
  const session = await requireRole(['SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    let bodyData = {}
    try {
      const text = await request.text()
      if (text) bodyData = JSON.parse(text)
    } catch {
      // Body is optional
    }

    const parse = closeSchema.safeParse(bodyData)
    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message)
    }

    const updated = await defaultCaseService.closeCase(
      params.id,
      { id: session.user.id, role: session.user.role as any },
      parse.data,
      getIp(request)
    )

    if (!updated) {
      return notFound('Regulatory case not found')
    }

    return ok(updated, 'Regulatory case closed successfully')
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    if (err instanceof CaseStateTransitionError) {
      return badRequest(err.message)
    }
    console.error('Close case error:', err)
    return serverError()
  }
}
