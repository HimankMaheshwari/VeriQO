/**
 * GET /api/v1/consumer/complaints/[id]/timeline
 * Returns the safe consumer-visible lifecycle progress timeline for a complaint.
 *
 * Security: Strict ownership isolation (returns 404 on unowned).
 * Privacy: Zero internal audit events or officer identities exposed.
 */

import { requireAuth, ok, notFound, serverError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getConsumerTimeline } from '@/lib/consumer/status-projection'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: params.id },
      include: {
        case: {
          select: {
            status: true,
            createdAt: true,
            updatedAt: true,
            closedAt: true,
            inspections: {
              select: {
                decision: {
                  select: { decision: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        updates: {
          select: {
            id: true,
            newStatus: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'asc' },
        },
      },
    })

    if (!complaint || complaint.consumerId !== session.user.id) {
      return notFound('Complaint not found')
    }

    const latestDecision = complaint.case?.inspections.find((i) => i.decision)?.decision?.decision ?? null

    const timeline = getConsumerTimeline({
      createdAt: complaint.createdAt,
      caseStatus: complaint.case?.status,
      complaintStatus: complaint.status,
      caseCreatedAt: complaint.case?.createdAt,
      caseUpdatedAt: complaint.case?.updatedAt,
      caseClosedAt: complaint.case?.closedAt,
      updates: complaint.updates,
      inspectionDecision: latestDecision,
    })

    return ok({ timeline })
  } catch (err) {
    console.error('Consumer complaint timeline error:', err)
    return serverError()
  }
}
