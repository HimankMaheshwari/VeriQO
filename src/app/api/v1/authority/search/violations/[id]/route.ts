import { requireRole, ok, notFound, forbidden, serverError } from '@/lib/api-helpers'
import { defaultAuthoritySearchService } from '@/lib/search/search-service'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const dossier = await defaultAuthoritySearchService.getViolationInvestigation(
      params.id,
      { id: session.user.id, role: session.user.role as any }
    )

    if (!dossier) {
      return notFound(`Violation with ID "${params.id}" not found or access denied`)
    }

    return ok(dossier)
  } catch (err) {
    console.error('Violation investigation error:', err)
    return serverError()
  }
}
