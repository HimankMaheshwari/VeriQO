import { requireAuth, requireRole, ok, notFound, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATING', 'RESOLVED', 'CLOSED']),
  note: z.string().max(500).optional(),
})

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: { updates: { orderBy: { updatedAt: 'asc' } }, consumer: { select: { name: true } } },
  })

  if (!complaint) return notFound('Complaint not found')

  const isOwner = complaint.consumerId === session.user.id
  const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(session.user.role)
  if (!isOwner && !isAuthority) return notFound('Complaint not found')

  return ok(complaint)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // Only authority+ can update complaint status
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = updateSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const complaint = await prisma.complaint.findUnique({ where: { id: params.id } })
    if (!complaint) return notFound()

    const updated = await prisma.complaint.update({
      where: { id: params.id },
      data: { status: parse.data.status },
    })

    await prisma.complaintUpdate.create({
      data: {
        complaintId: params.id,
        updatedById: session.user.id,
        previousStatus: complaint.status,
        newStatus: parse.data.status,
        note: parse.data.note ?? null,
      },
    })

    await audit({
      userId: session.user.id,
      action: 'COMPLAINT_CHANGED',
      entityType: 'Complaint',
      entityId: params.id,
      metadata: { from: complaint.status, to: parse.data.status },
      ipAddress: getIp(request),
    })

    return ok(updated)
  } catch (err) {
    console.error('Complaint update error:', err)
    return serverError()
  }
}
