/**
 * Phase 6A Diagnostic Remediation & Statutory Verification Test Suite
 *
 * Verifies fixes for:
 * 1. MRP False Positive (Rule 6(1)(e)) — literal prefix in sourceText vs rawValue
 * 2. Unit Sale Price (Rule 6(1)(ea)) — first-class extraction & statutory placement on seal/coding area
 *
 * Grounded in:
 * - Legal Metrology (Packaged Commodities) Rules, 2011: Rule 2(h)(ii) read with Rule 6(1)(e) & Rule 6(1)(ea)
 * - Central Notifications G.S.R. 779(E) & G.S.R. 720(E)
 *
 * Run with: npx tsx scripts/test-phase6a-diagnostic-remediation.ts
 */

import { prisma } from '../src/lib/prisma'
import { evaluateRules } from '../src/lib/rules/rule-engine'
import { buildRuleEngineContextFromData } from '../src/lib/rules/context-builder'
import { VERIFIED_STATUTORY_RULES } from '../src/lib/rules/seed/legal-rules-data'
import { HeuristicAnalysisProvider } from '../src/lib/ai/heuristic-analyzer'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  }
  console.log(`  ✅ ${message}`)
}

async function runRemediationTests() {
  console.log('\n======================================================')
  console.log('  PHASE 6A DIAGNOSTIC REMEDIATION & STATUTORY SUITE')
  console.log('======================================================\n')

  const rules = VERIFIED_STATUTORY_RULES as any

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Real Vim Dishwash Liquid Scenario (PASS)
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test 1: Real Vim Dishwash Liquid Scenario ---')
  const vimScan = {
    id: 'scan-vim-real-01',
    identifiedProductName: 'Vim Dishwash Liquid',
    identifiedCategory: 'Household / Detergent',
    extractedDeclarations: [
      {
        id: 'vim-mrp',
        fieldName: 'mrp',
        rawValue: '₹ 20.00 (Incl. of all taxes)',
        normalizedValue: '20.00',
        sourceText: '*MRP ₹ 20.00 (Incl. of all\ntaxes).',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'vim-usp',
        fieldName: 'unit_sale_price',
        rawValue: '₹ 0.15/ml',
        normalizedValue: '₹0.15/ml',
        sourceText: 'ØC * ₹ 20/- : ₹ 0. 15/ml',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'vim-qty',
        fieldName: 'net_quantity',
        rawValue: '130 ml',
        normalizedValue: '130 ml',
        sourceText: 'Net Vol.: 130 ml',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'vim-mfd',
        fieldName: 'date_of_packing',
        rawValue: '01/05/2024',
        normalizedValue: '01/05/2024',
        sourceText: '#MFD. 01/05/2024',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'vim-mfg',
        fieldName: 'manufacturer',
        rawValue: 'Hindustan Unilever Ltd',
        normalizedValue: 'Hindustan Unilever Ltd',
        sourceText: 'Mfd by Hindustan Unilever Ltd',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'vim-care',
        fieldName: 'customer_care',
        rawValue: '1800-10-22-221',
        normalizedValue: '1800-10-22-221',
        sourceText: 'Customer Care: 1800-10-22-221',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxVim = buildRuleEngineContextFromData(vimScan as any)
  const resVim = evaluateRules(ctxVim, rules)

  const mrpVimCheck = resVim.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-E')
  assert(mrpVimCheck?.status === 'PASS', 'Rule 6(1)(e) MRP passes with verbatim sourceText prefix')

  const uspVimCheck = resVim.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')
  assert(uspVimCheck?.status === 'PASS', 'Rule 6(1)(ea) Unit Sale Price passes with seal extraction')

  const mrpViolations = resVim.violations.filter(
    (v) => v.ruleNumber === 'LMPC-2011-R06-1-E' || v.ruleNumber === 'LMPC-2011-R06-1-EA'
  )
  assert(mrpViolations.length === 0, 'Real Vim scenario generates ZERO violations for MRP and USP')

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Genuine Negative — Missing MRP Prefix (FAIL)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Genuine Negative — Missing MRP Prefix ---')
  const missingPrefixScan = {
    id: 'scan-no-mrp-prefix',
    identifiedProductName: 'Snack Pack',
    identifiedCategory: 'Food',
    extractedDeclarations: [
      {
        id: 'np-mrp',
        fieldName: 'mrp',
        rawValue: '₹ 20.00 (Incl. of all taxes)',
        normalizedValue: '20.00',
        sourceText: '₹ 20.00 (Incl. of all taxes)', // Missing literal "MRP"
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxNoPrefix = buildRuleEngineContextFromData(missingPrefixScan as any)
  const resNoPrefix = evaluateRules(ctxNoPrefix, rules)
  const noPrefixCheck = resNoPrefix.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-E')

  assert(noPrefixCheck?.status === 'FAIL', 'Rule 6(1)(e) FAILS when MRP prefix is missing')
  assert(
    Boolean(noPrefixCheck?.summary.includes('Price declaration must clearly state "MRP" or "Maximum Retail Price"')),
    'Summary reports clear statutory reason for missing MRP prefix'
  )
  assert(
    resNoPrefix.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-E'),
    'Formal statutory violation is generated for missing MRP prefix'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Genuine Negative — Missing Tax Inclusivity (FAIL)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Genuine Negative — Missing Tax Inclusivity ---')
  const missingTaxScan = {
    id: 'scan-no-tax-incl',
    identifiedProductName: 'Biscuit Pack',
    identifiedCategory: 'Food',
    extractedDeclarations: [
      {
        id: 'nt-mrp',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 20.00',
        normalizedValue: '20.00',
        sourceText: 'MRP ₹ 20.00', // Missing "inclusive of all taxes"
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxNoTax = buildRuleEngineContextFromData(missingTaxScan as any)
  const resNoTax = evaluateRules(ctxNoTax, rules)
  const noTaxCheck = resNoTax.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-E')

  assert(noTaxCheck?.status === 'FAIL', 'Rule 6(1)(e) FAILS when tax inclusivity is missing')
  assert(
    Boolean(noTaxCheck?.summary.includes('Maximum Retail Price must be declared inclusive of all taxes')),
    'Summary reports statutory non-compliance regarding tax inclusivity'
  )
  assert(
    resNoTax.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-E'),
    'Formal statutory violation is generated for missing tax inclusivity'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Standalone USP on Seal / Coding Area (PASS)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: Standalone USP on Seal / Coding Area ---')
  const sealUspScan = {
    id: 'scan-seal-usp',
    identifiedProductName: 'Body Wash 250ml',
    identifiedCategory: 'Personal Care',
    extractedDeclarations: [
      {
        id: 'su-mrp',
        fieldName: 'mrp',
        rawValue: '₹ 150.00 (incl. of all taxes)',
        normalizedValue: '150.00',
        sourceText: 'MRP ₹ 150.00 (incl. of all taxes)',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'su-usp',
        fieldName: 'unit_sale_price',
        rawValue: '₹ 0.60/ml',
        normalizedValue: '₹0.60/ml',
        sourceText: 'B.No: 9942 ₹ 0.60/ml',
        confidence: 0.92,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'su-date',
        fieldName: 'date_of_packing',
        rawValue: '01/01/2024',
        normalizedValue: '01/01/2024',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxSealUsp = buildRuleEngineContextFromData(sealUspScan as any)
  const resSealUsp = evaluateRules(ctxSealUsp, rules)
  const sealUspCheck = resSealUsp.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')

  assert(sealUspCheck?.status === 'PASS', 'Rule 6(1)(ea) PASSES with USP declared on seal under Rule 2(h)(ii)')
  assert(
    !resSealUsp.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-EA'),
    'Zero violations for valid USP declared on seal'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Genuine Negative — Missing USP Post-Dec 2022 (FAIL)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Genuine Negative — Missing USP Post-Dec 2022 ---')
  const missingUspPostScan = {
    id: 'scan-missing-usp-post',
    identifiedProductName: 'Detergent Powder 1kg',
    identifiedCategory: 'Household',
    extractedDeclarations: [
      {
        id: 'mu-mrp',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 99.00 (incl. of all taxes)',
        normalizedValue: '99.00',
        sourceText: 'MRP ₹ 99.00 (incl. of all taxes)',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'mu-usp',
        fieldName: 'unit_sale_price',
        rawValue: null,
        normalizedValue: null,
        sourceText: null,
        confidence: 0,
        detectionStatus: 'NOT_DETECTED',
      },
      {
        id: 'mu-date',
        fieldName: 'date_of_packing',
        rawValue: '15/06/2023', // Post-commencement
        normalizedValue: '15/06/2023',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxMissingUsp = buildRuleEngineContextFromData(missingUspPostScan as any)
  const resMissingUsp = evaluateRules(ctxMissingUsp, rules)
  const missingUspCheck = resMissingUsp.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')

  assert(missingUspCheck?.versionNumber === 2, 'Selects RuleVersion 2 (Mandatory USP post-01/12/2022)')
  assert(missingUspCheck?.status === 'FAIL', 'Rule 6(1)(ea) FAILS when USP is missing on post-commencement commodity')
  assert(
    resMissingUsp.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-EA'),
    'Formal statutory violation is generated for missing Unit Sale Price'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Genuine Negative — Malformed USP Rate Unit (FAIL)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 6: Genuine Negative — Malformed USP Rate Unit ---')
  const malformedUspScan = {
    id: 'scan-malformed-usp',
    identifiedProductName: 'Floor Cleaner 1L',
    identifiedCategory: 'Household',
    extractedDeclarations: [
      {
        id: 'mf-mrp',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 150.00 (incl. of all taxes)',
        normalizedValue: '150.00',
        sourceText: 'MRP ₹ 150.00 (incl. of all taxes)',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'mf-usp',
        fieldName: 'unit_sale_price',
        rawValue: '₹ 15/box', // Invalid non-statutory unit
        normalizedValue: '₹15/box',
        sourceText: '₹ 15/box',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'mf-date',
        fieldName: 'date_of_packing',
        rawValue: '01/04/2024',
        normalizedValue: '01/04/2024',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxMalformedUsp = buildRuleEngineContextFromData(malformedUspScan as any)
  const resMalformedUsp = evaluateRules(ctxMalformedUsp, rules)
  const malformedUspCheck = resMalformedUsp.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')

  assert(malformedUspCheck?.status === 'FAIL', 'Rule 6(1)(ea) FAILS for non-statutory rate unit (e.g. /box)')
  assert(
    resMalformedUsp.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-EA'),
    'Formal statutory violation is generated for malformed USP unit'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Historical RuleVersion Behavior — Pre-Commencement Exemption (PASS)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 7: Pre-Commencement Exemption (Historical RuleVersion) ---')
  const preCommencementScan = {
    id: 'scan-pre-commencement',
    identifiedProductName: 'Biscuits 200g',
    identifiedCategory: 'Food',
    extractedDeclarations: [
      {
        id: 'pc-mrp',
        fieldName: 'mrp',
        rawValue: 'MRP ₹ 30.00 (incl. of all taxes)',
        normalizedValue: '30.00',
        sourceText: 'MRP ₹ 30.00 (incl. of all taxes)',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'pc-date',
        fieldName: 'date_of_packing',
        rawValue: '15/10/2022', // Pre-01/12/2022
        normalizedValue: '15/10/2022',
        confidence: 0.9,
        detectionStatus: 'DETECTED',
      },
    ],
  }

  const ctxPreComm = buildRuleEngineContextFromData(preCommencementScan as any)
  const resPreComm = evaluateRules(ctxPreComm, rules)
  const preCommCheck = resPreComm.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')

  assert(preCommCheck?.versionNumber === 1, 'Selects RuleVersion 1 for pre-commencement packaging date')
  assert(preCommCheck?.status !== 'FAIL', 'Pre-commencement commodity does NOT fail for missing USP')
  assert(
    !resPreComm.violations.some((v) => v.ruleNumber === 'LMPC-2011-R06-1-EA'),
    'Zero violations for pre-commencement commodity regarding USP'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 8: Multi-Surface / Multi-Image Sourcing & Extraction
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 8: Multi-Surface Heuristic Extraction ---')
  const analyzer = new HeuristicAnalysisProvider()
  const multiSurfaceOcr = `
--- [Image 1: Front Panel] ---
Vim Dishwash Liquid
With Power of 100 Lemons
Net Vol.: 130 ml

--- [Image 2: Back Panel] ---
*MRP ₹ 20.00 (Incl. of all taxes).
For USP, Net Vol., #MFD. & Batch No.: See Top/Seal
Consumer Care: 1800-10-22-221
Mfd by Hindustan Unilever Ltd

--- [Image 3: Top Seal / Coding Area] ---
B.No. 40822
#MFD. 01/05/2024
ØC * ₹ 20/- : ₹ 0. 15/ml
`

  const extracted = await analyzer.analyzePackage(multiSurfaceOcr)
  const mrpDecl = extracted.declarations.find((d) => d.fieldName === 'mrp')
  const uspDecl = extracted.declarations.find((d) => d.fieldName === 'unit_sale_price')
  const qtyDecl = extracted.declarations.find((d) => d.fieldName === 'net_quantity')

  assert(mrpDecl?.detectionStatus === 'DETECTED', 'MRP detected across multi-image OCR')
  assert(Boolean(mrpDecl?.rawValue?.includes('20')), 'MRP rawValue extracted accurately')
  assert(uspDecl?.detectionStatus === 'DETECTED', 'Unit Sale Price detected across multi-image OCR')
  assert(Boolean(uspDecl?.rawValue?.includes('0. 15') || uspDecl?.rawValue?.includes('0.15')), 'USP rate extracted from seal image')
  assert(qtyDecl?.detectionStatus === 'DETECTED', 'Net quantity detected from front panel image')

  // Run Rule Engine on the heuristically extracted declarations
  const multiScanObj = {
    id: 'scan-multi-surface-01',
    identifiedProductName: extracted.product.productName,
    identifiedCategory: extracted.product.category,
    extractedDeclarations: extracted.declarations.map((d, i) => ({
      id: `ms-${i}`,
      fieldName: d.fieldName,
      rawValue: d.rawValue,
      normalizedValue: d.normalizedValue,
      sourceText: d.sourceText,
      confidence: d.confidence,
      detectionStatus: d.detectionStatus,
    })),
  }

  const ctxMulti = buildRuleEngineContextFromData(multiScanObj as any)
  const resMulti = evaluateRules(ctxMulti, rules)
  const multiMrp = resMulti.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-E')
  const multiUsp = resMulti.results.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')

  assert(multiMrp?.status === 'PASS', 'Multi-surface extraction yields PASS on MRP Rule 6(1)(e)')
  assert(multiUsp?.status === 'PASS', 'Multi-surface extraction yields PASS on USP Rule 6(1)(ea)')

  // ─────────────────────────────────────────────────────────────
  // TEST 9: Invariant Preservation Across Deterministic Rule Engine
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test 9: Invariant Preservation Across Deterministic Rule Engine ---')
  assert(
    VERIFIED_STATUTORY_RULES.length === 9,
    'Verified statutory rules catalog preserves exactly 9 primary legal rules'
  )
  const uspRule = VERIFIED_STATUTORY_RULES.find((r) => r.ruleNumber === 'LMPC-2011-R06-1-EA')
  assert(uspRule?.versions.length === 2, 'USP rule preserves exactly 2 historical RuleVersions (v1 and v2)')

  console.log('\n======================================================')
  console.log('  ALL 9 REMEDIATION TESTS PASSED SUCCESSFULLY')
  console.log('======================================================\n')
}

runRemediationTests()
  .catch((err) => {
    console.error('Test suite failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
