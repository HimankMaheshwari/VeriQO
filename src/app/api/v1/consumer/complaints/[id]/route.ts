/**
 * GET /api/v1/consumer/complaints/[id]
 * Retrieves a single consumer complaint with its privacy-safe status projection,
 * safe progress timeline, and neutral terminal outcome.
 *
 * Security: Strict ownership isolation (returns 404 on unowned to prevent ID enumeration).
 * Privacy: Zero officer notes, risk intelligence, internal evidence, or audit logs exposed.
 */

import { requireAuth, ok, notFound, serverError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import {
  getConsumerSafeStatus,
  getConsumerTimeline,
  getConsumerSafeOutcome,
} from '@/lib/consumer/status-projection'

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
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            genericName: true,
            category: true,
          },
        },
        scan: {
          select: {
            id: true,
            identifiedProductName: true,
            identifiedBrand: true,
            identifiedCategory: true,
            createdAt: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            closedAt: true,
            inspections: {
              select: {
                id: true,
                status: true,
                decision: {
                  select: {
                    decision: true,
                    decidedAt: true,
                  },
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

    // Strict ownership isolation: return 404 if not found or owned by someone else
    if (!complaint || complaint.consumerId !== session.user.id) {
      return notFound('Complaint not found')
    }

    // Authoritative status from RegulatoryCase if linked (Adjustment #1)
    const safeStatus = getConsumerSafeStatus(complaint.case?.status, complaint.status)

    // Find official terminal inspection decision if present (Adjustment #2)
    const latestDecision = complaint.case?.inspections.find((i) => i.decision)?.decision?.decision ?? null

    const safeOutcome = getConsumerSafeOutcome(
      complaint.case?.status,
      complaint.status,
      latestDecision,
      complaint.case?.closedAt ?? complaint.case?.updatedAt ?? complaint.updatedAt
    )

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

    const latestUpdate =
      complaint.case?.updatedAt && complaint.case.updatedAt > complaint.updatedAt
        ? complaint.case.updatedAt
        : complaint.updatedAt

    const payload = {
      id: complaint.id,
      complaintRef: complaint.complaintRef,
      title: complaint.title,
      description: complaint.description,
      createdAt: complaint.createdAt,
      updatedAt: latestUpdate,
      status: safeStatus,
      product: complaint.product
        ? {
            id: complaint.product.id,
            name: complaint.product.name,
            brand: complaint.product.brand,
            genericName: complaint.product.genericName,
            category: complaint.product.category,
          }
        : null,
      scan: complaint.scan
        ? {
            id: complaint.scan.id,
            identifiedProductName: complaint.scan.identifiedProductName,
            identifiedBrand: complaint.scan.identifiedBrand,
            identifiedCategory: complaint.scan.identifiedCategory,
          }
        : null,
      caseDocket: complaint.case
        ? {
            caseNumber: complaint.case.caseNumber,
          }
        : null,
      outcome: safeOutcome,
      documents: {
        areAvailable: safeOutcome?.documentsAvailable ?? false,
        listUrl: `/api/v1/consumer/complaints/${complaint.id}/documents`,
      },
      timeline,
    }

    return ok(payload)
  } catch (err) {
    console.error('Consumer complaint detail error:', err)
    return serverError()
  }
}
