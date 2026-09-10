import { requireRole, ok, notFound, badRequest, forbidden, serverError, getIp } from '@/lib/api-helpers'
import { defaultCaseService, CaseAccessError } from '@/lib/cases/case-service'
import { z } from 'zod'

const updateCaseSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const regulatoryCase = await defaultCaseService.getCase(params.id, {
      id: session.user.id,
      role: session.user.role as any,
    })

    if (!regulatoryCase) {
      return notFound('Regulatory case not found')
    }

    return ok(regulatoryCase)
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    console.error('Get case error:', err)
    return serverError()
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = updateCaseSchema.safeParse(body)
    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message)
    }

    const updated = await defaultCaseService.updateCase(
      params.id,
      { id: session.user.id, role: session.user.role as any },
      parse.data,
      getIp(request)
    )

    if (!updated) {
      return notFound('Regulatory case not found')
    }

    return ok(updated, 'Case updated successfully')
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    console.error('Update case error:', err)
    return serverError()
  }
}
