/**
 * Phase 3A Unit Test Suite: Legal Metrology Deterministic Rule Engine
 *
 * Validates:
 * 1. Condition operators (comparison, numeric, regex, dates)
 * 2. Field resolution and recursive condition evaluation (AND / OR)
 * 3. Historical RuleVersion selection based on packaging/manufacturing date
 * 4. Commodity category and criteria applicability evaluation
 * 5. RuleEngineContext assembly from extracted declarations
 * 6. Deterministic execution and strict violation creation rules (FAIL creates Violation, WARNING does not)
 */

import {
  evaluateOperator,
  extractNumeric,
  parseDateSafe,
} from '../src/lib/rules/operators'
import {
  resolveFieldValue,
  evaluateCondition,
  evaluateConditionGroup,
} from '../src/lib/rules/condition-evaluator'
import {
  selectHistoricalRuleVersion,
  evaluateRuleApplicability,
} from '../src/lib/rules/applicability-evaluator'
import { buildRuleEngineContextFromData } from '../src/lib/rules/context-builder'
import { evaluateRules } from '../src/lib/rules/rule-engine'
import type {
  RuleEngineContext,
  RuleCondition,
  RuleConditionGroup,
} from '../src/lib/rules/types'
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

async function runTests() {
  console.log('\n======================================================')
  console.log('  VERIQO PHASE 3A: RULE ENGINE UNIT TEST SUITE')
  console.log('======================================================\n')

  // ─────────────────────────────────────────────────────────────
  // 1. OPERATORS
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Operators ---')

  assert(evaluateOperator('EXISTS', 'Hello'), 'EXISTS with non-empty string')
  assert(!evaluateOperator('EXISTS', null), 'EXISTS with null returns false')
  assert(!evaluateOperator('EXISTS', '   '), 'EXISTS with whitespace returns false')
  assert(evaluateOperator('NOT_EXISTS', null), 'NOT_EXISTS with null returns true')
  assert(evaluateOperator('NOT_EXISTS', ''), 'NOT_EXISTS with empty string returns true')

  assert(
    evaluateOperator('EQUALS', 'parle-g', 'PARLE-G', { caseSensitive: false }),
    'EQUALS case-insensitive'
  )
  assert(
    !evaluateOperator('EQUALS', 'parle-g', 'PARLE-G', { caseSensitive: true }),
    'EQUALS case-sensitive mismatch'
  )
  assert(
    evaluateOperator('NOT_EQUALS', 'brand-a', 'brand-b'),
    'NOT_EQUALS different values'
  )

  assert(
    evaluateOperator('MATCHES_REGEX', '₹25.00', '^₹?\\d+(\\.\\d{2})?$'),
    'MATCHES_REGEX valid currency format'
  )
  assert(
    !evaluateOperator('MATCHES_REGEX', 'twenty rupees', '^₹?\\d+'),
    'MATCHES_REGEX invalid string fails pattern'
  )

  assert(
    evaluateOperator('CONTAINS', 'Manufactured by Parle Products Ltd', 'parle', {
      caseSensitive: false,
    }),
    'CONTAINS case-insensitive substring'
  )
  assert(
    evaluateOperator('ONE_OF', 'grams', ['grams', 'g', 'kg', 'ml', 'litres']),
    'ONE_OF matches valid unit'
  )
  assert(
    !evaluateOperator('ONE_OF', 'miles', ['grams', 'g', 'kg', 'ml', 'litres']),
    'ONE_OF rejects invalid unit'
  )

  assert(extractNumeric('₹150.50') === 150.5, 'extractNumeric currency string')
  assert(extractNumeric('Net Wt: 200g') === 200, 'extractNumeric weight string')
  assert(evaluateOperator('NUMERIC_GT', '₹150', '100'), 'NUMERIC_GT 150 > 100')
  assert(evaluateOperator('NUMERIC_LTE', '50', '50'), 'NUMERIC_LTE 50 <= 50')
  assert(
    evaluateOperator('NUMERIC_RANGE', '15', [10, 20]),
    'NUMERIC_RANGE 15 in [10, 20]'
  )
  assert(
    !evaluateOperator('NUMERIC_RANGE', '25', [10, 20]),
    'NUMERIC_RANGE 25 outside [10, 20]'
  )

  const parsedDmy = parseDateSafe('15/08/2024')
  assert(
    parsedDmy !== null &&
      parsedDmy.getFullYear() === 2024 &&
      parsedDmy.getMonth() === 7 &&
      parsedDmy.getDate() === 15,
    'parseDateSafe DD/MM/YYYY format'
  )
  const parsedMy = parseDateSafe('08/2024')
  assert(
    parsedMy !== null && parsedMy.getFullYear() === 2024 && parsedMy.getMonth() === 7,
    'parseDateSafe MM/YYYY format'
  )
  assert(
    evaluateOperator('DATE_FORMAT_VALID', '08/2024'),
    'DATE_FORMAT_VALID recognized'
  )
  assert(
    evaluateOperator('DATE_BEFORE_NOW', '01/01/2020'),
    'DATE_BEFORE_NOW valid past date'
  )
  assert(
    !evaluateOperator('DATE_BEFORE_NOW', '01/01/2099'),
    'DATE_BEFORE_NOW future date fails'
  )

  // ─────────────────────────────────────────────────────────────
  // 2. CONTEXT BUILDING & FIELD RESOLUTION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Context Builder & Field Resolution ---')

  const mockScan = {
    id: 'scan-test-01',
    identifiedProductName: 'Parle-G Gold Biscuits',
    identifiedBrand: 'Parle-G',
    identifiedCategory: 'Biscuits & Cookies',
    identifiedManufacturer: 'Parle Products Pvt Ltd',
    identificationConfidence: 0.95,
    extractedDeclarations: [
      {
        id: 'decl-01',
        fieldName: 'mrp',
        rawValue: 'MRP Rs. 20.00 (incl. of all taxes)',
        normalizedValue: '20.00',
        confidence: 0.98,
        detectionStatus: 'DETECTED' as const,
        sourceText: 'MRP Rs. 20.00 (incl. of all taxes)',
      },
      {
        id: 'decl-02',
        fieldName: 'net_quantity',
        rawValue: 'Net Weight: 100 g',
        normalizedValue: '100 g',
        confidence: 0.94,
        detectionStatus: 'DETECTED' as const,
        sourceText: 'Net Weight: 100 g',
      },
      {
        id: 'decl-03',
        fieldName: 'date_of_packing',
        rawValue: '01/03/2024',
        normalizedValue: '01/03/2024',
        confidence: 0.91,
        detectionStatus: 'DETECTED' as const,
        sourceText: 'PKD: 01/03/2024',
      },
      {
        id: 'decl-04',
        fieldName: 'consumer_care',
        rawValue: null,
        normalizedValue: null,
        confidence: 0.1,
        detectionStatus: 'NOT_DETECTED' as const,
        sourceText: null,
      },
    ],
    images: [
      {
        id: 'img-01',
        storageKey: 'scans/test.jpg',
        originalFilename: 'test.jpg',
        ocrText: 'Parle-G MRP Rs. 20.00 Net Weight 100 g PKD: 01/03/2024',
      },
    ],
  }

  const context: RuleEngineContext = buildRuleEngineContextFromData(mockScan)

  assert(context.scanId === 'scan-test-01', 'Context scanId properly set')
  assert(
    context.product.name === 'Parle-G Gold Biscuits',
    'Context product name extracted'
  )
  assert(
    context.declarations['mrp']?.normalizedValue === '20.00',
    'Context declarations MRP snapshot resolved'
  )
  assert(
    context.packagingDate !== null &&
      context.packagingDate?.getFullYear() === 2024 &&
      context.packagingDate?.getMonth() === 2,
    'Context packagingDate derived from date_of_packing declaration'
  )

  // Field resolver tests
  assert(
    resolveFieldValue('declarations.mrp', context) === '20.00',
    'resolveFieldValue declarations.mrp normalized value'
  )
  assert(
    resolveFieldValue('declarations.mrp.rawValue', context) ===
      'MRP Rs. 20.00 (incl. of all taxes)',
    'resolveFieldValue declarations.mrp.rawValue'
  )
  assert(
    resolveFieldValue('declarations.consumer_care', context) === null,
    'resolveFieldValue NOT_DETECTED field returns null'
  )
  assert(
    resolveFieldValue('product.category', context) === 'Biscuits & Cookies',
    'resolveFieldValue product.category'
  )

  // ─────────────────────────────────────────────────────────────
  // 3. CONDITION EVALUATOR (AND / OR GROUPS)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Condition Evaluator ---')

  const condMrpExists: RuleCondition = {
    field: 'declarations.mrp',
    operator: 'EXISTS',
    failureMessage: 'MRP declaration is missing from package',
  }
  const evalMrp = evaluateCondition(condMrpExists, context)
  assert(evalMrp.satisfied, 'Atomic condition: MRP exists')

  const condConsumerCare: RuleCondition = {
    field: 'declarations.consumer_care',
    operator: 'EXISTS',
    failureMessage: 'Consumer care declaration is missing',
  }
  const evalCare = evaluateCondition(condConsumerCare, context)
  assert(!evalCare.satisfied, 'Atomic condition: missing Consumer Care fails')
  assert(
    evalCare.message === 'Consumer care declaration is missing',
    'Atomic condition: custom failureMessage returned'
  )

  // Composite AND Group
  const andGroup: RuleConditionGroup = {
    operator: 'AND',
    conditions: [
      condMrpExists,
      {
        field: 'declarations.net_quantity',
        operator: 'EXISTS',
      },
      {
        field: 'declarations.mrp',
        operator: 'NUMERIC_GT',
        value: 0,
      },
    ],
  }
  const evalAnd = evaluateConditionGroup(andGroup, context)
  assert(evalAnd.satisfied, 'Composite AND group: all conditions satisfied')

  // Composite OR Group with one failing and one passing
  const orGroup: RuleConditionGroup = {
    operator: 'OR',
    conditions: [condConsumerCare, condMrpExists],
  }
  const evalOr = evaluateConditionGroup(orGroup, context)
  assert(evalOr.satisfied, 'Composite OR group: satisfied when at least one condition passes')

  // ─────────────────────────────────────────────────────────────
  // 4. HISTORICAL RULE VERSION SELECTION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Historical RuleVersion Selection ---')

  const mockRuleWithVersions: RuleWithVersionsLike = {
    id: 'rule-placeholder-01',
    ruleNumber: 'Placeholder-Rule-01',
    title: 'Unit Sale Price Declaration',
    requirement: 'Architectural placeholder requirement',
    sourceDocument: 'Legal Metrology Rules',
    effectiveDate: new Date('2021-01-01'),
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2021-01-01'),
        changeDescription: 'Initial enactment',
        snapshot: {
          title: 'Unit Sale Price (2021 Standard)',
          requirement: 'Old unit price format',
          defaultSeverity: 'MEDIUM',
        },
      },
      {
        versionNumber: 2,
        effectiveDate: new Date('2024-01-01'),
        changeDescription: 'Amended unit price format requirements',
        snapshot: {
          title: 'Unit Sale Price (2024 Amended Standard)',
          requirement: 'New unit price format',
          defaultSeverity: 'HIGH',
        },
      },
    ],
  }

  // Product packed in 2022 (should select Version 1)
  const sel2022 = selectHistoricalRuleVersion(
    mockRuleWithVersions,
    new Date('2022-06-15')
  )
  assert(
    sel2022.applicable && sel2022.selectedVersionNumber === 1,
    'Historical selection: product packed in 2022 selects Version 1 (2021 enactment)'
  )
  assert(
    sel2022.ruleDefinition.title === 'Unit Sale Price (2021 Standard)',
    'Historical selection: Version 1 snapshot properties loaded'
  )

  // Product packed in 2024 (should select Version 2)
  const sel2024 = selectHistoricalRuleVersion(
    mockRuleWithVersions,
    new Date('2024-06-15')
  )
  assert(
    sel2024.applicable && sel2024.selectedVersionNumber === 2,
    'Historical selection: product packed in 2024 selects Version 2 (2024 amendment)'
  )
  assert(
    sel2024.ruleDefinition.defaultSeverity === 'HIGH',
    'Historical selection: Version 2 severity loaded'
  )

  // Product manufactured before rule enactment (e.g. 2019)
  const sel2019 = selectHistoricalRuleVersion(
    mockRuleWithVersions,
    new Date('2019-01-01')
  )
  assert(
    !sel2019.applicable,
    'Historical selection: product packed prior to rule enactment is NOT_APPLICABLE'
  )
  assert(
    sel2019.notApplicableReason?.includes('not yet in effect') ?? false,
    'Historical selection: clear statutory reason provided for pre-enactment commodity'
  )

  // ─────────────────────────────────────────────────────────────
  // 5. APPLICABILITY EVALUATOR (CATEGORY & CRITERIA)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Applicability Evaluator ---')

  const foodRule = {
    ...sel2024.ruleDefinition,
    productCategoryId: 'Biscuits & Cookies',
  }
  assert(
    evaluateRuleApplicability(foodRule, context).applicable,
    'Applicability: matching product category is applicable'
  )

  const electronicsRule = {
    ...sel2024.ruleDefinition,
    productCategoryId: 'Electronics & Appliances',
  }
  const evalElec = evaluateRuleApplicability(electronicsRule, context)
  assert(
    !evalElec.applicable,
    'Applicability: non-matching product category is NOT_APPLICABLE'
  )

  // Statutory Exception: Commodity net quantity < 10g exemption test
  const exemptRule = {
    ...sel2024.ruleDefinition,
    exceptions: [
      {
        operator: 'AND' as const,
        conditions: [
          {
            field: 'declarations.net_quantity',
            operator: 'NUMERIC_LT' as const,
            value: 200, // mock threshold: net weight < 200g qualifies for exemption
          },
        ],
      },
    ],
  }
  const evalExempt = evaluateRuleApplicability(exemptRule, context)
  assert(
    !evalExempt.applicable,
    'Applicability: qualifies for statutory exception when condition met'
  )

  // ─────────────────────────────────────────────────────────────
  // 6. DETERMINISTIC RULE ENGINE EXECUTION & VIOLATION CREATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Deterministic Rule Engine Execution ---')

  // Placeholder Test Rules:
  // Rule A: Mandatory MRP (Passes -> ComplianceCheck: PASS, NO Violation)
  const ruleA: RuleWithVersionsLike = {
    id: 'test-rule-mrp',
    ruleNumber: 'Placeholder-Rule-MRP',
    title: 'Mandatory MRP Declaration',
    requirement: 'Package must bear maximum retail price',
    sourceDocument: 'Test Framework Rules',
    effectiveDate: new Date('2020-01-01'),
    defaultSeverity: 'HIGH',
    conditions: {
      operator: 'AND',
      conditions: [
        {
          field: 'declarations.mrp',
          operator: 'EXISTS',
          failureMessage: 'MRP is missing',
        },
      ],
    },
  }

  // Rule B: Mandatory Consumer Care (Fails with HIGH severity -> ComplianceCheck: FAIL + Violation)
  const ruleB: RuleWithVersionsLike = {
    id: 'test-rule-care',
    ruleNumber: 'Placeholder-Rule-Care',
    title: 'Consumer Care Contact Details',
    requirement: 'Package must display consumer care contact',
    sourceDocument: 'Test Framework Rules',
    effectiveDate: new Date('2020-01-01'),
    defaultSeverity: 'HIGH',
    remediationGuidance: 'Affix label with telephone number and email address for consumer complaints',
    conditions: {
      operator: 'AND',
      conditions: [
        {
          field: 'declarations.consumer_care',
          operator: 'EXISTS',
          failureMessage: 'No consumer care details identified on package',
        },
      ],
    },
  }

  // Rule C: Advisory Font Height / Contrast (Fails with LOW severity -> ComplianceCheck: WARNING, NO Violation)
  const ruleC: RuleWithVersionsLike = {
    id: 'test-rule-advisory',
    ruleNumber: 'Placeholder-Rule-Advisory',
    title: 'Packaging Clarity Recommendation',
    requirement: 'Advisory guidance for declaration contrast',
    sourceDocument: 'Test Framework Rules',
    effectiveDate: new Date('2020-01-01'),
    defaultSeverity: 'LOW',
    conditions: {
      operator: 'AND',
      conditions: [
        {
          field: 'declarations.font_contrast',
          operator: 'EXISTS',
          failureMessage: 'Contrast recommendation not confirmed',
        },
      ],
    },
  }

  // Rule D: Out of scope category (Not applicable -> ComplianceCheck: NOT_APPLICABLE, NO Violation)
  const ruleD: RuleWithVersionsLike = {
    id: 'test-rule-cement',
    ruleNumber: 'Placeholder-Rule-Cement',
    title: 'Cement Bag Packaging Standard',
    requirement: 'Cement specific declaration',
    productCategoryId: 'Construction & Building Materials',
    sourceDocument: 'Test Framework Rules',
    effectiveDate: new Date('2020-01-01'),
    defaultSeverity: 'MEDIUM',
    conditions: {
      operator: 'AND',
      conditions: [{ field: 'declarations.mrp', operator: 'EXISTS' }],
    },
  }

  const execution = evaluateRules(context, [ruleA, ruleB, ruleC, ruleD])

  assert(execution.totalEvaluated === 4, 'Engine evaluated all 4 test rules')
  assert(execution.passedCount === 1, 'Passed count is 1 (Rule A)')
  assert(execution.warningCount === 1, 'Warning count is 1 (Rule C)')
  assert(execution.failedCount === 1, 'Failed count is 1 (Rule B)')
  assert(execution.notApplicableCount === 1, 'Not applicable count is 1 (Rule D)')

  // Check Rule A result
  const resA = execution.results.find((r) => r.ruleId === 'test-rule-mrp')
  assert(resA?.status === 'PASS', 'Rule A produced status: PASS')

  // Check Rule C result (WARNING)
  const resC = execution.results.find((r) => r.ruleId === 'test-rule-advisory')
  assert(resC?.status === 'WARNING', 'Rule C produced status: WARNING')

  // Check Rule D result (NOT_APPLICABLE)
  const resD = execution.results.find((r) => r.ruleId === 'test-rule-cement')
  assert(resD?.status === 'NOT_APPLICABLE', 'Rule D produced status: NOT_APPLICABLE')

  // Check Rule B result (FAIL)
  const resB = execution.results.find((r) => r.ruleId === 'test-rule-care')
  assert(resB?.status === 'FAIL', 'Rule B produced status: FAIL')

  // STRICT VIOLATION CREATION CHECK:
  // "Change violation generation so only FAIL automatically creates a formal Violation.
  //  WARNING should remain an advisory compliance finding unless a specific researched rule later defines otherwise."
  assert(
    execution.violations.length === 1,
    'Violations list contains EXACTLY 1 violation candidate (FAIL only)'
  )
  assert(
    execution.violations[0]?.ruleId === 'test-rule-care',
    'The 1 violation belongs to Rule B (FAIL)'
  )
  assert(
    execution.violations.every((v) => v.ruleId !== 'test-rule-advisory'),
    'Rule C (WARNING) DID NOT produce a formal Violation candidate'
  )
  assert(
    execution.violations.every((v) => v.ruleId !== 'test-rule-mrp'),
    'Rule A (PASS) DID NOT produce a Violation candidate'
  )

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n======================================================')
  console.log(`  PHASE 3A TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
