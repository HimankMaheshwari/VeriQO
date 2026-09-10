import type {
  MachineReadableRule,
  RuleEngineContext,
} from './types'
import { evaluateConditionGroup } from './condition-evaluator'

export interface RuleVersionLike {
  id?: string
  ruleId?: string
  versionNumber: number
  changeDescription?: string
  effectiveDate: Date
  expiryDate?: Date | null
  snapshot?: any
}

export interface RuleWithVersionsLike {
  id: string
  ruleNumber: string
  title: string
  requirement: string
  applicability?: string | null
  productCategoryId?: string | null
  conditions?: any
  exceptions?: any
  defaultSeverity?: any
  ruleCategory?: string | null
  remediationGuidance?: string | null
  sourceDocument: string
  sourceReference?: string | null
  effectiveDate: Date
  expiryDate?: Date | null
  versions?: RuleVersionLike[]
}

export interface HistoricalRuleVersionResolution {
  applicable: boolean
  notApplicableReason?: string
  selectedVersionNumber: number
  ruleDefinition: MachineReadableRule
}

/**
 * Normalizes a database or snapshot rule object into a typed MachineReadableRule.
 */
export function normalizeRuleDefinition(
  baseRule: RuleWithVersionsLike,
  versionNumber: number,
  snapshotOverride?: any
): MachineReadableRule {
  const snapshot = snapshotOverride || {}

  return {
    id: baseRule.id ?? baseRule.ruleNumber,
    ruleNumber: snapshot.ruleNumber ?? baseRule.ruleNumber,
    title: snapshot.title ?? baseRule.title,
    requirement: snapshot.requirement ?? baseRule.requirement,
    applicability: snapshot.applicability ?? baseRule.applicability,
    ruleCategory: snapshot.ruleCategory ?? baseRule.ruleCategory,
    defaultSeverity: snapshot.defaultSeverity ?? baseRule.defaultSeverity ?? 'MEDIUM',
    productCategoryId: snapshot.productCategoryId ?? baseRule.productCategoryId,
    applicabilityCriteria: snapshot.applicabilityCriteria ?? (baseRule as any).applicabilityCriteria ?? null,
    conditions: snapshot.conditions ?? baseRule.conditions ?? { operator: 'AND', conditions: [] },
    exceptions: snapshot.exceptions ?? baseRule.exceptions ?? [],
    remediationGuidance: snapshot.remediationGuidance ?? baseRule.remediationGuidance ?? null,
    sourceDocument: snapshot.sourceDocument ?? baseRule.sourceDocument,
    sourceReference: snapshot.sourceReference ?? baseRule.sourceReference,
    effectiveDate: new Date(snapshot.effectiveDate ?? baseRule.effectiveDate),
    expiryDate: snapshot.expiryDate
      ? new Date(snapshot.expiryDate)
      : baseRule.expiryDate
      ? new Date(baseRule.expiryDate)
      : null,
    versionNumber,
  }
}

/**
 * Selects the historical RuleVersion in effect at the legally relevant date
 * (e.g. packaging date or manufacturing date).
 *
 * Statutory Rule Selection Logic:
 * 1. If commodity has a legally relevant date D:
 *    - Search versions with effectiveDate <= D.
 *    - Ensure version was not expired at D (expiryDate === null || expiryDate >= D).
 *    - Select version with most recent effectiveDate <= D (highest versionNumber on ties).
 *    - If no version was effective at D (commodity predates rule enactment), rule is NOT applicable.
 * 2. If commodity has no packing/manufacturing date:
 *    - Default to evaluation timestamp (now).
 *    - Select the active version in effect today.
 */
