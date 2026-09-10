import { requireRole, ok, notFound, serverError } from '@/lib/api-helpers'
import { defaultAuthoritySearchService } from '@/lib/search/search-service'

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const decodedName = decodeURIComponent(params.name)
    const summary = await defaultAuthoritySearchService.getManufacturerInvestigation(
      decodedName,
      { id: session.user.id, role: session.user.role as any }
    )

    if (!summary) {
      return notFound(`Manufacturer "${decodedName}" not found`)
    }

    return ok(summary)
  } catch (err) {
    console.error('Manufacturer investigation error:', err)
    return serverError()
  }
}
