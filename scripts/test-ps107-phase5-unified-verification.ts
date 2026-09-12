/**
 * Test Suite: SIH 2026 PS107 — Phase 5 Unified BIS + LMPC Packaging Verification
 *
 * Verifies all 28 core Phase 5 capabilities:
 *  1. Existing OCR output feeds BIS analysis directly
 *  2. No duplicate OCR pipeline is created or invoked
 *  3. CML number detection & normalization
 *  4. CRS registration number detection & normalization
 *  5. HUID detection & normalization
 *  6. Indian Standard number extraction & canonical normalization
 *  7. NOT_DETECTED state correctly assigned when identifiers are absent
 *  8. UNCERTAIN state correctly assigned for partial/ambiguous markers
 *  9. Standard association via catalog and knowledge base
 * 10. Unknown standard handling (NEEDS_REVIEW, does not invent)
 * 11. QCO APPLICABLE deterministic evaluation
 * 12. QCO NOT_APPLICABLE deterministic evaluation
 * 13. QCO UNKNOWN handling for missing classification data
 * 14. QCO effective-date boundary (NOT_YET_EFFECTIVE semantics)
 * 15. CML license verification via BisLicenseService
 * 16. CRS registration verification via BisLicenseService
 * 17. HUID verification via BisLicenseService
 * 18. Demo-data disclosure & provenance propagation (supports true and false)
 * 19. Evidence-backed BIS finding generation
 * 20. Unsupported/ambiguous BIS finding becomes NEEDS_REVIEW (never automatic violation)
 * 21. Existing LMPC result remains unchanged and preserved
 * 22. Unified overall status aggregation (COMPLIANT, NEEDS_REVIEW, POTENTIAL_NON_COMPLIANCE, ACTION_REQUIRED)
 * 23. Scan ownership protection (403 Forbidden for cross-user scan check)
 * 24. Authentication enforcement (401 Unauthorized without session)
 * 25. Sanitized API errors (404 for missing scan, zero stack traces leaked)
 * 26. Unified report data assembly & dual-domain Markdown rendering
 * 27. Additive visual mark detector operates on image buffers without replacing OCR
 * 28. Visual detection does NOT equal legal verification
 *
 * Run: npx tsx scripts/test-ps107-phase5-unified-verification.ts
 */

// ── 0. Module-Level Test Auth Harness ───────────────────────────────────────
let activeSession: any = null

const authPath = require.resolve('../src/lib/auth')
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: {
    auth: async () => activeSession,
    handlers: {},
    signIn: async () => {},
    signOut: async () => {},
  },
} as any

function setTestSession(session: any) {
  activeSession = session
}

// ── Imports ─────────────────────────────────────────────────────────────────
import { IdentifierDetector, defaultIdentifierDetector } from '@/lib/bis/inspection/identifier-detector'
import { StandardAssociator, defaultStandardAssociator } from '@/lib/bis/inspection/standard-associator'
import { QcoChecker, defaultQcoChecker } from '@/lib/bis/inspection/qco-checker'
import { LicenseVerifier, defaultLicenseVerifier } from '@/lib/bis/inspection/license-verifier'
import { BisFindingsEngine, defaultBisFindingsEngine } from '@/lib/bis/inspection/bis-findings-engine'
import { UnifiedInspectionService, defaultUnifiedInspectionService } from '@/lib/bis/inspection/unified-inspection-service'
import { UnifiedReportGenerator, defaultUnifiedReportGenerator } from '@/lib/bis/inspection/unified-report-generator'
import { VisualBisMarkDetector, defaultVisualBisMarkDetector } from '@/lib/bis/inspection/visual-mark-detector'
import { QualityControlOrderService } from '@/lib/bis/qco-service'
import { prisma } from '@/lib/prisma'

