/**
 * GET  /api/v1/products — Search & list products (all authenticated users)
 * POST /api/v1/products — Create product entry (authority & admin only)
 */

import { requireAuth, requireRole, ok, created, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  brand: z.string().max(100).optional(),
  genericName: z.string().max(200).optional(),
  barcode: z.string().max(50).optional(),
  manufacturer: z.string().max(250).optional(),
  packer: z.string().max(250).optional(),
  importer: z.string().max(250).optional(),
  countryOfOrigin: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
})

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const barcode = searchParams.get('barcode')?.trim()
    const category = searchParams.get('category')?.trim()
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100)
    const page = Math.max(Number(searchParams.get('page')) || 1, 1)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (barcode) {
      where.barcode = barcode
    } else if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { genericName: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.category = category
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])

    return ok({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('Products GET error:', err)
    return serverError()
  }
}

export async function POST(request: Request) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = createProductSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    if (parse.data.barcode) {
      const existing = await prisma.product.findUnique({
        where: { barcode: parse.data.barcode },
      })
      if (existing) {
        return badRequest(`Product with barcode "${parse.data.barcode}" already exists`)
      }
    }

    const product = await prisma.product.create({
      data: {
        name: parse.data.name,
        brand: parse.data.brand ?? null,
        genericName: parse.data.genericName ?? null,
        barcode: parse.data.barcode ?? null,
        manufacturer: parse.data.manufacturer ?? null,
        packer: parse.data.packer ?? null,
        importer: parse.data.importer ?? null,
        countryOfOrigin: parse.data.countryOfOrigin ?? null,
        category: parse.data.category ?? null,
      },
    })

    await audit({
      userId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'Product',
      entityId: product.id,
      metadata: { name: product.name, barcode: product.barcode },
      ipAddress: getIp(request),
    })

    return created(product, 'Product created successfully')
  } catch (err) {
    console.error('Product create error:', err)
    return serverError()
  }
}
