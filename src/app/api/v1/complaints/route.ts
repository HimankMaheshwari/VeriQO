/**
 * POST /api/v1/complaints — Submit a complaint
 * GET  /api/v1/complaints — List complaints (CONSUMER: own; AUTHORITY+: all)
 * Layer 2 RBAC enforced in each handler.
 */

import { requireAuth, ok, created, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { defaultCaseService } from '@/lib/cases/case-service'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  productId: z.string().optional(),
  scanId: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(session.user.role)
  const where = isAuthority ? {} : { consumerId: session.user.id }

  const complaints = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { consumer: { select: { name: true } } },
  })

  return ok(complaints)
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = createSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const { title, description, productId, scanId } = parse.data

    const complaint = await prisma.complaint.create({
      data: {
        consumerId: session.user.id,
        title,
        description,
        productId: productId ?? null,
        scanId: scanId ?? null,
      },
    })

    await audit({
      userId: session.user.id,
      action: 'COMPLAINT_SUBMITTED',
      entityType: 'Complaint',
      entityId: complaint.id,
      metadata: { complaintRef: complaint.complaintRef, scanId },
      ipAddress: getIp(request),
    })

    // Phase 5A: Idempotently link/create corresponding RegulatoryCase
    try {
      await defaultCaseService.getOrCreateCaseForComplaint(complaint.id, getIp(request))
    } catch (caseErr) {
      console.error('Warning: Failed to auto-create regulatory case for complaint:', caseErr)
    }

    return created({ id: complaint.id, complaintRef: complaint.complaintRef }, 'Complaint submitted successfully')
  } catch (err) {
    console.error('Complaint create error:', err)
    return serverError()
  }
}
