/**
 * Phase 3B Statutory Legal Metrology Test Suite
 *
 * Grounded in verified Gazette instruments:
 * - Legal Metrology Act, 2009 (Act No. 1 of 2010)
 * - LMPC Rules, 2011 (G.S.R. 202(E) dated 07/03/2011)
 * - LMPC Third Amendment Rules, 2011 (G.S.R. 784(E) w.e.f. 01/07/2012 - Omission of Rule 26(a) draft proviso)
 * - LMPC Amendment Rules, 2015 (G.S.R. 385(E) dated 14/05/2015 - Tobacco exclusion from Rule 26(a))
 * - LMPC Second Amendment Rules, 2021 (G.S.R. 779(E) read with G.S.R. 720(E) w.e.f. 01/12/2022 - Mandatory USP)
 * - LMPC Second Amendment Rules, 2025 (G.S.R. 881(E) w.e.f. 01/02/2026 - Pan Masala exclusion from Rule 26(a))
 * - Rule 3 Chapter II Gate: >25kg/>25L threshold, cement/fertilizer 50kg exception, industrial/institutional consumers
 */

import { buildRuleEngineContextFromData } from '../src/lib/rules/context-builder'
import { evaluateRules } from '../src/lib/rules/rule-engine'
import { VERIFIED_STATUTORY_RULES } from '../src/lib/rules/seed/legal-rules-data'
import type { RuleWithVersionsLike } from '../src/lib/rules/applicability-evaluator'

let totalPassed = 0
let totalFailed = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`)
    totalPassed++
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`)
    totalFailed++
  }
}

