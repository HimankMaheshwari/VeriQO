import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import type {
  IQcoService,
  QualityControlOrderItem,
  QcoCheckInput,
  QcoCheckResult,
} from './types'
import { DEMO_QCOS } from './mock-data'

export class QualityControlOrderService implements IQcoService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Lists all active Quality Control Orders in force.
   */
  async listQcos(): Promise<QualityControlOrderItem[]> {
    try {
      const dbQcos = await this.db.qualityControlOrder.findMany({
        where: { status: 'IN_FORCE' },
        orderBy: { effectiveDate: 'desc' },
        include: { standard: true },
      })

      if (dbQcos.length > 0) {
        return dbQcos.map((q) => ({
          id: q.id,
          orderTitle: q.orderTitle,
          orderNumber: q.orderNumber,
          ministry: q.ministry,
          notifiedDate: q.notifiedDate.toISOString(),
          effectiveDate: q.effectiveDate.toISOString(),
          status: q.status,
          standardId: q.standardId,
          standardNumber: q.standard?.standardNumber ?? null,
          applicableProducts: q.applicableProducts,
          hsCodes: q.hsCodes as string[],
          isExemptionApplicable: q.isExemptionApplicable,
          exemptionDetails: q.exemptionDetails,
          gazetteUrl: q.gazetteUrl,
          isDemoRecord: q.isDemoRecord,
        }))
      }
    } catch {
      // Fall through to mock dataset
    }

    return DEMO_QCOS
  }

  /**
   * Checks whether a commodity category, product name, or HS code falls under mandatory BIS certification.
   */
  async checkQcoApplicability(input: QcoCheckInput): Promise<QcoCheckResult> {
    const qcos = await this.listQcos()
    const targetCategory = (input.category || '').toLowerCase().trim()
    const targetProduct = (input.productName || '').toLowerCase().trim()
    const targetHsCode = (input.hsCode || '').replace(/\s+/g, '').trim()

    for (const qco of qcos) {
      const productDesc = qco.applicableProducts.toLowerCase()
      const title = qco.orderTitle.toLowerCase()

      // Match by HS code
      if (targetHsCode && qco.hsCodes && qco.hsCodes.length > 0) {
        const hsMatch = qco.hsCodes.some((code) => targetHsCode.startsWith(code) || code.startsWith(targetHsCode))
        if (hsMatch) {
          return {
            isMandatoryCertification: true,
            applicableOrder: qco,
            applicableStandards: qco.standardNumber ? [qco.standardNumber] : [],
            effectiveDate: qco.effectiveDate,
            isExempt: false,
            guidance: `Mandatory BIS certification is required under ${qco.orderTitle} (${qco.orderNumber}). Goods must bear the Standard Mark (ISI mark) and cannot be manufactured, imported, or sold in India without a valid BIS license.`,
          }
        }
      }

      // Match by category or keywords
      const categoryTokens = targetCategory.split(/[\s,/]+/).filter((t) => t.length > 3)
      const productTokens = targetProduct.split(/[\s,/]+/).filter((t) => t.length > 3)
      const allTokens = Array.from(new Set([...categoryTokens, ...productTokens]))

      const isKeywordMatch = allTokens.some(
        (token) => productDesc.includes(token) || title.includes(token)
      )

      if (isKeywordMatch) {
        return {
          isMandatoryCertification: true,
          applicableOrder: qco,
          applicableStandards: qco.standardNumber ? [qco.standardNumber] : [],
          effectiveDate: qco.effectiveDate,
          isExempt: false,
          guidance: `Mandatory BIS certification applies under ${qco.orderTitle}. Products matching "${input.category}" must conform to ${qco.standardNumber || 'the applicable Indian Standard'} and bear the ISI mark.`,
        }
      }
    }

    return {
      isMandatoryCertification: false,
      applicableOrder: null,
      applicableStandards: [],
      effectiveDate: null,
      isExempt: false,
      guidance: `No active mandatory Quality Control Order (QCO) identified for category "${input.category}". Voluntary BIS certification or standard conformity may still apply.`,
    }
  }
}

export const defaultQualityControlOrderService = new QualityControlOrderService()
