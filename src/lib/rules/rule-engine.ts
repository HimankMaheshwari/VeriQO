import { prisma } from '../prisma'
import type { PrismaClient } from '@prisma/client'
import type {
  RuleEngineContext,
  RuleEvaluationResult,
  ViolationCandidate,
  EngineExecutionSummary,
  RuleResultStatus,
} from './types'
import {
  type RuleWithVersionsLike,
  selectHistoricalRuleVersion,
  evaluateRuleApplicability,
} from './applicability-evaluator'
import { evaluateConditionGroup } from './condition-evaluator'
import { buildRuleEngineContextFromDb } from './context-builder'

export interface RuleEngineOptions {
  client?: PrismaClient
  persist?: boolean
  inspectionId?: string
}

/**
 * Pure evaluation function: Evaluates a set of legal rules against a RuleEngineContext.
 *
 * Enforces Phase 3A constraints:
 * 1. Explicit historical RuleVersion selection based on packaging/manufacturing date.
 * 2. Complete audit trail in condition results.
 * 3. Formal Violation records generated strictly for 'FAIL'.
 *    'WARNING' remains an advisory compliance finding without a formal Violation.
 */
export function evaluateRules(
  context: RuleEngineContext,
  rules: RuleWithVersionsLike[]
): EngineExecutionSummary {
  const results: RuleEvaluationResult[] = []
  const violations: ViolationCandidate[] = []

  let passedCount = 0
  let warningCount = 0
  let failedCount = 0
  let notApplicableCount = 0
  let reviewCount = 0

  for (const rule of rules) {
    // 1. Historical RuleVersion selection
    const versionRes = selectHistoricalRuleVersion(
      rule,
      context.packagingDate,
      context.evaluatedAt
    )

    if (!versionRes.applicable) {
      notApplicableCount++
      results.push({
        ruleId: rule.id,
        ruleNumber: rule.ruleNumber,
        title: rule.title,
        versionNumber: versionRes.selectedVersionNumber,
        status: 'NOT_APPLICABLE',
        severity: rule.defaultSeverity ?? 'MEDIUM',
        summary: versionRes.notApplicableReason ?? 'Rule not applicable for this commodity date',
        applicable: false,
        notApplicableReason: versionRes.notApplicableReason,
        conditionResults: [],
        evidence: [],
      })
      continue
    }

    const effectiveRule = versionRes.ruleDefinition

    // 2. Applicability criteria and category check
    const applicabilityRes = evaluateRuleApplicability(effectiveRule, context)
    if (!applicabilityRes.applicable) {
      notApplicableCount++
      results.push({
        ruleId: effectiveRule.id,
        ruleNumber: effectiveRule.ruleNumber,
        title: effectiveRule.title,
        versionNumber: effectiveRule.versionNumber,
        status: 'NOT_APPLICABLE',
        severity: effectiveRule.defaultSeverity,
        summary: applicabilityRes.reason ?? 'Rule not applicable to commodity category/criteria',
        applicable: false,
        notApplicableReason: applicabilityRes.reason,
        conditionResults: [],
        evidence: [],
      })
      continue
    }

    // 3. Evaluate rule conditions
    const evalRes = evaluateConditionGroup(effectiveRule.conditions, context)

    let status: RuleResultStatus = 'PASS'
    let summary = `Complies with ${effectiveRule.ruleNumber}: ${effectiveRule.title}`

    if (evalRes.satisfied) {
      passedCount++
      status = 'PASS'
    } else {
      // Check if any condition failure was due to UNCLEAR or REQUIRES_REVIEW detection
      const hasUnclearOrReview = evalRes.results.some(
        (r) =>
          r.actualValue === null &&
          r.condition.field.startsWith('declarations.') &&
          context.declarations[r.condition.field.split('.')[1]?.toLowerCase()]?.detectionStatus ===
            'REQUIRES_REVIEW'
      )

      if (hasUnclearOrReview) {
        status = 'REQUIRES_REVIEW'
        reviewCount++
        summary = `Requires manual review for ${effectiveRule.ruleNumber}: declaration text is unclear or requires human verification`
      } else if (effectiveRule.defaultSeverity === 'LOW') {
        status = 'WARNING'
        warningCount++
        const failureDetails = Array.from(
          new Set(
            evalRes.results
              .filter((r) => !r.satisfied)
              .map((r) => r.message)
              .filter(Boolean)
          )
        ).join('; ')
        summary = `Advisory finding for ${effectiveRule.ruleNumber}: ${failureDetails || 'minor packaging discrepancy'}`
      } else {
        status = 'FAIL'
        failedCount++
        const failureDetails = Array.from(
          new Set(
            evalRes.results
              .filter((r) => !r.satisfied)
              .map((r) => r.message)
              .filter(Boolean)
          )
        ).join('; ')
        summary = `Non-compliant with ${effectiveRule.ruleNumber}: ${failureDetails || 'mandatory declaration requirement failed'}`
      }
    }

    // 4. Record evaluation result
    results.push({
      ruleId: effectiveRule.id,
      ruleNumber: effectiveRule.ruleNumber,
      title: effectiveRule.title,
      versionNumber: effectiveRule.versionNumber,
      status,
      severity: effectiveRule.defaultSeverity,
      summary,
      applicable: true,
      conditionResults: evalRes.results,
      evidence: evalRes.evidence,
      remediationGuidance: effectiveRule.remediationGuidance,
    })

    // 5. Statutory Violation generation: STRICTLY ONLY FOR 'FAIL'
    // 'WARNING' remains an advisory finding in results and does NOT create a formal Violation
    if (status === 'FAIL') {
      violations.push({
        ruleId: effectiveRule.id,
        ruleNumber: effectiveRule.ruleNumber,
        description: summary,
        severity: effectiveRule.defaultSeverity,
        remediationGuidance: effectiveRule.remediationGuidance,
        evidence: evalRes.evidence,
      })
    }
  }

  return {
    scanId: context.scanId,
    inspectionId: context.inspectionId,
    evaluatedAt: context.evaluatedAt,
    totalEvaluated: rules.length,
    passedCount,
    warningCount,
    failedCount,
    notApplicableCount,
    reviewCount,
    results,
    violations,
  }
}

