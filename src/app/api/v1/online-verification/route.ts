/**
 * POST /api/v1/online-verification — Trigger online/e-commerce verification for a scan
 * GET  /api/v1/online-verification?scanId=... — Retrieve online verification records
 */

import { requireAuth, ok, badRequest, forbidden, notFound, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { defaultOnlineVerificationService } from '@/lib/online/verification-service'
import { z } from 'zod'

const onlineVerificationSchema = z.object({
  scanId: z.string().min(1, 'scanId is required'),
  url: z.string().url('A valid HTTP/HTTPS URL is required'),
  inspectionId: z.string().optional(),
})

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parsed = onlineVerificationSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? 'Validation error')
    }

    const { scanId, url, inspectionId } = parsed.data

    const scan = await prisma.productScan.findUnique({
      where: { id: scanId },
      select: { id: true, userId: true },
    })

    if (!scan) {
      return notFound(`ProductScan with ID '${scanId}' not found`)
    }

    const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(
      session.user.role
    )
    if (!isAuthority && scan.userId !== session.user.id) {
      return forbidden('You do not have permission to verify this scan')
    }

    // Security guard: If inspectionId is provided, verify scanId belongs to that inspection
    if (inspectionId) {
      const inspection = await prisma.inspection.findUnique({
        where: { id: inspectionId },
        select: { id: true, officerId: true, scanId: true },
      })

      if (!inspection) {
        return notFound(`Inspection with ID '${inspectionId}' not found`)
      }

      if (inspection.scanId !== scanId) {
        return badRequest(`Security violation: ProductScan '${scanId}' does not belong to inspection '${inspectionId}'`)
      }

      const canAccess =
        session.user.role === 'ADMIN' ||
        session.user.role === 'SENIOR_AUTHORITY' ||
        inspection.officerId === session.user.id

      if (!canAccess) {
        return forbidden('You do not have permission to attach online verification to this inspection')
      }
    }

    const result = await defaultOnlineVerificationService.verifyProductOnline(scanId, url)

    await audit({
      userId: session.user.id,
      action: inspectionId ? 'INSPECTION_UPDATED' : 'PRODUCT_SCAN',
      entityType: inspectionId ? 'Inspection' : 'ProductScan',
      entityId: inspectionId || scanId,
      metadata: {
        subAction: 'ONLINE_VERIFICATION',
        scanId,
        url,
        inspectionId,
        overallMatchStatus: result.overallMatchStatus,
        discrepanciesCount: result.comparison?.discrepancies?.length || 0,
      },
      ipAddress: getIp(request),
    })

    return ok(result)
  } catch (err: any) {
    console.error('Online verification POST error:', err)
    if (err.name === 'SecurityValidationError') {
      return badRequest(err.message)
    }
    return serverError(err.message || 'Internal error processing online verification')
  }
}

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')

    if (!scanId) {
      return badRequest('Query parameter scanId is required')
    }

    const scan = await prisma.productScan.findUnique({
      where: { id: scanId },
      select: { id: true, userId: true },
    })

    if (!scan) {
      return notFound(`ProductScan with ID '${scanId}' not found`)
    }

    const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(
      session.user.role
    )
    if (!isAuthority && scan.userId !== session.user.id) {
      return forbidden('You do not have permission to access online verifications for this scan')
    }

    const records = await prisma.onlineVerification.findMany({
      where: { scanId },
      include: {
        snapshot: true,
        fields: true,
        discrepancies: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return ok(records)
  } catch (err: any) {
    console.error('Online verification GET error:', err)
    return serverError()
  }
}
