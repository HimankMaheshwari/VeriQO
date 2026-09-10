/**
 * GET  /api/v1/scans — List scans (CONSUMER: own; AUTHORITY/ADMIN: all)
 * POST /api/v1/scans — Create scan record
 */

import { requireAuth, ok, created, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const createScanSchema = z.object({
  productId: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const { searchParams } = new URL(request.url)
    const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(session.user.role)

    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100)
    const page = Math.max(Number(searchParams.get('page')) || 1, 1)
    const skip = (page - 1) * limit
    const status = searchParams.get('status')

    const where: Record<string, unknown> = isAuthority
      ? {}
      : { userId: session.user.id }

    if (status) {
      where.status = status
    }

    const [scans, total] = await Promise.all([
      prisma.productScan.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, brand: true, barcode: true } },
          images: { select: { id: true, storageKey: true, originalFilename: true, mimeType: true, sizeBytes: true } },
          user: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.productScan.count({ where }),
    ])

    return ok({
      scans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('Scans GET error:', err)
    return serverError()
  }
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = createScanSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    const scan = await prisma.productScan.create({
      data: {
        userId: session.user.id,
        productId: parse.data.productId ?? null,
        notes: parse.data.notes ?? null,
        status: 'PENDING',
      },
      include: {
        product: true,
      },
    })

    await audit({
      userId: session.user.id,
      action: 'PRODUCT_SCAN',
      entityType: 'ProductScan',
      entityId: scan.id,
      ipAddress: getIp(request),
    })

    return created(scan, 'Scan session created successfully')
  } catch (err) {
    console.error('Scan create error:', err)
    return serverError()
  }
}