export function selectHistoricalRuleVersion(
  rule: RuleWithVersionsLike,
  legallyRelevantDate: Date | null | undefined,
  evaluationDate: Date = new Date()
): HistoricalRuleVersionResolution {
  const targetDate = legallyRelevantDate ?? evaluationDate

  // If the rule has historical versions recorded
  if (rule.versions && rule.versions.length > 0) {
    // Sort versions descending by effectiveDate, then versionNumber
    const sorted = [...rule.versions].sort((a, b) => {
      const diff = new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
      if (diff !== 0) return diff
      return b.versionNumber - a.versionNumber
    })

    // Find version in effect on targetDate
    const eligibleVersion = sorted.find((v) => {
      const eff = new Date(v.effectiveDate)
      const exp = v.expiryDate ? new Date(v.expiryDate) : null
      const isEffective = eff <= targetDate
      const isNotExpired = !exp || exp >= targetDate
      return isEffective && isNotExpired
    })

    if (eligibleVersion) {
      const ruleDef = normalizeRuleDefinition(
        rule,
        eligibleVersion.versionNumber,
        eligibleVersion.snapshot
      )
      return {
        applicable: true,
        selectedVersionNumber: eligibleVersion.versionNumber,
        ruleDefinition: ruleDef,
      }
    }

    // Check if the targetDate strictly predates all versions
    const earliest = sorted[sorted.length - 1]
    if (new Date(earliest.effectiveDate) > targetDate) {
      return {
        applicable: false,
        notApplicableReason: `Rule '${rule.ruleNumber}' was not yet in effect on product packing/manufacturing date (${targetDate.toISOString().slice(0, 10)})`,
        selectedVersionNumber: earliest.versionNumber,
        ruleDefinition: normalizeRuleDefinition(rule, earliest.versionNumber, earliest.snapshot),
      }
    }
  }

  // Fallback to base rule definition if no version array
  const eff = new Date(rule.effectiveDate)
  const exp = rule.expiryDate ? new Date(rule.expiryDate) : null

  if (eff > targetDate) {
    return {
      applicable: false,
      notApplicableReason: `Rule '${rule.ruleNumber}' was not yet in effect on product packing/manufacturing date (${targetDate.toISOString().slice(0, 10)})`,
      selectedVersionNumber: 1,
      ruleDefinition: normalizeRuleDefinition(rule, 1),
    }
  }

  if (exp && exp < targetDate) {
    return {
      applicable: false,
      notApplicableReason: `Rule '${rule.ruleNumber}' had expired prior to product packing/manufacturing date (${targetDate.toISOString().slice(0, 10)})`,
      selectedVersionNumber: 1,
      ruleDefinition: normalizeRuleDefinition(rule, 1),
    }
  }

  return {
    applicable: true,
    selectedVersionNumber: 1,
    ruleDefinition: normalizeRuleDefinition(rule, 1),
  }
}

import { extractNumeric } from './operators'

/**
 * Identifies whether a rule belongs to Chapter II of the Legal Metrology
 * (Packaged Commodities) Rules, 2011 (Provisions applicable to packages intended for retail sale).
 */
export function isChapterIIRule(rule: MachineReadableRule | RuleWithVersionsLike): boolean {
  if ((rule as any).chapter === 'CHAPTER_II') return true
  const ref = (rule.sourceReference || '').toLowerCase()
  if (ref.includes('chapter ii')) return true

  // Rules 3 to 23 of LMPC Rules, 2011 comprise Chapter II
  if (
    ref.includes('rule 6') ||
    ref.includes('rule 7') ||
    ref.includes('rule 8') ||
    ref.includes('rule 9') ||
    ref.includes('rule 10') ||
    ref.includes('rule 11') ||
    ref.includes('rule 12') ||
    ref.includes('rule 13')
  ) {
    return true
  }

  if (rule.ruleNumber.startsWith('LMPC-2011-R0') || rule.ruleNumber.startsWith('LMPC-2011-R1')) {
    return true
  }

  return false
}

