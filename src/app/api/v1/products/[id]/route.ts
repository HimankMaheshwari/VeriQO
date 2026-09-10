/**
 * GET    /api/v1/products/[id] — Get product details
 * PATCH  /api/v1/products/[id] — Update product details (authority & admin)
 * DELETE /api/v1/products/[id] — Delete product (admin only)
 */

import { requireAuth, requireRole, ok, notFound, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  brand: z.string().max(100).optional().nullable(),
  genericName: z.string().max(200).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  manufacturer: z.string().max(250).optional().nullable(),
  packer: z.string().max(250).optional().nullable(),
  importer: z.string().max(250).optional().nullable(),
  countryOfOrigin: z.string().max(100).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { scans: true, inspections: true, complaints: true },
        },
      },
    })

    if (!product) return notFound('Product not found')
    return ok(product)
  } catch (err) {
    console.error('Product detail GET error:', err)
    return serverError()
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const product = await prisma.product.findUnique({ where: { id: params.id } })
    if (!product) return notFound('Product not found')

    const body = await request.json()
    const parse = updateProductSchema.safeParse(body)
    if (!parse.success) return badRequest(parse.error.issues[0]?.message)

    if (parse.data.barcode && parse.data.barcode !== product.barcode) {
      const conflict = await prisma.product.findUnique({
        where: { barcode: parse.data.barcode },
      })
      if (conflict) {
        return badRequest(`Barcode "${parse.data.barcode}" is already used by another product`)
      }
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: parse.data,
    })

    await audit({
      userId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'Product',
      entityId: updated.id,
      metadata: { changedFields: Object.keys(parse.data) },
      ipAddress: getIp(request),
    })

    return ok(updated, 'Product updated successfully')
  } catch (err) {
    console.error('Product update error:', err)
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
    const product = await prisma.product.findUnique({ where: { id: params.id } })
    if (!product) return notFound('Product not found')

    await prisma.product.delete({ where: { id: params.id } })

    await audit({
      userId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'Product',
      entityId: params.id,
      metadata: { name: product.name, barcode: product.barcode },
      ipAddress: getIp(request),
    })

    return ok({ id: params.id }, 'Product deleted successfully')
  } catch (err) {
    console.error('Product delete error:', err)
    return serverError()
  }
}
