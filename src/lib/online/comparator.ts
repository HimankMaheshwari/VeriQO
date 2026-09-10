import type { MatchStatus, ViolationSeverity } from '@prisma/client'
import type {
  NormalizedOnlineListing,
  ComparisonResult,
  DiscrepancyItem,
  OnlineDiscrepancyType,
} from './types'
import type { RuleEngineContext } from '../rules/types'
import { normalizeEntityName, normalizeCountry } from './normalizer'

/**
 * Pure Comparator: Compares normalized online listing against physical packaging declarations.
 *
 * Mandated Safeguards:
 * 1. The comparator only computes: MATCH, MISMATCH, UNVERIFIED.
 * 2. It attaches structured evidence and flags 'isStatutoryConcern: boolean'.
 * 3. It NEVER creates formal legal violations directly. Formal violations remain the sole
 *    responsibility of the Phase 3A deterministic Legal Metrology Rule Engine.
 */
export function comparePhysicalVsOnline(
  onlineListing: NormalizedOnlineListing,
  physicalContext: RuleEngineContext
): ComparisonResult {
  const discrepancies: DiscrepancyItem[] = []
  const matchedFields: string[] = []
  const unverifiedFields: string[] = []

  const physicalDecls = physicalContext.declarations

  // ─────────────────────────────────────────────────────────────
  // 1. MRP & Selling Price Comparison
  // ─────────────────────────────────────────────────────────────
  const physicalMrpDecl = physicalDecls['mrp']
  if (physicalMrpDecl && physicalMrpDecl.detectionStatus !== 'NOT_DETECTED') {
    const physicalMrpNum = physicalMrpDecl.normalizedValue
      ? parseFloat(physicalMrpDecl.normalizedValue)
      : null

    if (physicalMrpNum && physicalMrpNum > 0) {
      // Check 1A: Online Selling Price vs Physical MRP
      if (onlineListing.sellingPrice) {
        const onlineSellingNum = onlineListing.sellingPrice.numericValue

        if (onlineSellingNum > physicalMrpNum) {
          const markupRatio = Math.round((onlineSellingNum / physicalMrpNum) * 100) / 100
          discrepancies.push({
            fieldName: 'mrp',
            discrepancyType: 'PRICE_MISMATCH',
            severity: 'CRITICAL',
            physicalValue: `₹ ${physicalMrpNum.toFixed(2)}`,
            onlineValue: onlineListing.sellingPrice.formatted,
            discrepancyRatio: markupRatio,
            message: `Online selling price (${onlineListing.sellingPrice.formatted}) exceeds physical packaging declared MRP (₹ ${physicalMrpNum.toFixed(2)}). Potential overcharging concern under Legal Metrology Act, 2009.`,
            isStatutoryConcern: true,
            statutoryReference: 'Section 18 & Section 36(1) of the Legal Metrology Act, 2009',
          })
        }
      }

      // Check 1B: Online Stated MRP vs Physical Package MRP
      if (onlineListing.mrp) {
        const onlineMrpNum = onlineListing.mrp.numericValue
        const diff = Math.abs(onlineMrpNum - physicalMrpNum)

        if (diff > 0.01) {
          discrepancies.push({
            fieldName: 'mrp',
            discrepancyType: 'PRICE_MISMATCH',
            severity: 'HIGH',
            physicalValue: `₹ ${physicalMrpNum.toFixed(2)}`,
            onlineValue: onlineListing.mrp.formatted,
            discrepancyRatio: Math.round((onlineMrpNum / physicalMrpNum) * 100) / 100,
            message: `Online listed MRP (${onlineListing.mrp.formatted}) does not match physical package MRP (₹ ${physicalMrpNum.toFixed(2)}).`,
            isStatutoryConcern: true,
            statutoryReference: 'Rule 6(1)(e) & Rule 6(10) of LMPC Rules, 2011',
          })
        } else {
          matchedFields.push('mrp')
        }
      } else if (!onlineListing.sellingPrice) {
        unverifiedFields.push('mrp')
      }
    }
  } else {
    unverifiedFields.push('mrp')
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Net Quantity Comparison
  // ─────────────────────────────────────────────────────────────
  const physicalQtyDecl = physicalDecls['net_quantity']
  if (physicalQtyDecl && physicalQtyDecl.detectionStatus !== 'NOT_DETECTED') {
    const physRaw = physicalQtyDecl.rawValue || physicalQtyDecl.normalizedValue || ''

    if (onlineListing.netQuantity) {
      let isMatch = false

      // Exact display match
      if (
        physRaw.toLowerCase().includes(onlineListing.netQuantity.standardDisplay.toLowerCase()) ||
        onlineListing.netQuantity.raw.toLowerCase().includes(physRaw.toLowerCase())
      ) {
        isMatch = true
      }

      // Base grams / ml comparison (e.g. 1 kg vs 1000 g)
      if (
        !isMatch &&
        onlineListing.netQuantity.baseGramsOrMl !== null &&
        onlineListing.netQuantity.baseGramsOrMl !== undefined
      ) {
        const physNumMatch = physRaw.match(/\b(\d+(\.\d+)?)\s*(kg|kilos?|g|gm|l|ltrs?|ml)\b/i)
        if (physNumMatch) {
          const val = parseFloat(physNumMatch[1])
          const u = physNumMatch[3].toLowerCase()
          let physBase: number | null = null
          if (u.startsWith('k') || (u.startsWith('l') && !u.startsWith('m'))) physBase = val * 1000
          else physBase = val

          if (Math.abs(physBase - onlineListing.netQuantity.baseGramsOrMl) < 0.01) {
            isMatch = true
          }
        }
      }

      if (isMatch) {
        matchedFields.push('net_quantity')
      } else {
        discrepancies.push({
          fieldName: 'net_quantity',
          discrepancyType: 'QUANTITY_MISMATCH',
          severity: 'HIGH',
          physicalValue: physRaw,
          onlineValue: onlineListing.netQuantity.standardDisplay,
          message: `Online listed net quantity (${onlineListing.netQuantity.standardDisplay}) differs from physical package declaration (${physRaw}).`,
          isStatutoryConcern: true,
          statutoryReference: 'Rule 6(1)(c) & Rule 6(10) of LMPC Rules, 2011',
        })
      }
    } else {
      unverifiedFields.push('net_quantity')
      // Flag missing online quantity under Rule 6(10)
      discrepancies.push({
        fieldName: 'net_quantity',
        discrepancyType: 'MISSING_ONLINE_MANDATORY_DECLARATION',
        severity: 'MEDIUM',
        physicalValue: physRaw,
        onlineValue: null,
        message: 'Mandatory net quantity declaration is missing from online product listing.',
        isStatutoryConcern: true,
        statutoryReference: 'Rule 6(10) of LMPC Rules, 2011 (vide G.S.R. 629(E))',
      })
    }
  } else {
    unverifiedFields.push('net_quantity')
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Country of Origin Comparison
  // ─────────────────────────────────────────────────────────────
  const physicalOriginDecl = physicalDecls['country_of_origin']
  if (physicalOriginDecl && physicalOriginDecl.detectionStatus !== 'NOT_DETECTED') {
    const physOrigin = normalizeCountry(
      physicalOriginDecl.normalizedValue || physicalOriginDecl.rawValue
    )

    if (onlineListing.countryOfOrigin) {
      if (physOrigin && physOrigin.toLowerCase() === onlineListing.countryOfOrigin.toLowerCase()) {
        matchedFields.push('country_of_origin')
      } else {
        discrepancies.push({
          fieldName: 'country_of_origin',
          discrepancyType: 'ORIGIN_MISMATCH',
          severity: 'MEDIUM',
          physicalValue: physOrigin || physicalOriginDecl.rawValue,
          onlineValue: onlineListing.countryOfOrigin,
          message: `Online country of origin (${onlineListing.countryOfOrigin}) does not match physical package origin (${physOrigin || physicalOriginDecl.rawValue}).`,
          isStatutoryConcern: true,
          statutoryReference: 'Rule 6(1)(da) & Rule 6(10) of LMPC Rules, 2011',
        })
      }
    } else {
      unverifiedFields.push('country_of_origin')
      discrepancies.push({
        fieldName: 'country_of_origin',
        discrepancyType: 'MISSING_ONLINE_MANDATORY_DECLARATION',
        severity: 'MEDIUM',
        physicalValue: physOrigin || physicalOriginDecl.rawValue,
        onlineValue: null,
        message: 'Mandatory Country of Origin declaration is missing from online listing.',
        isStatutoryConcern: true,
        statutoryReference: 'Rule 6(1)(da) & Rule 6(10) of LMPC Rules, 2011',
      })
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Manufacturer / Packer / Importer Comparison
  // ─────────────────────────────────────────────────────────────
  const physMfrDecl =
    physicalDecls['manufacturer'] || physicalDecls['packer'] || physicalDecls['importer']
  if (physMfrDecl && physMfrDecl.detectionStatus !== 'NOT_DETECTED') {
    const physMfrClean = normalizeEntityName(
      physMfrDecl.normalizedValue || physMfrDecl.rawValue
    )

    const onlineMfr =
      onlineListing.manufacturer || onlineListing.packer || onlineListing.importer

    if (onlineMfr && physMfrClean) {
      const pTokens = physMfrClean.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
      const oTokens = onlineMfr.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

      const shared = pTokens.filter((t) => oTokens.includes(t))
      if (shared.length > 0 || physMfrClean.toLowerCase().includes(onlineMfr.toLowerCase()) || onlineMfr.toLowerCase().includes(physMfrClean.toLowerCase())) {
        matchedFields.push('manufacturer')
      } else {
        discrepancies.push({
          fieldName: 'manufacturer',
          discrepancyType: 'MANUFACTURER_MISMATCH',
          severity: 'MEDIUM',
          physicalValue: physMfrClean,
          onlineValue: onlineMfr,
          message: `Online declared manufacturer/packer (${onlineMfr}) differs from packaging declaration (${physMfrClean}).`,
          isStatutoryConcern: false,
          statutoryReference: 'Rule 6(1)(a) & Rule 6(10) of LMPC Rules, 2011',
        })
      }
    } else if (!onlineMfr) {
      unverifiedFields.push('manufacturer')
      discrepancies.push({
        fieldName: 'manufacturer',
        discrepancyType: 'MISSING_ONLINE_MANDATORY_DECLARATION',
        severity: 'MEDIUM',
        physicalValue: physMfrClean || physMfrDecl.rawValue,
        onlineValue: null,
        message: 'Manufacturer/Packer/Importer identity is not declared on online listing.',
        isStatutoryConcern: true,
        statutoryReference: 'Rule 6(1)(a) & Rule 6(10) of LMPC Rules, 2011',
      })
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Generic Name Comparison
  // ─────────────────────────────────────────────────────────────
  const physNameDecl = physicalDecls['product_name']
  if (physNameDecl && physNameDecl.detectionStatus !== 'NOT_DETECTED') {
    const pName = (physNameDecl.normalizedValue || physNameDecl.rawValue || '').toLowerCase()
    const oName = (onlineListing.genericName || onlineListing.title || '').toLowerCase()

    if (oName) {
      const pTokens = pName.split(/\s+/).filter((t) => t.length > 2)
      const matches = pTokens.filter((t) => oName.includes(t))
      if (matches.length > 0) {
        matchedFields.push('generic_name')
      } else {
        discrepancies.push({
          fieldName: 'generic_name',
          discrepancyType: 'GENERIC_NAME_MISMATCH',
          severity: 'LOW',
          physicalValue: physNameDecl.rawValue,
          onlineValue: onlineListing.genericName || onlineListing.title,
          message: `Online product title/generic name does not appear to match physical commodity name (${physNameDecl.rawValue}).`,
          isStatutoryConcern: false,
        })
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Overall Match Status Calculation
  // ─────────────────────────────────────────────────────────────
  let overallMatchStatus: MatchStatus = 'UNVERIFIED'
  const mismatchCount = discrepancies.filter((d) => d.discrepancyType !== 'MISSING_ONLINE_MANDATORY_DECLARATION').length
  const matchCount = matchedFields.length

  if (mismatchCount > 0) {
    overallMatchStatus = 'MISMATCH'
  } else if (matchCount > 0) {
    overallMatchStatus = 'MATCH'
  }

  let summary = ''
  if (overallMatchStatus === 'MATCH') {
    summary = `Online listing verified against packaging declarations with ${matchCount} matching attributes and 0 critical discrepancies.`
  } else if (overallMatchStatus === 'MISMATCH') {
    summary = `Identified ${discrepancies.length} discrepancy(ies) between online listing and physical packaging declarations.`
  } else {
    summary = 'Insufficient matching attributes to verify online listing against physical packaging.'
  }

  return {
    overallMatchStatus,
    matchCount,
    mismatchCount,
    unverifiedCount: unverifiedFields.length,
    discrepancies,
    matchedFields,
    unverifiedFields,
    summary,
  }
}
