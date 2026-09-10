/**
 * GET  /api/v1/rules  — List legal rules (all authenticated users)
 * POST /api/v1/rules  — Create rule (ADMIN only)
 *
 * Phase 3 will populate actual rules from Legal Metrology sources.
 * Phase 1 schema is ready, table intentionally empty.
 */

import { requireAuth, requireRole, ok, created, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const createRuleSchema = z.object({
  ruleNumber: z.string().min(1).max(50),
  title: z.string().min(5).max(200),
  requirement: z.string().min(10),
  applicability: z.string().optional(),
  sourceDocument: z.string().min(5),
  sourceReference: z.string().optional(),
  effectiveDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
})

export async function GET() {
  const session = await requireAuth()
  if (session instanceof Response) return session

  const rules = await prisma.legalRule.findMany({
    where: { isActive: true },
    orderBy: { ruleNumber: 'asc' },
    include: { _count: { select: { versions: true } } },
  })

  return ok(rules)
}

export async function POST(request: Request) {
  const session = await requireRole(['ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = createRuleSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const rule = await prisma.legalRule.create({
      data: {
        ...parse.data,
        effectiveDate: new Date(parse.data.effectiveDate),
        expiryDate: parse.data.expiryDate ? new Date(parse.data.expiryDate) : null,
      },
    })

    // Create initial version snapshot
    await prisma.ruleVersion.create({
      data: {
        ruleId: rule.id,
        versionNumber: 1,
        changeDescription: 'Initial version',
        changedById: session.user.id,
        effectiveDate: rule.effectiveDate,
        snapshot: rule as object,
      },
    })

    await audit({
      userId: session.user.id,
      action: 'RULE_CHANGED',
      entityType: 'LegalRule',
      entityId: rule.id,
      metadata: { action: 'created', ruleNumber: rule.ruleNumber },
      ipAddress: getIp(request),
    })

    return created(rule, 'Rule created')
  } catch (err) {
    console.error('Rule create error:', err)
    return serverError()
  }
}
