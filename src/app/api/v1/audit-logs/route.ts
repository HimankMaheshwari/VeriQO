import { requireRole, ok } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await requireRole(['SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const action = searchParams.get('action') ?? undefined

  const logs = await prisma.auditLog.findMany({
    where: action ? { action: action as never } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  })

  return ok(logs)
}
