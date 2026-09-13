/**
 * GET /api/v1/bis/qco
 * List Quality Control Orders (QCO) with optional filtering and pagination.
 */

import { requireAuth, ok, serverError } from '@/lib/api-helpers'
import { defaultQualityControlOrderService } from '@/lib/bis/qco-service'

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')?.trim().toUpperCase()
    const productOrCategory = (
      url.searchParams.get('product') ||
      url.searchParams.get('category') ||
      ''
    )
      .trim()
      .toLowerCase()
    const standardNumber = url.searchParams.get('standardNumber')?.trim().toUpperCase()

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get('pageSize') || '10', 10) || 10)
    )

    let qcos = await defaultQualityControlOrderService.listQcos()

    if (status) {
      qcos = qcos.filter((q) => q.status.toUpperCase() === status)
    }

    if (productOrCategory) {
      qcos = qcos.filter(
        (q) =>
          q.orderTitle.toLowerCase().includes(productOrCategory) ||
          q.applicableProducts.toLowerCase().includes(productOrCategory)
      )
    }

    if (standardNumber) {
      qcos = qcos.filter(
        (q) => q.standardNumber && q.standardNumber.toUpperCase().includes(standardNumber)
      )
    }

    const total = qcos.length
    const start = (page - 1) * pageSize
    const paginated = qcos.slice(start, start + pageSize)

    return ok({
      qcos: paginated,
      total,
      page,
      pageSize,
    })
  } catch (err: unknown) {
    console.error('List QCOs error:', err)
    return serverError('Failed to list Quality Control Orders')
  }
}