async function runLegalTestSuite() {
  console.log('\n======================================================')
  console.log('  VERIQO PHASE 3B: STATUTORY LEGAL RULES TEST SUITE')
  console.log('======================================================\n')

  const rules: RuleWithVersionsLike[] = VERIFIED_STATUTORY_RULES as any

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Fully Compliant Standard Commodity (Parle-G 100g, Mar 2024)
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test 1: Fully Compliant Standard Retail Commodity ---')
  const scanCompliant = {
    id: 'scan-parle-g-01',
    identifiedProductName: 'Parle-G Gold Biscuits',
    identifiedCategory: 'Biscuits & Cookies',
    extractedDeclarations: [
      {
        id: 'd1',
        fieldName: 'product_name',
        rawValue: 'Parle-G Gold Biscuits',
        normalizedValue: 'Parle-G Gold Biscuits',
        confidence: 0.98,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'd2',
        fieldName: 'manufacturer',
        rawValue: 'Parle Products Pvt Ltd',
        normalizedValue: 'Parle Products Pvt Ltd',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'd3',
        fieldName: 'address',
        rawValue: 'North Level Crossing, Vile Parle East, Mumbai, Maharashtra 400057',
        normalizedValue: 'North Level Crossing, Vile Parle East, Mumbai, Maharashtra 400057',
        confidence: 0.93,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'd4',
        fieldName: 'net_quantity',
        rawValue: 'Net Weight: 100 g',
        normalizedValue: '100 g',
        confidence: 0.96,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'd5',
        fieldName: 'date_of_packing',
        rawValue: '01/03/2024',
        normalizedValue: '01/03/2024',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'd6',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 20.00 (incl. of all taxes) Unit Sale Price: ₹ 0.20/g',
        normalizedValue: '20.00',
        confidence: 0.97,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'd7',
        fieldName: 'customer_care',
        rawValue: 'Consumer Care: 1800-22-7799 / cs@parle.biz',
        normalizedValue: '1800-22-7799 / cs@parle.biz',
        confidence: 0.91,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxCompliant = buildRuleEngineContextFromData(scanCompliant as any)
  const resCompliant = evaluateRules(ctxCompliant, rules)

  assert(resCompliant.failedCount === 0, 'Compliant package has 0 FAIL results')
  assert(resCompliant.violations.length === 0, 'Compliant package has 0 formal Violations')
  const mrpCheck = resCompliant.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-E')
  assert(mrpCheck?.status === 'PASS', 'Rule 6(1)(e) MRP passes')
  const netQtyCheck = resCompliant.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-C')
  assert(netQtyCheck?.status === 'PASS', 'Rule 6(1)(c) Net Quantity in metric units passes')

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Rule 26(a) Small Package Exemption (4g Sachet)
  // G.S.R. 784(E) omitted the draft proviso w.e.f. 01/07/2012:
  // All Chapter II retail rules are NOT_APPLICABLE on <=10g/10ml packages
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Rule 26(a) Small Package Exemption (4g Sachet) ---')
  const scanSmallExempt = {
    id: 'scan-shampoo-sachet-01',
    identifiedProductName: 'Herbal Shampoo Sachet',
    identifiedCategory: 'Personal Care',
    extractedDeclarations: [
      {
        id: 's1',
        fieldName: 'manufacturer',
        rawValue: 'Hindustan Care Ltd',
        normalizedValue: 'Hindustan Care Ltd',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 's2',
        fieldName: 'net_quantity',
        rawValue: '4 ml', // <= 10 ml
        normalizedValue: '4',
        confidence: 0.94,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxSmall = buildRuleEngineContextFromData(scanSmallExempt as any)
  const resSmall = evaluateRules(ctxSmall, rules)

  assert(
    resSmall.results.every((r) => r.status === 'NOT_APPLICABLE'),
    'Under Rule 26(a) (proviso omitted by G.S.R. 784(E)), ALL Chapter II rules are NOT_APPLICABLE on <=10g/10ml packages'
  )
  assert(
    resSmall.violations.length === 0,
    'Small package qualifying for Rule 26(a) produces 0 formal Violations'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Standard Retail Package (>10g) Missing MRP
  // Verifies statutory MRP requirement on qualifying retail packages
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Standard Retail Package (>10g) Missing MRP ---')
  const scanRetailNoMrp = {
    id: 'scan-biscuit-no-mrp',
    identifiedProductName: 'Cream Biscuits 150g',
    identifiedCategory: 'Biscuits & Cookies',
    extractedDeclarations: [
      {
        id: 'nm1',
        fieldName: 'manufacturer',
        rawValue: 'Britannia Industries Ltd',
        normalizedValue: 'Britannia Industries Ltd',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'nm2',
        fieldName: 'address',
        rawValue: '5/1A Hungerford Street, Kolkata, West Bengal',
        normalizedValue: '5/1A Hungerford Street, Kolkata, West Bengal',
        confidence: 0.91,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'nm3',
        fieldName: 'net_quantity',
        rawValue: 'Net Weight: 150 g', // > 10g, Rule 26(a) does NOT exempt
        normalizedValue: '150 g',
        confidence: 0.94,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'nm4',
        fieldName: 'date_of_packing',
        rawValue: '15/01/2024',
        normalizedValue: '15/01/2024',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
      // Deliberately missing MRP declaration!
    ],
  }

  const ctxRetailNoMrp = buildRuleEngineContextFromData(scanRetailNoMrp as any)
  const resRetailNoMrp = evaluateRules(ctxRetailNoMrp, rules)

  const mrpRetailCheck = resRetailNoMrp.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-E')
  assert(
    mrpRetailCheck?.status === 'FAIL',
    'Rule 6(1)(e): 150g retail package missing MRP evaluates to FAIL'
  )
  assert(
    resRetailNoMrp.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-E'),
    'Violation is formally generated for missing MRP on retail package'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Tobacco Product Exclusion under Rule 26(a) (G.S.R. 385(E))
  // Proviso inserted vide G.S.R. 385(E) (14/05/2015) excludes tobacco
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: Tobacco Small Package Exclusion (G.S.R. 385(E)) ---')
  const scanTobaccoSmall = {
    id: 'scan-tobacco-01',
    identifiedProductName: 'Chewing Tobacco Pouch',
    identifiedCategory: 'Tobacco & Cigarettes',
    extractedDeclarations: [
      {
        id: 't1',
        fieldName: 'manufacturer',
        rawValue: 'Royal Tobacco Ltd',
        normalizedValue: 'Royal Tobacco Ltd',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 't2',
        fieldName: 'address',
        rawValue: 'Industrial Estate, Kanpur, UP',
        normalizedValue: 'Industrial Estate, Kanpur, UP',
        confidence: 0.91,
        detectionStatus: 'DETECTED',
      },
      {
        id: 't3',
        fieldName: 'net_quantity',
        rawValue: '5 g', // 5g <= 10g, but tobacco is excluded from exemption!
        normalizedValue: '5',
        confidence: 0.94,
        detectionStatus: 'DETECTED',
      },
      {
        id: 't4',
        fieldName: 'date_of_packing',
        rawValue: '01/02/2024',
        normalizedValue: '01/02/2024',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
      {
        id: 't5',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 10.00 (incl. of all taxes)',
        normalizedValue: '10.00',
        confidence: 0.96,
        detectionStatus: 'DETECTED',
      },
      // Customer care missing on tobacco pouch
    ],
  }

  const ctxTobacco = buildRuleEngineContextFromData(scanTobaccoSmall as any)
  const resTobacco = evaluateRules(ctxTobacco, rules)

  const tobaccoCareCheck = resTobacco.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-F')
  assert(
    tobaccoCareCheck?.status === 'FAIL',
    'G.S.R. 385(E): Tobacco package <=10g CANNOT claim small package exemption (Consumer Care FAIL)'
  )
  assert(
    resTobacco.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-F'),
    'Violation generated for missing Consumer Care on 5g tobacco package'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Pan Masala Exclusion under G.S.R. 881(E) (w.e.f. 01/02/2026)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Pan Masala Exclusion under G.S.R. 881(E) ---')

  // Case 5A: Pan Masala packed in Dec 2025 (Prior to 01/02/2026) -> Exempt under Rule 26(a)
  const scanPanMasalaPre = {
    id: 'scan-pan-masala-2025',
    identifiedProductName: 'Kesar Pan Masala',
    identifiedCategory: 'Pan Masala',
    extractedDeclarations: [
      {
        id: 'pm1',
        fieldName: 'net_quantity',
        rawValue: '4 g',
        normalizedValue: '4',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'pm2',
        fieldName: 'date_of_packing',
        rawValue: '15/12/2025', // Pre-01/02/2026
        normalizedValue: '15/12/2025',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxPmPre = buildRuleEngineContextFromData(scanPanMasalaPre as any)
  const resPmPre = evaluateRules(ctxPmPre, rules)
  assert(
    resPmPre.violations.length === 0,
    'Pan Masala packed prior to 01/02/2026 qualifies for Rule 26(a) exemption (0 Violations)'
  )

  // Case 5B: Pan Masala packed in Feb 2026 (Post-01/02/2026) -> G.S.R. 881(E) excludes pan masala from exemption
  const scanPanMasalaPost = {
    id: 'scan-pan-masala-2026',
    identifiedProductName: 'Kesar Pan Masala',
    identifiedCategory: 'Pan Masala',
    extractedDeclarations: [
      {
        id: 'pm3',
        fieldName: 'net_quantity',
        rawValue: '4 g',
        normalizedValue: '4',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'pm4',
        fieldName: 'date_of_packing',
        rawValue: '15/02/2026', // Post-01/02/2026
        normalizedValue: '15/02/2026',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
      // Missing manufacturer, address, MRP, consumer care
    ],
  }

  const ctxPmPost = buildRuleEngineContextFromData(scanPanMasalaPost as any)
  const resPmPost = evaluateRules(ctxPmPost, rules)
  const pmMrpCheck = resPmPost.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-E')
  assert(
    pmMrpCheck?.status === 'FAIL',
    'G.S.R. 881(E): Pan Masala packed after 01/02/2026 is EXCLUDED from Rule 26(a) exemption (MRP fails)'
  )
  assert(
    resPmPost.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-E'),
    'Violation generated for 4g Pan Masala post-01/02/2026 under G.S.R. 881(E)'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Centralized Rule 3 Chapter II Gate (Bulk & Institutional Packages)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 6: Centralized Rule 3 Chapter II Gate ---')

  // Case 6A: Package > 25 kg (e.g. 30 kg Flour sack) -> Exempt from Chapter II retail rules under Rule 3(a)
  const scanFlourBulk = {
    id: 'scan-flour-30kg',
    identifiedProductName: 'Commercial Wheat Flour',
    identifiedCategory: 'Grocery & Staples',
    extractedDeclarations: [
      {
        id: 'fb1',
        fieldName: 'net_quantity',
        rawValue: 'Net Weight: 30 kg',
        normalizedValue: '30 kg',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      // Retail MRP and consumer care omitted
    ],
  }

  const ctxFlourBulk = buildRuleEngineContextFromData(scanFlourBulk as any)
  const resFlourBulk = evaluateRules(ctxFlourBulk, rules)
  assert(
    resFlourBulk.results.every((r) => r.status === 'NOT_APPLICABLE'),
    'Rule 3(a): 30 kg commodity package (>25kg) is exempt from Chapter II retail rules (NOT_APPLICABLE)'
  )
  assert(
    resFlourBulk.violations.length === 0,
    'Bulk package exceeding 25kg produces 0 Violations under Chapter II'
  )

  // Case 6B: Cement bag of 50 kg -> NOT exempt under Rule 3(a) proviso (cement/fertilizer up to 50kg covered)
  const scanCement50kg = {
    id: 'scan-cement-50kg',
    identifiedProductName: 'Portland Pozzolana Cement',
    identifiedCategory: 'Cement & Building Materials',
    extractedDeclarations: [
      {
        id: 'cm1',
        fieldName: 'net_quantity',
        rawValue: 'Net Quantity: 50 kg',
        normalizedValue: '50 kg',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'cm2',
        fieldName: 'manufacturer',
        rawValue: 'Ultratech Cement Ltd',
        normalizedValue: 'Ultratech Cement Ltd',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'cm3',
        fieldName: 'address',
        rawValue: 'Ahura Centre, Mahakali Caves Road, Andheri East, Mumbai',
        normalizedValue: 'Ahura Centre, Mahakali Caves Road, Andheri East, Mumbai',
        confidence: 0.91,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'cm4',
        fieldName: 'date_of_packing',
        rawValue: '01/04/2024',
        normalizedValue: '01/04/2024',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'cm5',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 380.00 (incl. of all taxes)',
        normalizedValue: '380.00',
        confidence: 0.94,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'cm6',
        fieldName: 'customer_care',
        rawValue: 'Toll free 1800-210-3311',
        normalizedValue: '1800-210-3311',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxCement = buildRuleEngineContextFromData(scanCement50kg as any)
  const resCement = evaluateRules(ctxCement, rules)
  const cementNetQtyCheck = resCement.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-C')
  assert(
    cementNetQtyCheck?.status === 'PASS',
    'Rule 3(a) Exception: Cement sold in bags up to 50 kg is NOT exempt from Chapter II and passes when compliant'
  )

  // Case 6C: Institutional / Industrial Pack -> Exempt under Rule 3(b)
  const scanInstitutional = {
    id: 'scan-institutional-pack',
    identifiedProductName: 'Cooking Oil 15L Institutional Pack',
    identifiedCategory: 'Edible Oils',
    extractedDeclarations: [
      {
        id: 'inst1',
        fieldName: 'institutional_industrial',
        rawValue: 'For Institutional Consumer Use Only - Not For Retail Sale',
        normalizedValue: 'INSTITUTIONAL',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'inst2',
        fieldName: 'net_quantity',
        rawValue: '15 Litres',
        normalizedValue: '15 L',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxInst = buildRuleEngineContextFromData(scanInstitutional as any, {
    consumerType: 'INSTITUTIONAL',
  })
  const resInst = evaluateRules(ctxInst, rules)
  assert(
    resInst.results.every((r) => r.status === 'NOT_APPLICABLE'),
    'Rule 3(b): Institutional consumer package is exempt from Chapter II retail rules (NOT_APPLICABLE)'
  )
  assert(
    resInst.violations.length === 0,
    'Institutional package produces 0 Violations under Chapter II'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Rule 7 & Section 11 (Non-Metric Imperial Units Prohibited)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 7: Rule 7 & Section 11 (Non-Metric Units Prohibited) ---')
  const scanImperial = {
    id: 'scan-imperial-01',
    identifiedProductName: 'Imported Flour Bag',
    identifiedCategory: 'Grocery & Staples',
    extractedDeclarations: [
      {
        id: 'imp1',
        fieldName: 'net_quantity',
        rawValue: 'Net Weight: 5 lbs', // Prohibited imperial unit
        normalizedValue: '5 lbs',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'imp2',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 250.00 (incl. of all taxes)',
        normalizedValue: '250.00',
        confidence: 0.94,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'imp3',
        fieldName: 'manufacturer',
        rawValue: 'Sunrise Millers Ltd',
        normalizedValue: 'Sunrise Millers Ltd',
        confidence: 0.91,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'imp4',
        fieldName: 'address',
        rawValue: 'Grain Market, Bathinda, Punjab',
        normalizedValue: 'Grain Market, Bathinda, Punjab',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'imp5',
        fieldName: 'date_of_packing',
        rawValue: '10/02/2024',
        normalizedValue: '10/02/2024',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxImperial = buildRuleEngineContextFromData(scanImperial as any)
  const resImperial = evaluateRules(ctxImperial, rules)

  const metricCheck = resImperial.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-C')
  assert(
    metricCheck?.status === 'FAIL',
    'Rule 7: Package using non-metric unit (lbs) evaluates to FAIL'
  )
  assert(
    resImperial.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-C'),
    'Violation is generated with HIGH severity for non-metric units'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 8: Historical Versioning of Unit Sale Price (Rule 6(1)(ea))
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 8: Historical Versioning of Unit Sale Price (Rule 6(1)(ea)) ---')

  // Case 8A: Manufactured in October 2022 (Pre-commencement of mandatory USP)
  const scanPreUsp = {
    id: 'scan-pre-usp',
    identifiedProductName: 'Namkeen Pack 400g',
    identifiedCategory: 'Snacks',
    extractedDeclarations: [
      {
        id: 'u1',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 80.00 (incl. of all taxes)', // No USP declared
        normalizedValue: '80.00',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'u2',
        fieldName: 'date_of_packing',
        rawValue: '15/10/2022', // Pre-Dec 2022
        normalizedValue: '15/10/2022',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'u3',
        fieldName: 'net_quantity',
        rawValue: '400 g',
        normalizedValue: '400',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxPreUsp = buildRuleEngineContextFromData(scanPreUsp as any)
  const resPreUsp = evaluateRules(ctxPreUsp, rules)
  const uspCheckPre = resPreUsp.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')
  assert(
    uspCheckPre?.versionNumber === 1,
    'Commodity packed in 10/2022 selects RuleVersion 1 (Pre-commencement)'
  )
  assert(
    uspCheckPre?.status !== 'FAIL',
    'Commodity packed in 10/2022 does NOT fail for missing USP (Version 1 was voluntary)'
  )

  // Case 8B: Manufactured in February 2023 (Post-commencement of mandatory USP)
  const scanPostUsp = {
    id: 'scan-post-usp',
    identifiedProductName: 'Namkeen Pack 400g',
    identifiedCategory: 'Snacks',
    extractedDeclarations: [
      {
        id: 'u4',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 80.00 (incl. of all taxes)', // Missing USP!
        normalizedValue: '80.00',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'u5',
        fieldName: 'net_quantity',
        rawValue: '400 g',
        normalizedValue: '400',
        confidence: 0.93,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'u6',
        fieldName: 'date_of_packing',
        rawValue: '15/02/2023', // Post-Dec 2022
        normalizedValue: '15/02/2023',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxPostUsp = buildRuleEngineContextFromData(scanPostUsp as any)
  const resPostUsp = evaluateRules(ctxPostUsp, rules)
  const uspCheckPost = resPostUsp.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')
  assert(
    uspCheckPost?.versionNumber === 2,
    'Commodity packed in 02/2023 selects RuleVersion 2 (Mandatory USP under G.S.R. 779(E) & 720(E))'
  )
  assert(
    uspCheckPost?.status === 'FAIL',
    'Commodity packed in 02/2023 FAILS for missing Unit Sale Price'
  )
  assert(
    resPostUsp.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-EA'),
    'Violation generated for missing Unit Sale Price on post-commencement commodity'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 9: Advisory Typography & Font Prominence (Rule 9)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 9: Advisory Typography & Font Prominence (Rule 9) ---')
  const scanAdvisory = {
    id: 'scan-advisory-01',
    identifiedProductName: 'Soap Bar 125g',
    identifiedCategory: 'Personal Care',
    extractedDeclarations: [
      {
        id: 'adv1',
        fieldName: 'mrp',
        rawValue: null, // Triggers advisory typography check
        normalizedValue: null,
        confidence: 0.4,
        detectionStatus: 'NOT_DETECTED',
      },
      {
        id: 'adv2',
        fieldName: 'net_quantity',
        rawValue: '125 g',
        normalizedValue: '125',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxAdvisory = buildRuleEngineContextFromData(scanAdvisory as any)
  const resAdvisory = evaluateRules(ctxAdvisory, rules)

  const sched2Check = resAdvisory.results.find((r) => r.ruleNumber === 'LMPC-2011-R09-SCH2')
  assert(
    sched2Check?.status === 'WARNING',
    'Rule 9 / Second Schedule produces status: WARNING for typography deficiency'
  )
  assert(
    resAdvisory.violations.every((v) => v.ruleNumber !== 'LMPC-2011-R09-SCH2'),
    'Rule 9 / Second Schedule (WARNING) NEVER produces a formal Violation'
  )

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n======================================================')
  console.log(`  PHASE 3B TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runLegalTestSuite().catch((err) => {
  console.error('Legal test suite failed:', err)
  process.exit(1)
})
