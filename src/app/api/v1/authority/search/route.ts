import { requireRole, ok, badRequest, serverError } from '@/lib/api-helpers'
import { defaultAuthoritySearchService } from '@/lib/search/search-service'
import { z } from 'zod'

const searchSchema = z.object({
  q: z.string().optional(),
  type: z
    .enum([
      'ALL',
      'CASE',
      'COMPLAINT',
      'INSPECTION',
      'PRODUCT',
      'MANUFACTURER',
      'BRAND',
      'VIOLATION',
      'DISCREPANCY',
    ])
    .optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  severity: z.string().optional(),
  officer: z.string().optional(),
  manufacturer: z.string().optional(),
  brand: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
})

export async function GET(request: Request) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const url = new URL(request.url)
    const rawParams = Object.fromEntries(url.searchParams.entries())
    const parse = searchSchema.safeParse(rawParams)

    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message ?? 'Invalid search query parameters')
    }

    const searchResponse = await defaultAuthoritySearchService.search(
      parse.data,
      { id: session.user.id, role: session.user.role as any }
    )

    return ok(searchResponse)
  } catch (err) {
    console.error('Authority search error:', err)
    return serverError()
  }
}
