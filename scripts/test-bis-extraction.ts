import { HeuristicAnalysisProvider } from '../src/lib/ai/heuristic-analyzer'
import {
  MANDATORY_DECLARATION_FIELDS,
  BIS_DECLARATION_FIELDS,
  type AnalysisResult,
} from '../src/lib/ai/types'

async function runBisExtractionTests() {
  console.log('=================================================================')
  console.log('  VeriQO PS107 — BIS AI Extraction Verification Tests')
  console.log('=================================================================\n')

  const analyzer = new HeuristicAnalysisProvider()
  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  PASS: ${testName}`)
      passed++
    } else {
      console.error(`  FAIL: ${testName} ${detail ? `(${detail})` : ''}`)
      failed++
    }
  }

  // ---------------------------------------------------------------------------
  // Test Case 1: "ISI MARK CM/L-123456789"
  // Expected: isi_mark detected, cml_number detected as 123456789
  // ---------------------------------------------------------------------------
  console.log('[Test Case 1] Input: "ISI MARK CM/L-123456789"')
  const r1: AnalysisResult = await analyzer.analyzePackage('ISI MARK CM/L-123456789')
  assert(
    Boolean(r1.isi_mark && r1.isi_mark.detectionStatus === 'DETECTED'),
    'isi_mark detected on AnalysisResult'
  )
  assert(
    Boolean(r1.cml_number && r1.cml_number.normalizedValue === '123456789'),
    'cml_number detected as 123456789 (normalizedValue)'
  )
  assert(
    Boolean(r1.cml_number && r1.cml_number.rawValue === '123456789'),
    'cml_number rawValue is 123456789'
  )
  assert(
    Boolean(
      r1.declarations.find((d) => d.fieldName === 'isi_mark')?.detectionStatus === 'DETECTED'
    ),
    'isi_mark is DETECTED in declarations array'
  )
  assert(
    Boolean(
      r1.declarations.find((d) => d.fieldName === 'cml_number')?.detectionStatus === 'DETECTED'
    ),
    'cml_number is DETECTED in declarations array'
  )

  // ---------------------------------------------------------------------------
  // Test Case 2: "BIS Registration R-12345678"
  // Expected: crs_registration_number = R-12345678, isi_mark not detected
  // ---------------------------------------------------------------------------
  console.log('\n[Test Case 2] Input: "BIS Registration R-12345678"')
  const r2: AnalysisResult = await analyzer.analyzePackage('BIS Registration R-12345678')
  assert(
    Boolean(r2.crs_registration_number && r2.crs_registration_number.normalizedValue === 'R-12345678'),
    'crs_registration_number = R-12345678'
  )
  assert(
    Boolean(r2.crs_registration_number && r2.crs_registration_number.detectionStatus === 'DETECTED'),
    'crs_registration_number detectionStatus is DETECTED'
  )
  assert(
    r2.isi_mark === null,
    'isi_mark is not detected merely because "BIS" appears'
  )

  // ---------------------------------------------------------------------------
  // Test Case 3: "HUID ABC123 22K916"
  // Expected: hallmark_huid = ABC123
  // ---------------------------------------------------------------------------
  console.log('\n[Test Case 3] Input: "HUID ABC123 22K916"')
  const r3: AnalysisResult = await analyzer.analyzePackage('HUID ABC123 22K916')
  assert(
    Boolean(r3.hallmark_huid && r3.hallmark_huid.normalizedValue === 'ABC123'),
    'hallmark_huid = ABC123'
  )
  assert(
    Boolean(r3.hallmark_huid && r3.hallmark_huid.detectionStatus === 'DETECTED'),
    'hallmark_huid detectionStatus is DETECTED'
  )

  // ---------------------------------------------------------------------------
  // Test Case 4: "random product text ABC123"
  // Expected: hallmark_huid should NOT automatically be detected
  // ---------------------------------------------------------------------------
  console.log('\n[Test Case 4] Input: "random product text ABC123"')
  const r4: AnalysisResult = await analyzer.analyzePackage('random product text ABC123')
  assert(
    r4.hallmark_huid === null,
    'hallmark_huid is NOT detected without hallmark/HUID context'
  )
  assert(
    Boolean(
      r4.declarations.find((d) => d.fieldName === 'hallmark_huid')?.detectionStatus === 'NOT_DETECTED'
    ),
    'hallmark_huid is NOT_DETECTED in declarations array'
  )

  // ---------------------------------------------------------------------------
  // Test Case 5: Input with no BIS information
  // Expected: Existing LMPC extraction works exactly as before, BIS fields undetected/null
  // ---------------------------------------------------------------------------
  console.log('\n[Test Case 5] Input with no BIS information:')
  const sampleLmpcText = `Britannia Good Day Butter Cookies
Mfd by Britannia Industries Ltd, 5/1A Hungerford Street, Kolkata - 700017
Net Quantity: 100 g
MRP Rs. 30.00 (Incl. of all taxes)
USP Rs. 0.30/g
Pkd on 15/01/2024
Best Before 6 months from packaging
Batch No: B1234
Customer Care: 1800-425-4444 or feedback@britannia.co.in
Country of Origin: India`

  const r5: AnalysisResult = await analyzer.analyzePackage(sampleLmpcText)

  // Verify all BIS fields remain null
  assert(r5.isi_mark === null, 'BIS isi_mark is null')
  assert(r5.cml_number === null, 'BIS cml_number is null')
  assert(r5.hallmark_huid === null, 'BIS hallmark_huid is null')
  assert(r5.crs_registration_number === null, 'BIS crs_registration_number is null')

  // Verify all BIS fields in declarations are NOT_DETECTED
  for (const bisField of BIS_DECLARATION_FIELDS) {
    const decl = r5.declarations.find((d) => d.fieldName === bisField.fieldName)
    assert(
      Boolean(decl && decl.detectionStatus === 'NOT_DETECTED' && decl.rawValue === null),
      `BIS field "${bisField.fieldName}" in declarations is NOT_DETECTED with rawValue: null`
    )
  }

  // Verify all 15 LMPC mandatory fields exist in declarations
  for (const lmpcField of MANDATORY_DECLARATION_FIELDS) {
    const decl = r5.declarations.find((d) => d.fieldName === lmpcField.fieldName)
    assert(
      Boolean(decl && decl.fieldName === lmpcField.fieldName),
      `Mandatory LMPC field "${lmpcField.fieldName}" is preserved in declarations`
    )
  }

  // Verify specific LMPC extracted values
  const mrpDecl = r5.declarations.find((d) => d.fieldName === 'mrp')
  assert(
    Boolean(mrpDecl && mrpDecl.detectionStatus === 'DETECTED' && mrpDecl.rawValue === '₹30.00'),
    `LMPC MRP extracted correctly: ${mrpDecl?.rawValue}`
  )

  const netQtyDecl = r5.declarations.find((d) => d.fieldName === 'net_quantity')
  assert(
    Boolean(netQtyDecl && netQtyDecl.detectionStatus === 'DETECTED' && netQtyDecl.rawValue === '100 g'),
    `LMPC Net Quantity extracted correctly: ${netQtyDecl?.rawValue}`
  )

  const mfgDecl = r5.declarations.find((d) => d.fieldName === 'manufacturer')
  assert(
    Boolean(mfgDecl && mfgDecl.detectionStatus === 'DETECTED' && mfgDecl.rawValue?.includes('Britannia Industries')),
    `LMPC Manufacturer extracted correctly: ${mfgDecl?.rawValue}`
  )

  assert(
    r5.product.brand === 'Britannia' && r5.product.status === 'IDENTIFIED',
    `LMPC Product identification works: brand=${r5.product.brand}, status=${r5.product.status}`
  )

  console.log('\n-----------------------------------------------------------------')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('-----------------------------------------------------------------\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runBisExtractionTests().catch((err) => {
  console.error('Test runner encountered error:', err)
  process.exit(1)
})
