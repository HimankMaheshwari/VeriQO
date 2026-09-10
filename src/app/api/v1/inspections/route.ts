import { requireRole, ok, created, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  productId: z.string().optional(),
  scanId: z.string().optional(),
})

export async function GET() {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  const where =
    session.user.role === 'AUTHORITY_OFFICER'
      ? { officerId: session.user.id }
      : {}

  const inspections = await prisma.inspection.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      product: true,
      scan: { select: { id: true, identifiedProductName: true, status: true } },
      officer: { select: { name: true } },
    },
  })

  return ok(inspections)
}

export async function POST(request: Request) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = createSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message ?? 'Validation error')

    let resolvedProductId = parse.data.productId ?? null
    const scanId = parse.data.scanId ? parse.data.scanId.trim() : null

    if (scanId) {
      const scan = await prisma.productScan.findUnique({
        where: { id: scanId },
        select: { id: true, productId: true },
      })
      if (!scan) {
        return badRequest(`Referenced ProductScan "${scanId}" was not found`)
      }
      if (!resolvedProductId && scan.productId) {
        resolvedProductId = scan.productId
      }
    }

    const inspection = await prisma.inspection.create({
      data: {
        officerId: session.user.id,
        title: parse.data.title ?? null,
        notes: parse.data.notes ?? null,
        productId: resolvedProductId,
        scanId: scanId || null,
      },
    })

    await audit({
      userId: session.user.id,
      action: 'INSPECTION_CREATED',
      entityType: 'Inspection',
      entityId: inspection.id,
      ipAddress: getIp(request),
    })

    return created(inspection, 'Inspection created')
  } catch (err) {
    console.error('Inspection create error:', err)
    return serverError()
  }
}
