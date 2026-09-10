import { requireAuth, requireRole, ok, notFound, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  requirement: z.string().min(10).optional(),
  applicability: z.string().optional(),
  isActive: z.boolean().optional(),
  changeDescription: z.string().min(10, 'Change description required when updating a rule').max(500),
})

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  const rule = await prisma.legalRule.findUnique({
    where: { id: params.id },
    include: { versions: { orderBy: { versionNumber: 'desc' } } },
  })

  if (!rule) return notFound('Rule not found')
  return ok(rule)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = updateSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const existing = await prisma.legalRule.findUnique({ where: { id: params.id } })
    if (!existing) return notFound()

    const { changeDescription, ...updateData } = parse.data

    const updated = await prisma.legalRule.update({
      where: { id: params.id },
      data: { ...updateData, updatedAt: new Date() },
    })

    // Create new version snapshot
    const latestVersion = await prisma.ruleVersion.findFirst({
      where: { ruleId: params.id },
      orderBy: { versionNumber: 'desc' },
    })

    await prisma.ruleVersion.create({
      data: {
        ruleId: params.id,
        versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
        changeDescription,
        changedById: session.user.id,
        effectiveDate: new Date(),
        snapshot: updated as object,
      },
    })

    await audit({
      userId: session.user.id,
      action: 'RULE_CHANGED',
      entityType: 'LegalRule',
      entityId: params.id,
      metadata: { action: 'updated', ruleNumber: existing.ruleNumber, changeDescription },
      ipAddress: getIp(request),
    })

    return ok(updated)
  } catch (err) {
    console.error('Rule update error:', err)
    return serverError()
  }
}
