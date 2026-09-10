/**
 * GET    /api/v1/scans/[id] — Get scan details (images, extracted declarations, product)
 * PATCH  /api/v1/scans/[id] — Update scan status or notes
 * DELETE /api/v1/scans/[id] — Delete scan (admin only)
 */

import { requireAuth, requireRole, ok, notFound, forbidden, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const updateScanSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETE', 'FAILED']).optional(),
  notes: z.string().max(1000).optional(),
  productId: z.string().optional().nullable(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const scan = await prisma.productScan.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        images: true,
        extractedDeclarations: true,
        onlineVerifications: true,
        inspections: {
          select: { id: true, status: true, title: true, createdAt: true },
        },
        complaints: {
          select: { id: true, complaintRef: true, status: true, title: true },
        },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    if (!scan) return notFound('Scan not found')

    const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(session.user.role)
    if (!isAuthority && scan.userId !== session.user.id) {
      return forbidden('You do not have permission to view this scan')
    }

    return ok(scan)
  } catch (err) {
    console.error('Scan detail GET error:', err)
    return serverError()
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const scan = await prisma.productScan.findUnique({ where: { id: params.id } })
    if (!scan) return notFound('Scan not found')

    const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(session.user.role)
    if (!isAuthority && scan.userId !== session.user.id) {
      return forbidden('You do not have permission to update this scan')
    }

    const body = await request.json()
    const parse = updateScanSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const { status, notes, productId } = parse.data
    const updateData: {
      status?: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
      notes?: string
      productId?: string | null
    } = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (productId !== undefined) updateData.productId = productId

    const updated = await prisma.productScan.update({
      where: { id: params.id },
      data: updateData,
    })

    await audit({
      userId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'ProductScan',
      entityId: updated.id,
      metadata: { changedFields: Object.keys(parse.data) },
      ipAddress: getIp(request),
    })

    return ok(updated, 'Scan updated successfully')
  } catch (err) {
    console.error('Scan update error:', err)
    return serverError()
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['ADMIN'])
  if (session instanceof Response) return session

  try {
    const scan = await prisma.productScan.findUnique({ where: { id: params.id } })
    if (!scan) return notFound('Scan not found')

    await prisma.productScan.delete({ where: { id: params.id } })

    await audit({
      userId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'ProductScan',
      entityId: params.id,
      ipAddress: getIp(request),
    })

    return ok({ id: params.id }, 'Scan deleted successfully')
  } catch (err) {
    console.error('Scan delete error:', err)
    return serverError()
  }
}
