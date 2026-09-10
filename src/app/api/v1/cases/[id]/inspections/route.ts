import { requireRole, created, badRequest, forbidden, notFound, serverError, getIp } from '@/lib/api-helpers'
import { defaultCaseService, CaseAccessError } from '@/lib/cases/case-service'
import { z } from 'zod'

const createInspectionSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  notes: z.string().max(2000).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    let bodyData = {}
    try {
      const text = await request.text()
      if (text) bodyData = JSON.parse(text)
    } catch {
      // Body is optional
    }

    const parse = createInspectionSchema.safeParse(bodyData)
    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message)
    }

    const inspection = await defaultCaseService.createInspectionFromCase(
      params.id,
      { id: session.user.id, role: session.user.role as any },
      parse.data,
      getIp(request)
    )

    if (!inspection) {
      return notFound('Regulatory case not found')
    }

    return created(inspection, 'Inspection created successfully from case')
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    console.error('Create inspection from case error:', err)
    return serverError()
  }
}