/**
 * Centralized Rule 3 Chapter II Applicability Gate.
 *
 * Statutory Rule:
 * "3. Application of Chapter.—The provisions of this chapter shall not apply to,—
 *  (a) packages of commodities containing quantity of more than 25 kg or 25 litre
 *      excluding cement and fertilizer sold in bags up to 50 kg; and
 *  (b) packaged commodities meant for industrial consumers or institutional consumers."
 */
export function evaluateChapterIIApplicability(
  context: RuleEngineContext
): { applicable: boolean; reason?: string } {
  // Rule 3(b): Industrial or Institutional Consumers
  if (
    context.isIndustrialOrInstitutional === true ||
    context.consumerType === 'INDUSTRIAL' ||
    context.consumerType === 'INSTITUTIONAL' ||
    context.product.isIndustrialOrInstitutional === true
  ) {
    return {
      applicable: false,
      reason: 'Exempt under Rule 3(b): Packaged commodity is meant for industrial or institutional consumers',
    }
  }

  // Rule 3(a): Large quantity threshold (>25kg or >25L, cement/fertilizer up to 50kg)
  const netQtyDecl = context.declarations['net_quantity']
  if (netQtyDecl && netQtyDecl.detectionStatus !== 'NOT_DETECTED') {
    const rawQty = netQtyDecl.rawValue || ''
    const normQty = netQtyDecl.normalizedValue || ''
    const combinedText = `${rawQty} ${normQty}`.trim()
    const isKgOrL = /\b(kg|kilos?|kilograms?|l|ltrs?|litres?)\b/i.test(combinedText)

    if (isKgOrL) {
      const num = extractNumeric(combinedText)
      if (num !== null && num > 0) {
        const category = (context.product.category || '').toLowerCase()
        const name = (context.product.name || '').toLowerCase()
        const isCementOrFertilizer =
          category.includes('cement') ||
          category.includes('fertilizer') ||
          name.includes('cement') ||
          name.includes('fertilizer')

        if (isCementOrFertilizer) {
          if (num > 50) {
            return {
              applicable: false,
              reason: 'Exempt under Rule 3(a): Cement or fertilizer package net quantity exceeds 50 kg',
            }
          }
        } else {
          if (num > 25) {
            return {
              applicable: false,
              reason: 'Exempt under Rule 3(a): Package net quantity exceeds 25 kg or 25 litre',
            }
          }
        }
      }
    }
  }

  return { applicable: true }
}

/**
 * Centralized Rule 26(a) Small Package Exemption Gate.
 *
 * Statutory Rule:
 * "26. Exemption in respect of certain packages.—Nothing in these rules shall apply to the package containing:—
 *  (a) packages containing commodities and the net weight or measure of the commodity is ten gram or ten millilitre or less, if sold by weight or measure;
 *      Provided that the provisions of this clause shall not apply to packages containing tobacco and tobacco products;
 *      Provided further that the provisions of this clause shall not apply to pan masala."
 *
 * Amendment History:
 * - Omission of draft Proviso 1 (which required MRP/Mfd/Date on <=10g): G.S.R. 784(E) w.e.f. 01/07/2012.
 * - Insertion of Tobacco exclusion: G.S.R. 385(E) dated 14/05/2015.
 * - Insertion of Pan Masala exclusion: G.S.R. 881(E) dated 02/12/2025 w.e.f. 01/02/2026.
 */
