/**
 * GET /api/v1/consumer/complaints
 * Returns all complaints filed by the authenticated consumer with privacy-safe status projection.
 * Strictly scoped to session.user.id at the database layer.
 * Zero internal authority data exposed.
 */

import { requireAuth, ok, serverError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getConsumerSafeStatus } from '@/lib/consumer/status-projection'

export async function GET() {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
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

    const payload = complaints.map((c) => {
      // Authoritative status from RegulatoryCase when linked (Adjustment #1)
      const safeStatus = getConsumerSafeStatus(c.case?.status, c.status)
      const latestUpdate =
        c.case?.updatedAt && c.case.updatedAt > c.updatedAt ? c.case.updatedAt : c.updatedAt

      return {
        id: c.id,
        complaintRef: c.complaintRef,
        title: c.title,
        description: c.description,
        productName: c.product?.name ?? c.scan?.identifiedProductName ?? null,
        productBrand: c.product?.brand ?? c.scan?.identifiedBrand ?? null,
        category: c.product?.category ?? c.scan?.identifiedCategory ?? null,
        scanId: c.scanId,
        createdAt: c.createdAt,
        updatedAt: latestUpdate,
        status: safeStatus,
        caseNumber: c.case?.caseNumber ?? null,
        hasCase: !!c.case,
      }
    })

    return ok(payload)
  } catch (err) {
    console.error('Consumer complaints list error:', err)
    return serverError()
  }
}
