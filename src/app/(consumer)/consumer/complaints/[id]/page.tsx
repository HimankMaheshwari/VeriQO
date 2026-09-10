import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import {
  getConsumerSafeStatus,
  getConsumerTimeline,
  getConsumerSafeOutcome,
} from '@/lib/consumer/status-projection'
import ConsumerComplaintDetail, {
  type SerializedComplaintDetail,
} from './ConsumerComplaintDetail'

export const metadata = { title: 'Complaint Tracking | VeriQO' }

export default async function ComplaintDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Strict ownership isolation: ONLY the authenticated consumer can access
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

  // Return 404 if not found or belongs to another consumer (prevents ID enumeration)
  if (!complaint || complaint.consumerId !== session.user.id) {
    notFound()
  }

  // Authoritative status from RegulatoryCase if linked (Adjustment #1)
  const safe = getConsumerSafeStatus(complaint.case?.status, complaint.status)

  // Find official terminal inspection decision if present (Adjustment #2)
  const latestDecision =
    complaint.case?.inspections.find((i) => i.decision)?.decision?.decision ?? null

  const outcome = getConsumerSafeOutcome(
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

  const serialized: SerializedComplaintDetail = {
    id: complaint.id,
    complaintRef: complaint.complaintRef,
    title: complaint.title,
    description: complaint.description,
    createdAt: complaint.createdAt.toISOString(),
    updatedAt: latestUpdate.toISOString(),
    statusKey: safe.key,
    statusLabel: safe.label,
    statusDescription: safe.description,
    badgeVariant: safe.badgeVariant,
    isTerminal: safe.isTerminal,
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
    outcome,
    documents: {
      areAvailable: outcome?.documentsAvailable ?? false,
      listUrl: `/api/v1/consumer/complaints/${complaint.id}/documents`,
    },
    timeline,
  }

  return <ConsumerComplaintDetail complaint={serialized} />
}