export function evaluateRule26SmallPackageExemption(
  context: RuleEngineContext
): { exempt: boolean; reason?: string } {
  const netQtyDecl = context.declarations['net_quantity']
  if (!netQtyDecl || netQtyDecl.detectionStatus === 'NOT_DETECTED') {
    return { exempt: false }
  }

  const rawQty = netQtyDecl.rawValue || ''
  const normQty = netQtyDecl.normalizedValue || ''
  const combinedText = `${rawQty} ${normQty}`.trim()

  const isGOrMl =
    /\b(\d+(\.\d+)?)\s*(g|gm|grams?|ml|milli-?litres?)\b/i.test(combinedText) ||
    (/\b(g|gm|grams?|ml|milli-?litres?)\b/i.test(combinedText) && extractNumeric(combinedText) !== null)

  if (isGOrMl) {
    const num = extractNumeric(combinedText)
    if (num !== null && num > 0 && num <= 10) {
      const category = (context.product.category || '').toLowerCase()
      const name = (context.product.name || '').toLowerCase()

      // G.S.R. 385(E): Tobacco and tobacco products are excluded from small package exemption
      const isTobacco =
        /tobacco|bidi|beedi|cigarette|cigar|gutkha|snuff/i.test(category) ||
        /tobacco|bidi|beedi|cigarette|cigar|gutkha|snuff/i.test(name)

      if (isTobacco) {
        return { exempt: false }
      }

      // G.S.R. 881(E): Pan Masala excluded from small package exemption w.e.f. 01/02/2026
      const isPanMasala = /pan\s*masala/i.test(category) || /pan\s*masala/i.test(name)
      if (isPanMasala) {
        const relevantDate = context.packagingDate ?? context.evaluatedAt
        if (relevantDate >= new Date('2026-02-01T00:00:00.000Z')) {
          return { exempt: false }
        }
      }

      return {
        exempt: true,
        reason: 'Exempt under Rule 26(a): Package net weight or measure is 10g or 10ml or less',
      }
    }
  }

  return { exempt: false }
}

/**
 * Evaluates whether a machine-readable rule is applicable to a given RuleEngineContext.
 *
 * Evaluation steps:
 * 1. Centralized Rule 3 Chapter II Applicability Gate (for all Chapter II rules).
 * 2. Centralized Rule 26(a) Small Package Exemption Gate (for all Chapter II rules).
 * 3. Commodity Category Hierarchy Match.
 * 4. Rule-Specific Applicability Criteria (e.g. imported commodities).
 * 5. Statutory Exceptions defined on individual rules.
 */
export function evaluateRuleApplicability(
  rule: MachineReadableRule,
  context: RuleEngineContext
): { applicable: boolean; reason?: string } {
  // 1 & 2: Centralized Chapter II and Rule 26(a) gates
  if (isChapterIIRule(rule)) {
    // Centralized Rule 3 Chapter II Gate
    const chapterIIGate = evaluateChapterIIApplicability(context)
    if (!chapterIIGate.applicable) {
      return {
        applicable: false,
        reason: chapterIIGate.reason,
      }
    }

    // Centralized Rule 26(a) Gate (with G.S.R. 385(E) tobacco and G.S.R. 881(E) pan masala exclusions)
    const rule26Gate = evaluateRule26SmallPackageExemption(context)
    if (rule26Gate.exempt) {
      return {
        applicable: false,
        reason: rule26Gate.reason,
      }
    }
  }

  // 3. Category check
  if (rule.productCategoryId) {
    const productCategory = context.product.category?.trim().toLowerCase()
    const ruleCategory = rule.productCategoryId.trim().toLowerCase()

    if (productCategory && productCategory !== ruleCategory) {
      return {
        applicable: false,
        reason: `Commodity category '${context.product.category}' does not match rule category requirement '${rule.productCategoryId}'`,
      }
    }
  }

  // 4. Applicability criteria check
  if (rule.applicabilityCriteria && rule.applicabilityCriteria.conditions.length > 0) {
    const criteriaEval = evaluateConditionGroup(rule.applicabilityCriteria, context)
    if (!criteriaEval.satisfied) {
      return {
        applicable: false,
        reason: 'Commodity does not meet rule applicability criteria',
      }
    }
  }

  // 5. Custom exceptions check
  if (rule.exceptions && rule.exceptions.length > 0) {
    for (const excGroup of rule.exceptions) {
      const excEval = evaluateConditionGroup(excGroup, context)
      if (excEval.satisfied) {
        return {
          applicable: false,
          reason: 'Commodity qualifies for statutory exemption under rule exceptions',
        }
      }
    }
  }

  return { applicable: true }
}
