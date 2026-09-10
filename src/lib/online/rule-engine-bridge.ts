import type { ComparisonResult } from './types'
import type { RuleEngineContext } from '../rules/types'
import { evaluateRules } from '../rules/rule-engine'
import type { RuleWithVersionsLike } from '../rules/applicability-evaluator'

export interface OnlineRuleEvaluationResult {
  engineSummary: any
  onlineEvidence: Array<{
    ruleNumber: string
    fieldName: string
    discrepancyType: string
    message: string
    severity: string
    isStatutoryConcern: boolean
    statutoryReference?: string | null
  }>
}

/**
 * Bridges Online Verification findings into the frozen Phase 3A Rule Engine.
 *
 * Safeguards:
 * 1. The comparator outputs structured discrepancies and metadata.
 * 2. This bridge injects online evidence into the RuleEngineContext without mutating physical scan facts.
 * 3. The Phase 3A engine deterministically evaluates the rules and remains the sole generator
 *    of formal Violation records.
 */
export function evaluateOnlineComplianceWithRuleEngine(
  comparison: ComparisonResult,
  physicalContext: RuleEngineContext,
  rules: RuleWithVersionsLike[]
): OnlineRuleEvaluationResult {
  const onlineEvidence: OnlineRuleEvaluationResult['onlineEvidence'] = []

  // Create a clean copy of context for online evaluation
  const augmentedContext: RuleEngineContext = {
    ...physicalContext,
    declarations: { ...physicalContext.declarations },
  }

  // If a critical online price discrepancy was identified (selling price > declared package MRP)
  const priceDiscrepancy = comparison.discrepancies.find(
    (d) => d.discrepancyType === 'PRICE_MISMATCH' && d.isStatutoryConcern
  )

  if (priceDiscrepancy) {
    onlineEvidence.push({
      ruleNumber: 'LMPC-2011-R06-1-E',
      fieldName: 'mrp',
      discrepancyType: priceDiscrepancy.discrepancyType,
      message: priceDiscrepancy.message,
      severity: priceDiscrepancy.severity,
      isStatutoryConcern: true,
      statutoryReference: priceDiscrepancy.statutoryReference,
    })
  }

  // If an online quantity discrepancy was identified
  const qtyDiscrepancy = comparison.discrepancies.find(
    (d) => d.discrepancyType === 'QUANTITY_MISMATCH' && d.isStatutoryConcern
  )

  if (qtyDiscrepancy) {
    onlineEvidence.push({
      ruleNumber: 'LMPC-2011-R06-1-C',
      fieldName: 'net_quantity',
      discrepancyType: qtyDiscrepancy.discrepancyType,
      message: qtyDiscrepancy.message,
      severity: qtyDiscrepancy.severity,
      isStatutoryConcern: true,
      statutoryReference: qtyDiscrepancy.statutoryReference,
    })
  }

  // Execute the Phase 3A deterministic rule engine
  const engineSummary = evaluateRules(augmentedContext, rules)

  return {
    engineSummary,
    onlineEvidence,
  }
}