/**
 * Persists EngineExecutionSummary results to PostgreSQL database via Prisma.
 */
export async function persistExecutionResults(
  summary: EngineExecutionSummary,
  options?: { client?: PrismaClient }
): Promise<{ complianceChecksCount: number; violationsCount: number; evidenceCount: number }> {
  const db = options?.client ?? prisma

  return await db.$transaction(async (tx) => {
    // 1. Delete prior automated checks and violations for this scan if re-evaluating
    await tx.complianceCheck.deleteMany({
      where: { scanId: summary.scanId },
    })
    await tx.violation.deleteMany({
      where: { scanId: summary.scanId },
    })

    // 2. Insert ComplianceCheck records
    let complianceChecksCount = 0
    for (const res of summary.results) {
      await tx.complianceCheck.create({
        data: {
          scanId: summary.scanId,
          inspectionId: summary.inspectionId ?? null,
          ruleId: res.ruleId,
          ruleVersionNumber: res.versionNumber,
          status: res.status,
          evaluationDetails: {
            summary: res.summary,
            applicable: res.applicable,
            notApplicableReason: res.notApplicableReason ?? null,
            conditionResults: res.conditionResults,
          } as any,
          evidence: res.evidence as any,
          checkedAt: summary.evaluatedAt,
        },
      })
      complianceChecksCount++
    }

    // 3. Insert formal Violation records (STRICTLY FOR 'FAIL')
    let violationsCount = 0
    let evidenceCount = 0

    for (const v of summary.violations) {
      const createdViolation = await tx.violation.create({
        data: {
          scanId: summary.scanId,
          inspectionId: summary.inspectionId ?? null,
          ruleId: v.ruleId,
          description: v.description,
          severity: v.severity,
          remediationGuidance: v.remediationGuidance ?? null,
          detectedAt: summary.evaluatedAt,
        },
      })
      violationsCount++

      // Create linked Evidence records if evidence items exist
      if (v.evidence && v.evidence.length > 0) {
        for (const ev of v.evidence) {
          await tx.evidence.create({
            data: {
              scanId: summary.scanId,
              inspectionId: summary.inspectionId ?? null,
              scanImageId: ev.imageId ?? null,
              extractedDeclarationId: ev.declarationId ?? null,
              type: ev.imageId ? 'SCAN_IMAGE' : 'EXTRACTED_TEXT',
              description: ev.description ?? `Non-compliance evidence for rule ${v.ruleNumber}`,
              confidence: ev.confidence ?? 0.8,
              metadata: {
                violationId: createdViolation.id,
                ruleId: v.ruleId,
                sourceText: ev.sourceText ?? null,
              },
            },
          })
          evidenceCount++
        }
      }
    }

    return { complianceChecksCount, violationsCount, evidenceCount }
  })
}

/**
 * High-level orchestration function:
 * Loads scan from database, loads active rules with versions, evaluates them deterministically,
 * and optionally persists the findings.
 */
export async function runScanRuleEngine(
  scanId: string,
  options?: RuleEngineOptions & { rules?: RuleWithVersionsLike[] }
): Promise<EngineExecutionSummary> {
  const db = options?.client ?? prisma

  // 1. Build context
  const context = await buildRuleEngineContextFromDb(scanId, {
    inspectionId: options?.inspectionId,
    client: db,
  })

  // 2. Fetch rules if not explicitly supplied
  let rulesToEvaluate: RuleWithVersionsLike[]
  if (options?.rules) {
    rulesToEvaluate = options.rules
  } else {
    const dbRules = await db.legalRule.findMany({
      where: { isActive: true },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    })
    rulesToEvaluate = dbRules as any
  }

  // 3. Pure deterministic evaluation
  const summary = evaluateRules(context, rulesToEvaluate)

  // 4. Optional persistence
  if (options?.persist !== false) {
    await persistExecutionResults(summary, { client: db })
  }

  return summary
}
