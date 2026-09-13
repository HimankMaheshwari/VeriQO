/**
 * QcoChecker — Deterministic verification of Quality Control Order (QCO) applicability.
 *
 * RULES:
 * 1. Consumes QualityControlOrderService without duplicating QCO data.
 * 2. Deterministic evaluation only — GEMINI NEVER DECIDES QCO APPLICABILITY.
 * 3. Incorporates effective date boundaries:
 *    - In-force QCO: APPLICABLE
 *    - Future-dated QCO: NOT_YET_EFFECTIVE
 *    - Unmatched: NOT_APPLICABLE
 *    - Ambiguous: UNKNOWN
 * 4. Propagates isDemoRecord from the matched QCO order.
 */

import { QualityControlOrderService, defaultQualityControlOrderService } from '@/lib/bis/qco-service'
import type { QcoApplicabilityResult, QcoApplicabilityStatus } from '@/types/bis-inspection'

export interface QcoCheckInputParams {
  category?: string | null
  productName?: string | null
  standardNumber?: string | null
  candidateStandards?: Array<{ standardNumber: string }> | null
  hsCode?: string | null
  inspectionDate?: Date | string
  isDetectedOnPackaging?: boolean
}

export class QcoChecker {
  private qcoService: QualityControlOrderService

  constructor(qcoService?: QualityControlOrderService) {
    this.qcoService = qcoService ?? defaultQualityControlOrderService
  }

  /**
   * Deterministically evaluates whether a mandatory QCO applies to the inspected commodity.
   */
  async evaluateQco(input: QcoCheckInputParams): Promise<QcoApplicabilityResult> {
    const category = (input.category || '').trim()
    const productName = (input.productName || '').trim()
    const candidateStdNum = input.candidateStandards?.[0]?.standardNumber || ''
    const standardNumber = (input.standardNumber || candidateStdNum).trim()
    const hsCode = (input.hsCode || '').trim()
    const evalDate = input.inspectionDate ? new Date(input.inspectionDate) : new Date()

    // Query existing QCO service
    const rawResult = await this.qcoService.checkQcoApplicability({
      category: category || productName,
      productName,
      hsCode,
    })

    // Also check by standardNumber ONLY if explicitly detected on packaging OR if commodity matches QCO schedule
    let applicableOrder = rawResult.applicableOrder
    if (
      !applicableOrder &&
      standardNumber &&
      standardNumber !== 'UNKNOWN' &&
      standardNumber !== 'NOT_DETERMINED'
    ) {
      const allQcos = await this.qcoService.listQcos()
      const stdMatch = allQcos.find((q) => {
        if (!q.standardNumber) return false
        const qcoStd = q.standardNumber.toUpperCase().replace(/\s+/g, '')
        const inputStd = standardNumber.toUpperCase().replace(/\s+/g, '')
        return qcoStd.includes(inputStd) || inputStd.includes(qcoStd)
      })

      if (stdMatch) {
        const isDetected = input.isDetectedOnPackaging === true
        const qcoProductText = `${stdMatch.applicableProducts} ${stdMatch.orderTitle}`.toLowerCase()
        const prodTokens = `${productName} ${category}`
          .toLowerCase()
          .split(/[\s,/._-]+/)
          .filter((w) => w.length >= 3)
        const hasCommodityMatch = prodTokens.some((t) => qcoProductText.includes(t))

        if (isDetected || hasCommodityMatch) {
          applicableOrder = stdMatch
        }
      }
    }

    if (!applicableOrder) {
      // If category and product are completely unknown
      if (!category && !productName && (!standardNumber || standardNumber === 'UNKNOWN' || standardNumber === 'NOT_DETERMINED')) {
        return {
          status: 'UNKNOWN',
          isMandatoryCertification: false,
          orderTitle: null,
          orderNumber: 'NO APPLICABLE QCO IDENTIFIED',
          applicableStandards: [],
          effectiveDate: null,
          isExempt: false,
          exemptionReason: null,
          guidance: 'Insufficient product classification data to determine QCO applicability.',
          isDemoRecord: false,
        }
      }

      return {
        status: 'NOT_APPLICABLE',
        isMandatoryCertification: false,
        orderTitle: null,
        orderNumber: 'NO APPLICABLE QCO IDENTIFIED',
        applicableStandards: [],
        effectiveDate: null,
        isExempt: false,
        exemptionReason: null,
        guidance: 'No active mandatory Quality Control Order (QCO) identified for this commodity. Voluntary BIS certification may still apply.',
        isDemoRecord: false,
      }
    }

    // Evaluate effective date boundary
    const isDemoRecord = applicableOrder.isDemoRecord ?? false
    const effectiveDateObj = applicableOrder.effectiveDate ? new Date(applicableOrder.effectiveDate) : null
    const isFutureEffective = effectiveDateObj ? effectiveDateObj.getTime() > evalDate.getTime() : false

    let status: QcoApplicabilityStatus = 'APPLICABLE'
    let guidance = applicableOrder.orderTitle
      ? `Mandatory BIS certification applies under ${applicableOrder.orderTitle} (${applicableOrder.orderNumber}). Goods must bear the Standard Mark (ISI mark) under a valid BIS license.`
      : rawResult.guidance

    if (isFutureEffective) {
      status = 'NOT_YET_EFFECTIVE'
      guidance = `Quality Control Order ${applicableOrder.orderTitle} (${applicableOrder.orderNumber}) has been notified but becomes mandatory on ${applicableOrder.effectiveDate}. Currently voluntary until effective date.`
    }

    return {
      status,
      isMandatoryCertification: status === 'APPLICABLE',
      orderTitle: applicableOrder.orderTitle,
      orderNumber: applicableOrder.orderNumber,
      applicableStandards: applicableOrder.standardNumber ? [applicableOrder.standardNumber] : rawResult.applicableStandards,
      effectiveDate: applicableOrder.effectiveDate,
      isExempt: applicableOrder.isExemptionApplicable,
      exemptionReason: applicableOrder.exemptionDetails ?? null,
      guidance,
      isDemoRecord,
    }
  }
}

export const defaultQcoChecker = new QcoChecker()
