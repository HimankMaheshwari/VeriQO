/**
 * GET  /api/v1/users        — List users (ADMIN only)
 * POST /api/v1/users        — Create authority/admin user (ADMIN only)
 * POST /api/v1/users/register — Public consumer self-registration
 */

import { requireRole, ok, created, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['CONSUMER', 'AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN']).default('CONSUMER'),
})

export async function GET() {
  const session = await requireRole(['ADMIN'])
  if (session instanceof Response) return session

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return ok(users)
}

export async function POST(request: Request) {
  const session = await requireRole(['ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = createUserSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const exists = await prisma.user.findUnique({ where: { email: parse.data.email } })
    if (exists) return badRequest('Email already registered')

    const hashedPassword = await bcrypt.hash(parse.data.password, 12)
    const user = await prisma.user.create({
      data: {
        name: parse.data.name,
        email: parse.data.email,
        hashedPassword,
        role: parse.data.role,
      },
    })

    await audit({
      userId: session.user.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
      ipAddress: getIp(request),
    })

    return created({ id: user.id, email: user.email, role: user.role }, 'User created')
  } catch (err) {
    console.error('User create error:', err)
    return serverError()
  }
}
