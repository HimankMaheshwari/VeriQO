import { requireRole, ok, notFound, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['CONSUMER', 'AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN']).optional(),
})

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['ADMIN'])
  if (session instanceof Response) return session

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  if (!user) return notFound()
  return ok(user)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = updateSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const user = await prisma.user.findUnique({ where: { id: params.id } })
    if (!user) return notFound()

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: parse.data,
    })

    await audit({
      userId: session.user.id,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: params.id,
      metadata: parse.data,
      ipAddress: getIp(request),
    })

    return ok({ id: updated.id, email: updated.email, role: updated.role, isActive: updated.isActive })
  } catch (err) {
    console.error('User update error:', err)
    return serverError()
  }
}