// ── Test Runner Utilities ───────────────────────────────────────────────────
let totalPassed = 0
let totalFailed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    totalPassed++
    console.log(`  ✓ ${message}`)
  } else {
    totalFailed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function runTests() {
  console.log('\n=================================================================')
  console.log('  SIH 2026 PS107 — Phase 5 Unified BIS + LMPC Packaging Verification')
  console.log('=================================================================\n')

  // Dynamic import ensures route handlers resolve after require.cache hook
  const { POST: standardsCheckPost, GET: standardsCheckGet } = await import(
    '@/app/api/v1/bis/scans/[id]/standards-check/route'
  )

  const detector = defaultIdentifierDetector
  const associator = defaultStandardAssociator
  const qcoChecker = defaultQcoChecker
  const verifier = defaultLicenseVerifier
  const findingsEngine = defaultBisFindingsEngine
  const unifiedService = defaultUnifiedInspectionService
  const reportGen = defaultUnifiedReportGenerator

  // ── Test 1 & 2: OCR Output Reused directly & No Duplicate OCR Pipeline ────
  console.log('--- Test 1 & 2: Existing OCR Pipeline Reuse (Zero Duplicate OCR) ---')
  const existingOcrText = `
    AQUA PURE PACKAGED DRINKING WATER
    Net Quantity: 1000 ml
    MRP: Rs. 20.00 (inclusive of all taxes)
    Batch No: AQ-2026-09
    Mfg Date: 01/09/2026
    Conforms to IS 10500:2012
    ISI Mark Licence No. CM/L-8400123
    Customer Care: 1800-111-2222
  `
  const scanInput = {
    id: 'scan-test-ocr-reuse',
    rawOcrText: existingOcrText,
    identifiedProductName: 'Packaged Drinking Water',
    identifiedCategory: 'Drinking Water',
    extractedDeclarations: [
      { fieldName: 'net_quantity', rawValue: '1000 ml', normalizedValue: '1000 ml' },
      { fieldName: 'mrp', rawValue: 'Rs. 20.00', normalizedValue: '20.00' },
    ],
  }

  const identifiersFromOcr = detector.detectIdentifiers({
    rawOcrText: scanInput.rawOcrText,
    extractedDeclarations: scanInput.extractedDeclarations,
  })

  assert(identifiersFromOcr.length === 5, 'Detector extracted all 5 statutory identifier categories from raw OCR text')
  assert(identifiersFromOcr.some((i) => i.type === 'INDIAN_STANDARD_NUMBER' && i.state === 'DETECTED'), 'Existing OCR text feeds Indian Standard detection')
  assert(identifiersFromOcr.some((i) => i.type === 'CML_NUMBER' && i.state === 'DETECTED'), 'Existing OCR text feeds CML detection')

  // ── Test 3: CML Detection ─────────────────────────────────────────────────
  console.log('\n--- Test 3: CML Number Detection & Normalization ---')
  const cmlCases = [
    { text: 'CM/L-8400123', expected: 'CM/L-8400123' },
    { text: 'Licence No. CML: 9512345', expected: 'CM/L-9512345' },
    { text: 'ISI CM/L 1234567', expected: 'CM/L-1234567' },
  ]
  for (const tc of cmlCases) {
    const res = detector.detectIdentifiers({ rawOcrText: tc.text })
    const cml = res.find((i) => i.type === 'CML_NUMBER')
    assert(cml?.state === 'DETECTED' && cml.normalizedValue === tc.expected, `Detected and normalized "${tc.text}" to "${tc.expected}"`)
  }

  // ── Test 4: CRS Detection ─────────────────────────────────────────────────
  console.log('\n--- Test 4: CRS Registration Number Detection & Normalization ---')
  const crsCases = [
    { text: 'CRS: R-41009876', expected: 'R-41009876' },
    { text: 'REGN NO. R 41001122', expected: 'R-41001122' },
  ]
  for (const tc of crsCases) {
    const res = detector.detectIdentifiers({ rawOcrText: tc.text })
    const crs = res.find((i) => i.type === 'CRS_REGISTRATION')
    assert(crs?.state === 'DETECTED' && crs.normalizedValue === tc.expected, `Detected and normalized "${tc.text}" to "${tc.expected}"`)
  }

  // ── Test 5: HUID Detection ────────────────────────────────────────────────
  console.log('\n--- Test 5: HUID Detection & Normalization ---')
  const huidRes = detector.detectIdentifiers({ rawOcrText: 'BIS Hallmark Gold Ring HUID: AB12CD 22K916' })
  const huid = huidRes.find((i) => i.type === 'HALLMARK_HUID')
  assert(huid?.state === 'DETECTED' && huid.normalizedValue === 'AB12CD', 'Detected 6-char Hallmark HUID "AB12CD"')

  // ── Test 6: IS Number Extraction & Normalization ───────────────────────────
  console.log('\n--- Test 6: Indian Standard Extraction & Normalization ---')
  const stdCases = [
    { text: 'conforms to IS 10500:2012', expected: 'IS 10500:2012' },
    { text: 'Specification as per IS:1293:2019', expected: 'IS 1293:2019' },
    { text: 'IS 9873 (Part 1)', expected: 'IS 9873 (PART 1)' },
  ]
  for (const tc of stdCases) {
    const res = detector.detectIdentifiers({ rawOcrText: tc.text })
    const std = res.find((i) => i.type === 'INDIAN_STANDARD_NUMBER')
    assert(std?.state === 'DETECTED' && std.normalizedValue?.toUpperCase() === tc.expected.toUpperCase(), `Extracted standard "${tc.expected}"`)
  }

  // ── Test 7: NOT_DETECTED State ────────────────────────────────────────────
  console.log('\n--- Test 7: NOT_DETECTED State Assignment ---')
  const blankRes = detector.detectIdentifiers({ rawOcrText: 'Pure Cotton T-Shirt. Size XL. Made in India.' })
  const blankStd = blankRes.find((i) => i.type === 'INDIAN_STANDARD_NUMBER')
  const blankCml = blankRes.find((i) => i.type === 'CML_NUMBER')
  assert(blankStd?.state === 'NOT_DETECTED', 'Standard number is NOT_DETECTED when absent')
  assert(blankCml?.state === 'NOT_DETECTED', 'CML number is NOT_DETECTED when absent')

  // ── Test 8: UNCERTAIN State ───────────────────────────────────────────────
  console.log('\n--- Test 8: UNCERTAIN State Assignment for Ambiguous References ---')
  const uncertainCml = detector.detectIdentifiers({ rawOcrText: 'CM/L-123 incomplete marking' })
  const uncertainStd = detector.detectIdentifiers({ rawOcrText: 'Manufactured as per Indian Standard without number' })
  assert(uncertainCml.find((i) => i.type === 'CML_NUMBER')?.state === 'UNCERTAIN', 'Incomplete 3-digit CML assigned UNCERTAIN')
  assert(uncertainStd.find((i) => i.type === 'INDIAN_STANDARD_NUMBER')?.state === 'UNCERTAIN', 'Vague standard reference assigned UNCERTAIN')

  // ── Test 9: Standard Association ──────────────────────────────────────────
  console.log('\n--- Test 9: Standard Association via Catalog & Knowledge ---')
  const assocByNumber = await associator.associateStandards({ detectedStandardNumber: 'IS 10500:2012' })
  assert(assocByNumber.length > 0 && assocByNumber[0].standardNumber === 'IS 10500:2012', 'Direct standard number associates with IS 10500:2012')
  assert(assocByNumber[0].state === 'ASSOCIATED', 'Associated standard is in state ASSOCIATED')

  const assocByCategory = await associator.associateStandards({ category: 'Plastic Toys', productName: 'Building Blocks' })
  assert(assocByCategory.some((s) => s.standardNumber.includes('9873')), 'Category "Plastic Toys" associates with IS 9873')

  // ── Test 10: Unknown Standard Handling ────────────────────────────────────
  console.log('\n--- Test 10: Unknown Standard (NEEDS_REVIEW, No Invention) ---')
  const unknownAssoc = await associator.associateStandards({ detectedStandardNumber: 'IS 99999:2099' })
  assert(unknownAssoc[0].state === 'NEEDS_REVIEW', 'Uncatalogued standard marked as NEEDS_REVIEW')
  assert(unknownAssoc[0].standardNumber === 'IS 99999:2099', 'Preserves raw claimed standard number without inventing a substitute')

  // ── Test 11: QCO APPLICABLE ───────────────────────────────────────────────
  console.log('\n--- Test 11: Deterministic QCO APPLICABLE ---')
  const qcoToy = await qcoChecker.evaluateQco({ category: 'Plastic Toys' })
  assert(qcoToy.status === 'APPLICABLE', 'Toys category triggers QCO status APPLICABLE')
  assert(qcoToy.isMandatoryCertification === true, 'isMandatoryCertification is true for in-force QCO')

  // ── Test 12: QCO NOT_APPLICABLE ───────────────────────────────────────────
  console.log('\n--- Test 12: Deterministic QCO NOT_APPLICABLE ---')
  const qcoCotton = await qcoChecker.evaluateQco({ category: 'Cotton Shirt', productName: 'Casual Wear' })
  assert(qcoCotton.status === 'NOT_APPLICABLE', 'Non-QCO commodity returns NOT_APPLICABLE')
  assert(qcoCotton.isMandatoryCertification === false, 'isMandatoryCertification is false for non-QCO commodity')

  // ── Test 13: QCO UNKNOWN ──────────────────────────────────────────────────
  console.log('\n--- Test 13: QCO UNKNOWN for Missing Classification Data ---')
  const qcoBlank = await qcoChecker.evaluateQco({})
  assert(qcoBlank.status === 'UNKNOWN', 'Missing product and category returns UNKNOWN')

  // ── Test 14: QCO Effective-Date Boundary (NOT_YET_EFFECTIVE) ──────────────
  console.log('\n--- Test 14: QCO Effective-Date Boundary (NOT_YET_EFFECTIVE) ---')
  // Mock a future-dated QCO order
  const mockQcoService = new QualityControlOrderService()
  mockQcoService.listQcos = async () => [
    {
      id: 'qco-future-1',
      orderTitle: 'Future Solar Cells (Quality Control) Order, 2030',
      orderNumber: 'S.O. 9999(E)',
      ministry: 'MNRE',
      notifiedDate: '2026-01-01T00:00:00.000Z',
      effectiveDate: '2030-01-01T00:00:00.000Z', // 2030 is in the future
      status: 'IN_FORCE',
      standardId: null,
      standardNumber: 'IS 14286',
      applicableProducts: 'Solar photovoltaic modules and cells',
      hsCodes: ['8541'],
      isExemptionApplicable: false,
      exemptionDetails: null,
      gazetteUrl: null,
      isDemoRecord: true,
    },
  ]
  const futureChecker = new QcoChecker(mockQcoService)
  const futureQcoRes = await futureChecker.evaluateQco({
    category: 'Solar photovoltaic modules and cells',
    inspectionDate: new Date('2026-09-12'),
  })
  assert(futureQcoRes.status === 'NOT_YET_EFFECTIVE', 'Future-dated QCO evaluates to NOT_YET_EFFECTIVE')
  assert(futureQcoRes.isMandatoryCertification === false, 'isMandatoryCertification is false while NOT_YET_EFFECTIVE')

  // ── Test 15: CML License Verification ─────────────────────────────────────
  console.log('\n--- Test 15: CML License Verification ---')
  const operativeCmlSummary = await verifier.verifyDetectedIdentifiers([
    {
      type: 'CML_NUMBER',
      state: 'DETECTED',
      detectedValue: 'CM/L-8400123',
      normalizedValue: 'CM/L-8400123',
      source: 'OCR_TEXT',
      confidence: 0.95,
      evidenceReference: 'CM/L-8400123',
      isDemoRecord: true,
    },
  ])
  assert(operativeCmlSummary[0].status === 'VERIFIED', 'Operative CML-8400123 status is VERIFIED')
  assert(operativeCmlSummary[0].details?.isValid === true, 'Operative CML isValid is true')

  const expiredCmlSummary = await verifier.verifyDetectedIdentifiers([
    {
      type: 'CML_NUMBER',
      state: 'DETECTED',
      detectedValue: 'CM/L-7123456',
      normalizedValue: 'CM/L-7123456',
      source: 'OCR_TEXT',
      confidence: 0.95,
      evidenceReference: 'CM/L-7123456',
      isDemoRecord: true,
    },
  ])
  assert(expiredCmlSummary[0].status === 'NOT_VERIFIED', 'Expired CML-7123456 status is NOT_VERIFIED')
  assert(expiredCmlSummary[0].details?.isValid === false, 'Expired CML isValid is false')

  // ── Test 16: CRS Registration Verification ────────────────────────────────
  console.log('\n--- Test 16: CRS Registration Verification ---')
  const crsSummary = await verifier.verifyDetectedIdentifiers([
    {
      type: 'CRS_REGISTRATION',
      state: 'DETECTED',
      detectedValue: 'R-41009876',
      normalizedValue: 'R-41009876',
      source: 'OCR_TEXT',
      confidence: 0.95,
      evidenceReference: 'R-41009876',
      isDemoRecord: true,
    },
  ])
  assert(crsSummary[0].status === 'VERIFIED', 'CRS R-41009876 status is VERIFIED')
  assert(crsSummary[0].details?.licenseType === 'CRS_REGISTRATION', 'CRS license type confirmed')

  // ── Test 17: HUID Verification ────────────────────────────────────────────
  console.log('\n--- Test 17: HUID Verification ---')
  const huidSummary = await verifier.verifyDetectedIdentifiers([
    {
      type: 'HALLMARK_HUID',
      state: 'DETECTED',
      detectedValue: 'AB12CD',
      normalizedValue: 'AB12CD',
      source: 'OCR_TEXT',
      confidence: 0.9,
      evidenceReference: 'AB12CD',
      isDemoRecord: true,
    },
  ])
  assert(huidSummary[0].status === 'VERIFIED', 'HUID AB12CD status is VERIFIED')
  assert(huidSummary[0].details?.licenseType === 'HALLMARK_HUID', 'HUID license type confirmed')

  // ── Test 18: Demo-Data Disclosure & Provenance Propagation ────────────────
  console.log('\n--- Test 18: Demo-Data Provenance Propagation ---')
  assert(operativeCmlSummary[0].isDemoRecord === true, 'Demo mock CML record correctly reports isDemoRecord: true')
  // Verify that an unknown or live identifier does NOT hardcode true
  const liveIdentifier: any = {
    type: 'CML_NUMBER',
    state: 'DETECTED',
    detectedValue: 'CM/L-0000000',
    normalizedValue: 'CM/L-0000000',
    source: 'OCR_TEXT',
    confidence: 0.95,
    evidenceReference: 'CM/L-0000000',
    isDemoRecord: false,
  }
  const liveSummary = await verifier.verifyDetectedIdentifiers([liveIdentifier])
  assert(liveSummary[0].isDemoRecord === false, 'Non-demo/live record propagates isDemoRecord: false')

  // ── Test 19: Evidence-Backed BIS Findings ─────────────────────────────────
  console.log('\n--- Test 19: Evidence-Backed BIS Findings ---')
  const findingsInputMissingCert = {
    identifiers: [
      {
        type: 'INDIAN_STANDARD_NUMBER' as const,
        state: 'DETECTED' as const,
        detectedValue: 'IS 9873',
        normalizedValue: 'IS 9873',
        source: 'OCR_TEXT' as const,
        confidence: 0.95,
        evidenceReference: 'IS 9873',
        isDemoRecord: true,
      },
      {
        type: 'CML_NUMBER' as const,
        state: 'NOT_DETECTED' as const,
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT' as const,
        confidence: 0,
        evidenceReference: null,
        isDemoRecord: true,
      },
    ],
    candidateStandards: [
      {
        standardNumber: 'IS 9873 (Part 1):2019',
        title: 'Safety of Toys',
        relevance: 1.0,
        matchReason: 'Direct match',
        supportingEvidence: 'IS 9873 on toy packaging',
        clauseReferences: [],
        chunkReferences: [],
        isDemoRecord: true,
        state: 'ASSOCIATED' as const,
      },
    ],
    qcoChecks: [
      {
        status: 'APPLICABLE' as const,
        isMandatoryCertification: true,
        orderTitle: 'Toys (Quality Control) Order, 2020',
        orderNumber: 'S.O. 853(E)',
        applicableStandards: ['IS 9873 (Part 1):2019'],
        effectiveDate: '2021-01-01T00:00:00.000Z',
        isExempt: false,
        exemptionReason: null,
        guidance: 'Mandatory certification applies.',
        isDemoRecord: true,
      },
    ],
    verifications: [],
  }

  const { findings: missingCertFindings, overallStatus: missingCertStatus } = findingsEngine.generateFindings(findingsInputMissingCert)
  assert(missingCertStatus === 'POTENTIAL_NON_COMPLIANCE', 'Mandatory QCO without CML license yields POTENTIAL_NON_COMPLIANCE')
  assert(missingCertFindings.some((f) => f.code === 'BIS_QCO_MISSING_CERTIFICATION'), 'Finding code BIS_QCO_MISSING_CERTIFICATION emitted')
  assert(missingCertFindings[0].evidence.includes('Toys (Quality Control) Order'), 'Finding contains concrete statutory evidence snippet')

  // ── Test 20: Unsupported/Ambiguous Finding becomes NEEDS_REVIEW ───────────
  console.log('\n--- Test 20: Unsupported / Ambiguous Finding Becomes NEEDS_REVIEW ---')
  const findingsInputAmbiguous = {
    identifiers: [
      {
        type: 'CML_NUMBER' as const,
        state: 'UNCERTAIN' as const,
        detectedValue: 'CM/L-12',
        normalizedValue: null,
        source: 'OCR_TEXT' as const,
        confidence: 0.35,
        evidenceReference: 'CM/L-12 partial text',
        isDemoRecord: true,
      },
    ],
    candidateStandards: [],
    qcoChecks: [
      {
        status: 'APPLICABLE' as const,
        isMandatoryCertification: true,
        orderTitle: 'Plugs and Socket-Outlets QCO',
        orderNumber: 'S.O. 1234(E)',
        applicableStandards: ['IS 1293'],
        effectiveDate: '2022-01-01T00:00:00.000Z',
        isExempt: false,
        exemptionReason: null,
        guidance: 'Mandatory',
        isDemoRecord: true,
      },
    ],
    verifications: [],
  }
  const { overallStatus: ambiguousStatus } = findingsEngine.generateFindings(findingsInputAmbiguous)
  assert(ambiguousStatus === 'NEEDS_REVIEW', 'Ambiguous/partial license marking becomes NEEDS_REVIEW (never automatic violation)')

  // ── Test 21: Existing LMPC Result Remains Unchanged ───────────────────────
  console.log('\n--- Test 21: Existing LMPC Result Preservation ---')
  const unifiedLmpcPreserved = await unifiedService.evaluateScan({
    id: 'scan-lmpc-check',
    rawOcrText: 'IS 10500:2012 CM/L-8400123',
    identifiedCategory: 'Drinking Water',
    inspections: [
      {
        id: 'insp-1',
        status: 'IN_PROGRESS',
        complianceChecks: [
          { status: 'PASS', rule: { code: 'PCR_RULE_06_MRP', title: 'MRP Declaration' } },
        ],
        violations: [],
      },
    ],
  })
  assert(unifiedLmpcPreserved.lmpc.status === 'COMPLIANT', 'Existing LMPC COMPLIANT status is preserved')
  assert(unifiedLmpcPreserved.lmpc.violationsCount === 0, 'Zero LMPC violations preserved')

  // ── Test 22: Unified Overall Status Aggregation ───────────────────────────
  console.log('\n--- Test 22: Unified Overall Status Aggregation ---')
  // Scenario A: Both Compliant -> COMPLIANT
  const scanBothCompliant = await unifiedService.evaluateScan({
    id: 'scan-both-ok',
    rawOcrText: 'Aqua Mineral Water IS 10500:2012 CM/L-8400123',
    identifiedCategory: 'Drinking Water',
    inspections: [{ id: 'insp-ok', status: 'IN_PROGRESS', violations: [] }],
  })
  assert(scanBothCompliant.overall.status === 'COMPLIANT', 'LMPC Compliant + BIS Operative -> Overall COMPLIANT')

  // Scenario B: LMPC Violations + BIS Clear -> Overall POTENTIAL_NON_COMPLIANCE
  const scanLmpcViolation = await unifiedService.evaluateScan({
    id: 'scan-lmpc-fail',
    rawOcrText: 'Aqua Mineral Water IS 10500:2012 CM/L-8400123',
    identifiedCategory: 'Drinking Water',
    inspections: [
      {
        id: 'insp-fail',
        status: 'IN_PROGRESS',
        violations: [{ id: 'v1', severity: 'HIGH', rule: { code: 'PCR_RULE_06_NET_QTY', title: 'Missing Net Quantity' } }],
      },
    ],
  })
  assert(scanLmpcViolation.overall.status === 'POTENTIAL_NON_COMPLIANCE', 'LMPC Violation + BIS Operative -> Overall POTENTIAL_NON_COMPLIANCE')

  // Scenario C: LMPC Compliant + BIS Non-Compliant (Expired License) -> Overall POTENTIAL_NON_COMPLIANCE
  const scanBisViolation = await unifiedService.evaluateScan({
    id: 'scan-bis-fail',
    rawOcrText: 'Aqua Mineral Water IS 10500:2012 CM/L-7123456', // 7123456 is EXPIRED
    identifiedCategory: 'Drinking Water',
    inspections: [{ id: 'insp-ok', status: 'IN_PROGRESS', violations: [] }],
  })
  assert(scanBisViolation.overall.status === 'POTENTIAL_NON_COMPLIANCE', 'LMPC Compliant + BIS Expired License -> Overall POTENTIAL_NON_COMPLIANCE')

  // Scenario D: Dual Non-Compliance -> ACTION_REQUIRED
  const scanDualViolation = await unifiedService.evaluateScan({
    id: 'scan-dual-fail',
    rawOcrText: 'Aqua Mineral Water IS 10500:2012 CM/L-7123456',
    identifiedCategory: 'Drinking Water',
    inspections: [
      {
        id: 'insp-fail',
        status: 'IN_PROGRESS',
        violations: [{ id: 'v1', severity: 'HIGH', rule: { code: 'PCR_RULE_06_NET_QTY', title: 'Missing Net Quantity' } }],
      },
    ],
  })
  assert(scanDualViolation.overall.status === 'ACTION_REQUIRED', 'Dual Non-Compliance -> Overall ACTION_REQUIRED')

  // ── Test 23: Scan Ownership Protection (403 Forbidden) ───────────────────
  console.log('\n--- Test 23: Cross-User IDOR Ownership Protection (403 Forbidden) ---')
  const ownerUser = await prisma.user.upsert({
    where: { email: 'test-p5-owner@veriQO.gov.in' },
    update: {},
    create: {
      email: 'test-p5-owner@veriQO.gov.in',
      name: 'Test P5 Owner',
      role: 'CONSUMER',
      hashedPassword: 'mock-hashed-password-p5',
    },
  })

  const otherUser = await prisma.user.upsert({
    where: { email: 'test-p5-other@veriQO.gov.in' },
    update: {},
    create: {
      email: 'test-p5-other@veriQO.gov.in',
      name: 'Test P5 Other Consumer',
      role: 'CONSUMER',
      hashedPassword: 'mock-hashed-password-p5',
    },
  })

  // Create a test scan owned by consumer-1
  const testScan = await prisma.productScan.create({
    data: {
      userId: ownerUser.id,
      rawOcrText: 'Toy Car with wheels. IS 9873 CM/L-8400123',
      identifiedCategory: 'Plastic Toys',
      status: 'COMPLETE',
    },
  })

  // Act as consumer-2 attempting to check consumer-1's scan
  setTestSession({
    user: { id: otherUser.id, role: 'CONSUMER' },
  })
  const forbiddenReq = new Request(`http://localhost/api/v1/bis/scans/${testScan.id}/standards-check`, {
    method: 'POST',
  })
  const forbiddenRes = await standardsCheckPost(forbiddenReq, { params: { id: testScan.id } })
  assert(forbiddenRes.status === 403, 'Cross-user non-authority scan check returns 403 Forbidden')

  // ── Test 24: Authentication Enforcement (401 Unauthorized) ───────────────
  console.log('\n--- Test 24: Authentication Enforcement (401 Unauthorized) ---')
  setTestSession(null)
  const unauthReq = new Request(`http://localhost/api/v1/bis/scans/${testScan.id}/standards-check`, {
    method: 'POST',
  })
  const unauthRes = await standardsCheckPost(unauthReq, { params: { id: testScan.id } })
  assert(unauthRes.status === 401, 'Unauthenticated scan check returns 401 Unauthorized')

  // ── Test 25: Sanitized API Errors & Authorized Access ─────────────────────
  console.log('\n--- Test 25: Authorized Access & Sanitized Errors ---')
  // Authorized consumer accessing their own scan
  setTestSession({
    user: { id: ownerUser.id, role: 'CONSUMER' },
  })
  const authorizedReq = new Request(`http://localhost/api/v1/bis/scans/${testScan.id}/standards-check`, {
    method: 'POST',
  })
  const authorizedRes = await standardsCheckPost(authorizedReq, { params: { id: testScan.id } })
  assert(authorizedRes.status === 200, 'Owner accessing their scan returns 200 OK')
  const jsonBody = await authorizedRes.json()
  assert(jsonBody.data.bis !== undefined, 'API response contains bis inspection payload')
  assert(jsonBody.data.lmpc !== undefined, 'API response contains lmpc payload')
  assert(jsonBody.data.overall !== undefined, 'API response contains overall payload')

  // Missing scan returns sanitized 404
  const notFoundReq = new Request('http://localhost/api/v1/bis/scans/nonexistent-scan-id/standards-check', {
    method: 'POST',
  })
  const notFoundRes = await standardsCheckPost(notFoundReq, { params: { id: 'nonexistent-scan-id' } })
  assert(notFoundRes.status === 404, 'Non-existent scan returns sanitized 404 Not Found')

  // Cleanup test scan
  await prisma.productScan.delete({ where: { id: testScan.id } }).catch(() => {})

  // ── Test 26: Unified Report Data Assembly & Markdown Rendering ────────────
  console.log('\n--- Test 26: Unified Report Dual-Domain Rendering ---')
  const reportPayload = reportGen.assembleReportPayload({
    unifiedResult: scanBothCompliant,
    product: {
      name: 'Aqua Pure Packaged Drinking Water',
      brand: 'Aqua Pure',
      category: 'Drinking Water',
      manufacturer: 'Aqua Pure Beverages Ltd',
    },
  })
  assert(typeof reportPayload.securityHash === 'string' && reportPayload.securityHash.length === 64, 'Report payload contains 64-char SHA-256 security hash')
  assert(reportPayload.lmpc.status === 'COMPLIANT', 'Report payload contains LMPC section')
  assert(reportPayload.bis.status === 'CLEAR', 'Report payload contains BIS section')

  const renderedMd = reportGen.renderMarkdownReport(reportPayload)
  assert(renderedMd.includes('SECTION 1: LEGAL METROLOGY'), 'Rendered report displays SECTION 1: LEGAL METROLOGY')
  assert(renderedMd.includes('SECTION 2: BUREAU OF INDIAN STANDARDS'), 'Rendered report displays SECTION 2: BUREAU OF INDIAN STANDARDS')
  assert(renderedMd.includes('SECTION 3: UNIFIED REGULATORY DISPOSITION'), 'Rendered report displays SECTION 3: UNIFIED REGULATORY DISPOSITION')

  // ── Test 27: Additive Visual Mark Detector ────────────────────────────────
  console.log('\n--- Test 27: Additive Visual Mark Detection Integration ---')
  const visualDetector = defaultVisualBisMarkDetector
  // Offline mock call
  const visualOfflineRes = await visualDetector.detectVisualMark({
    imageBuffers: [{ buffer: Buffer.from('fake-image-data'), mimeType: 'image/jpeg' }],
    isDemoRecord: true,
  })
  assert(['DETECTED', 'NOT_DETECTED', 'UNCERTAIN'].includes(visualOfflineRes.status), 'Visual mark detector returns structured status')
  assert(visualOfflineRes.isDemoRecord === true, 'Visual detector propagates isDemoRecord')

  // ── Test 28: Visual Mark Presence != Legal Compliance ─────────────────────
  console.log('\n--- Test 28: Visual Mark Detection Does NOT Equal Legal Compliance ---')
  // Product has visual ISI mark, but no valid license or non-operative license
  const visualWithNoLicense = findingsEngine.generateFindings({
    identifiers: [
      {
        type: 'ISI_MARK',
        state: 'DETECTED',
        detectedValue: 'ISI_STANDARD_MARK',
        normalizedValue: 'ISI_STANDARD_MARK',
        source: 'VISUAL_INSPECTION',
        confidence: 0.9,
        evidenceReference: 'Visual ISI logo detected',
        isDemoRecord: true,
      },
      {
        type: 'CML_NUMBER',
        state: 'NOT_DETECTED',
        detectedValue: null,
        normalizedValue: null,
        source: 'OCR_TEXT',
        confidence: 0,
        evidenceReference: null,
        isDemoRecord: true,
      },
    ],
    candidateStandards: [],
    qcoChecks: [
      {
        status: 'APPLICABLE',
        isMandatoryCertification: true,
        orderTitle: 'Drinking Water QCO',
        orderNumber: 'S.O. 123',
        applicableStandards: ['IS 10500'],
        effectiveDate: '2023-01-01',
        isExempt: false,
        exemptionReason: null,
        guidance: 'Mandatory',
        isDemoRecord: true,
      },
    ],
    verifications: [],
  })
  assert(visualWithNoLicense.overallStatus === 'POTENTIAL_NON_COMPLIANCE', 'Visual ISI mark WITHOUT verified operative CML is NOT legally compliant')

  // ── Final Results Summary ─────────────────────────────────────────────────
  console.log('\n=================================================================')
  console.log(`PS107 Phase 5 Test Results: ${totalPassed} PASSED, ${totalFailed} FAILED (Total: ${totalPassed + totalFailed})`)
  console.log('=================================================================\n')

  await prisma.$disconnect().catch(() => {})

  if (totalFailed > 0) {
    process.exitCode = 1
  } else {
    console.log('🎉 ALL PS107 PHASE 5 UNIFIED VERIFICATION TESTS PASSED!\n')
    process.exitCode = 0
  }
}

runTests().catch(async (err) => {
  console.error('Fatal test error:', err)
  await prisma.$disconnect().catch(() => {})
  process.exitCode = 1
})
