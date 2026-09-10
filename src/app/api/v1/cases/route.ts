import { requireRole, ok, created, badRequest, serverError, forbidden, getIp } from '@/lib/api-helpers'
import { defaultCaseService, CaseAccessError, CasePrerequisiteError } from '@/lib/cases/case-service'
import { z } from 'zod'

const createCaseSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  complaintId: z.string().optional(),
  productScanId: z.string().optional(),
  assignedOfficerId: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as any
    const priority = url.searchParams.get('priority') as any
    const assignedOfficerId = url.searchParams.get('assignedOfficerId') || undefined
    const search = url.searchParams.get('search') || undefined
    const hasInspection = url.searchParams.get('hasInspection') === 'true' ? true : undefined
    const hasViolations = url.searchParams.get('hasViolations') === 'true' ? true : undefined
    const unassigned = url.searchParams.get('unassigned') === 'true' ? true : undefined

    const cases = await defaultCaseService.listCases(
      { id: session.user.id, role: session.user.role as any },
      { status, priority, assignedOfficerId, search, hasInspection, hasViolations, unassigned }
    )

    return ok(cases)
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    console.error('List cases error:', err)
    return serverError()
  }
}

export async function POST(request: Request) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = createCaseSchema.safeParse(body)
    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message)
    }

    const createdCase = await defaultCaseService.createCase(
      session.user.id,
      parse.data,
      getIp(request)
    )

    return created(createdCase, 'Regulatory case created successfully')
  } catch (err: any) {
    if (err instanceof CasePrerequisiteError) {
      return badRequest(err.message)
    }
    if (err instanceof CaseAccessError) {
      return forbidden(err.message)
    }
    console.error('Create case error:', err)
    return serverError()
  }
}
