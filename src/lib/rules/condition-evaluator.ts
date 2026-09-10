import type {
  RuleCondition,
  RuleConditionGroup,
  RuleEngineContext,
  ConditionEvaluationResult,
  RuleEvidenceItem,
  ExtractedFieldSnapshot,
} from './types'
import { isConditionGroup } from './types'
import { evaluateOperator } from './operators'

/**
 * Resolves a field reference path against RuleEngineContext.
 *
 * Supported paths:
 * - "declarations.<fieldKey>" -> returns normalizedValue ?? rawValue (or null if not found/NOT_DETECTED)
 * - "declarations.<fieldKey>.<prop>" -> returns snapshot property (e.g. rawValue, normalizedValue, detectionStatus, confidence)
 * - "product.<prop>" -> returns context.product[prop] (e.g. name, brand, category, manufacturer)
 * - "packagingDate" -> returns context.packagingDate
 * - "scanId" -> returns context.scanId
 * - Arbitrary nested paths (e.g. "product.category")
 */
export function resolveFieldValue(path: string, context: RuleEngineContext): any {
  if (!path || !context) return undefined

  const parts = path.split('.')

  // Direct context top-level properties
  if (parts[0] === 'context') {
    parts.shift()
  }

  if (parts[0] === 'declarations') {
    const fieldKey = parts[1]?.toLowerCase()
    if (!fieldKey) return undefined

    // Find in declarations map (case-insensitive key lookup)
    const snapshotKey = Object.keys(context.declarations).find(
      (k) => k.toLowerCase() === fieldKey
    )
    const snapshot: ExtractedFieldSnapshot | undefined = snapshotKey
      ? context.declarations[snapshotKey]
      : undefined

    if (!snapshot) return null

    // If a sub-property is requested (e.g., declarations.mrp.rawValue, declarations.mrp.sourceEvidence)
    if (parts.length > 2) {
      const prop = parts[2]
      if (prop === 'sourceEvidence') {
        return snapshot.sourceText || snapshot.rawValue || null
      }
      return (snapshot as any)[prop] ?? null
    }

    // Default shorthand: prefer normalizedValue, fallback to rawValue if detected
    if (snapshot.detectionStatus === 'NOT_DETECTED') {
      return null
    }
    return snapshot.normalizedValue ?? snapshot.rawValue ?? null
  }

  // Handle product properties
  if (parts[0] === 'product') {
    const prop = parts[1]
    if (!prop) return context.product
    return (context.product as any)?.[prop] ?? null
  }

  // Handle packaging date
  if (parts[0] === 'packagingDate') {
    return context.packagingDate ?? null
  }

  // General path traversal fallback
  let current: any = context
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }

  return current
}

/**
 * Extracts relevant evidence items for a given condition and context.
 */
export function extractConditionEvidence(
  condition: RuleCondition,
  context: RuleEngineContext
): RuleEvidenceItem[] {
  const evidence: RuleEvidenceItem[] = []
  const parts = condition.field.split('.')

  if (parts[0] === 'declarations') {
    const fieldKey = parts[1]?.toLowerCase()
    if (fieldKey) {
      const snapshotKey = Object.keys(context.declarations).find(
        (k) => k.toLowerCase() === fieldKey
      )
      const snapshot = snapshotKey ? context.declarations[snapshotKey] : undefined
      if (snapshot && snapshot.declarationId) {
        evidence.push({
          declarationId: snapshot.declarationId,
          imageId: snapshot.scanImageId,
          sourceText: snapshot.sourceText ?? undefined,
          confidence: snapshot.confidence,
          description: `Field '${snapshot.fieldName}' evaluated with status '${snapshot.detectionStatus}'`,
        })
      }
    }
  }

  return evidence
}

/**
 * Evaluates a single atomic RuleCondition against the context.
 */
export function evaluateCondition(
  condition: RuleCondition,
  context: RuleEngineContext
): ConditionEvaluationResult {
  const actualValue = resolveFieldValue(condition.field, context)
  const satisfied = evaluateOperator(
    condition.operator,
    actualValue,
    condition.value,
    condition.params
  )

  let message: string | undefined
  if (!satisfied) {
    message =
      condition.failureMessage ??
      `Condition failed: '${condition.field}' (${JSON.stringify(actualValue)}) ${condition.operator} ${
        condition.value !== undefined ? JSON.stringify(condition.value) : ''
      }`
  }

  return {
    condition,
    satisfied,
    actualValue,
    message,
  }
}

/**
 * Recursively evaluates a RuleConditionGroup against the context.
 * Performs full evaluation to collect complete diagnostic messages.
 */
export function evaluateConditionGroup(
  group: RuleConditionGroup,
  context: RuleEngineContext
): { satisfied: boolean; results: ConditionEvaluationResult[]; evidence: RuleEvidenceItem[] } {
  const results: ConditionEvaluationResult[] = []
  const evidence: RuleEvidenceItem[] = []

  if (!group.conditions || group.conditions.length === 0) {
    return { satisfied: true, results, evidence }
  }

  const childSatisfaction: boolean[] = []

  for (const item of group.conditions) {
    if (isConditionGroup(item)) {
      const childGroupResult = evaluateConditionGroup(item, context)
      childSatisfaction.push(childGroupResult.satisfied)
      results.push(...childGroupResult.results)
      evidence.push(...childGroupResult.evidence)
    } else {
      const condResult = evaluateCondition(item, context)
      childSatisfaction.push(condResult.satisfied)
      results.push(condResult)
      if (!condResult.satisfied) {
        evidence.push(...extractConditionEvidence(item, context))
      }
    }
  }

  const satisfied =
    group.operator === 'AND'
      ? childSatisfaction.every(Boolean)
      : childSatisfaction.some(Boolean)

  return {
    satisfied,
    results,
    evidence,
  }
}
