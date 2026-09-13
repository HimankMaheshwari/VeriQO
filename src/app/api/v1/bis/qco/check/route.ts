/**
 * POST /api/v1/bis/qco/check
 * Check whether a product category or HS code falls under mandatory BIS certification.
 */

import { requireAuth, ok, badRequest, serverError } from '@/lib/api-helpers'
import { defaultQualityControlOrderService } from '@/lib/bis/qco-service'

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  let body: any
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON payload')
  }

  const category = (body.productCategory || body.category || '').trim()
  const hsCode = typeof body.hsCode === 'string' ? body.hsCode.trim() : undefined
  const productName = typeof body.productName === 'string' ? body.productName.trim() : undefined

  if (!category && !hsCode && !productName) {
    return badRequest('At least one of productCategory, hsCode, or productName is required')
  }

  try {
    const result = await defaultQualityControlOrderService.checkQcoApplicability({
      category: category || productName || '',
      productName,
      hsCode,
    })

    return ok({
      isMandatoryCertification: result.isMandatoryCertification,
      applicableOrder: result.applicableOrder,
      applicableStandards: result.applicableStandards,
      effectiveDate: result.effectiveDate,
      isExempt: result.isExempt,
      exemptionReason: result.exemptionReason,
      explanation: result.guidance,
      isDemoData: result.applicableOrder?.isDemoRecord ?? false,
    })
  } catch (err: unknown) {
    console.error('QCO check error:', err)
    return serverError('Internal error checking QCO applicability')
  }
}
