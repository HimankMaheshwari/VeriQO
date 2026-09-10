import { requireRole, ok, forbidden, serverError } from '@/lib/api-helpers'
import { defaultCaseService, CaseAccessError } from '@/lib/cases/case-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const timeline = await defaultCaseService.getCaseTimeline(params.id, {
      id: session.user.id,
      role: session.user.role as any,
    })

    return ok(timeline)
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    console.error('Get case timeline error:', err)
    return serverError()
  }
}
