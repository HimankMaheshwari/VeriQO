import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getConsumerSafeStatus } from '@/lib/consumer/status-projection'
import ConsumerComplaintsList, {
  type SerializedConsumerComplaint,
} from './ConsumerComplaintsList'

export const metadata = { title: 'My Complaints | VeriQO' }

export default async function ComplaintsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Strict ownership isolation: ONLY complaints belonging to the authenticated consumer
  const complaints = await prisma.complaint.findMany({
    where: { consumerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, brand: true, category: true } },
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
          updatedAt: true,
          closedAt: true,
        },
      },
    },
  })

  // Safely serialize for the client projection
  const serialized: SerializedConsumerComplaint[] = complaints.map((c) => {
    // Authoritative status from RegulatoryCase when linked (Adjustment #1)
    const safe = getConsumerSafeStatus(c.case?.status, c.status)
    const latestUpdate =
      c.case?.updatedAt && c.case.updatedAt > c.updatedAt ? c.case.updatedAt : c.updatedAt

    return {
      id: c.id,
      complaintRef: c.complaintRef,
      title: c.title,
      description: c.description,
      createdAt: c.createdAt.toISOString(),
      updatedAt: latestUpdate.toISOString(),
      statusKey: safe.key,
      statusLabel: safe.label,
      statusDescription: safe.description,
      badgeVariant: safe.badgeVariant,
      isTerminal: safe.isTerminal,
      productName: c.product?.name ?? c.scan?.identifiedProductName ?? null,
      productBrand: c.product?.brand ?? c.scan?.identifiedBrand ?? null,
      category: c.product?.category ?? c.scan?.identifiedCategory ?? null,
      scanId: c.scanId,
      caseNumber: c.case?.caseNumber ?? null,
    }
  })

  return <ConsumerComplaintsList initialComplaints={serialized} />
}
