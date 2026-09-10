/**
 * POST /api/v1/users/register — Public consumer self-registration
 * No authentication required. Only creates CONSUMER role accounts.
 * Authority/Admin accounts must be created by admin.
 */

import { ok, created, badRequest, serverError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parse = registerSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const exists = await prisma.user.findUnique({ where: { email: parse.data.email } })
    if (exists) return badRequest('Email already registered')

    const hashedPassword = await bcrypt.hash(parse.data.password, 12)
    const user = await prisma.user.create({
      data: {
        name: parse.data.name,
        email: parse.data.email,
        hashedPassword,
        role: 'CONSUMER', // Always CONSUMER — never trust client-provided role
      },
    })

    await audit({
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email },
    })

    return created({ id: user.id }, 'Account created successfully')
  } catch (err) {
    console.error('Register error:', err)
    return serverError()
  }
}
