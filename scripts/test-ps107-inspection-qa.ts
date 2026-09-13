/**
 * Targeted Regression & QA Test Suite for PS107:
 * - Vim Dishwash Liquid standard association (No IS 1293 false positive)
 * - Substantive commodity matching (Generic words like "Household" do not associate)
 * - QCO non-applicability for non-mandated products
 * - Zero false BIS mandatory violations
 * - PDF generation: no extra pages, table text wrapping, encoding safety, 13 sections
 */

import { defaultStandardAssociator } from '../src/lib/bis/inspection/standard-associator'
import { defaultQcoChecker } from '../src/lib/bis/inspection/qco-checker'
import { defaultBisFindingsEngine } from '../src/lib/bis/inspection/bis-findings-engine'
import { defaultUnifiedInspectionService } from '../src/lib/bis/inspection/unified-inspection-service'
import { defaultPdfService } from '../src/lib/inspections/pdf-service'
import type { InspectionReportData } from '../src/lib/inspections/types'

async function runTests() {
  console.log('\n==================================================')
  console.log('PS107 INSPECTION QA & REGRESSION TEST SUITE')
  console.log('==================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`)
      passed++
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`)
      failed++
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 1: VIM DISHWASH LIQUID STANDARD ASSOCIATION
  // ─────────────────────────────────────────────────────────────
  console.log('Test Group 1: Substantive Commodity Matching & False Positive Prevention')

  const vimAssociations = await defaultStandardAssociator.associateStandards({
    productName: 'Vim Concentrated Gel Dishwash Liquid',
    brand: 'Vim',
    category: 'Household / Dishwash Gel',
    rawOcrText: 'Vim Concentrated Gel Dishwash Liquid 500ml with lemons. Hindustan Unilever Ltd.',
    extractedDeclarations: [
      { fieldName: 'product_name', rawValue: 'Vim Concentrated Gel Dishwash Liquid', normalizedValue: 'Vim Concentrated Gel Dishwash Liquid' },
      { fieldName: 'manufacturer', rawValue: 'Hindustan Unilever Ltd', normalizedValue: 'Hindustan Unilever Ltd' },
      { fieldName: 'net_quantity', rawValue: '500 ml', normalizedValue: '500 ml' },
    ],
  })

  assert(
    vimAssociations.length > 0,
    'Returns association result for Vim Dishwash Liquid'
  )

  const topVimStd = vimAssociations[0]
  assert(
    topVimStd.standardNumber === 'NOT_DETERMINED',
    `Vim Dishwash standard is NOT_DETERMINED (Got: ${topVimStd.standardNumber})`
  )

  const hasIs1293 = vimAssociations.some((a) => a.standardNumber.includes('1293'))
  assert(
    !hasIs1293,
    'IS 1293 (Plugs and Socket-Outlets) MUST NOT be associated with Dishwash Liquid',
    hasIs1293 ? 'Found IS 1293 in candidate standards!' : undefined
  )

  assert(
    topVimStd.state === 'NEEDS_REVIEW',
    `Evaluation state is NEEDS_REVIEW (Got: ${topVimStd.state})`
  )

  // Test positive control: Plastic Toys must match IS 9873
  const toyAssociations = await defaultStandardAssociator.associateStandards({
    productName: 'Plastic Building Blocks Toy Set',
    category: 'Toys and Games',
    rawOcrText: 'Plastic toy for children educational blocks',
  })
  const hasToyStd = toyAssociations.some((a) => a.standardNumber.includes('9873'))
  assert(
    hasToyStd,
    'Positive Control: Plastic Toys correctly matches IS 9873'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 2: QCO FALSE POSITIVE PREVENTION
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest Group 2: QCO Applicability Safeguards')

  const vimQco = await defaultQcoChecker.evaluateQco({
    productName: 'Vim Concentrated Gel Dishwash Liquid',
    category: 'Household / Dishwash Gel',
    candidateStandards: vimAssociations,
  })

  assert(
    vimQco.status === 'NOT_APPLICABLE',
    `Vim Dishwash QCO status is NOT_APPLICABLE (Got: ${vimQco.status})`
  )

  assert(
    vimQco.isMandatoryCertification === false,
    `Vim Dishwash mandatory certification is false (Got: ${vimQco.isMandatoryCertification})`
  )

  assert(
    vimQco.orderNumber === 'NO APPLICABLE QCO IDENTIFIED',
    `Vim Dishwash QCO orderNumber is "NO APPLICABLE QCO IDENTIFIED" (Got: ${vimQco.orderNumber})`
  )

  const hasSocketQco = vimQco.orderTitle?.includes('Plugs') || vimQco.orderNumber?.includes('3673')
  assert(
    !hasSocketQco,
    'Plugs and Sockets QCO S.O. 3673(E) MUST NOT be attached to Dishwash Liquid'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 3: BIS FINDINGS ENGINE (NO FALSE VIOLATION)
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest Group 3: BIS Findings Engine')

  const findingsOutput = defaultBisFindingsEngine.generateFindings({
    identifiers: [],
    candidateStandards: vimAssociations,
    qcoChecks: [vimQco],
    verifications: [],
  })
  const vimFindings = findingsOutput.findings

  const hasMissingCertViol = vimFindings.some(
    (f) => f.code === 'BIS_QCO_MISSING_CERTIFICATION' || f.severity === 'CRITICAL' || f.severity === 'HIGH'
  )
  assert(
    !hasMissingCertViol,
    'MUST NOT generate BIS_QCO_MISSING_CERTIFICATION or HIGH/CRITICAL violation for Vim Dishwash Liquid'
  )

  const hasClearNotice = vimFindings.some(
    (f) => f.code === 'BIS_NO_MANDATORY_QCO' && f.severity === 'INFO'
  )
  assert(
    hasClearNotice,
    'Generates advisory informational finding: BIS_NO_MANDATORY_QCO with INFO severity'
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 4: UNIFIED SCAN INSPECTION PIPELINE
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest Group 4: Unified Inspection Service')

  const unifiedResult = await defaultUnifiedInspectionService.evaluateScan({
    id: 'scan-vim-test-01',
    rawOcrText: 'Vim Concentrated Gel Dishwash Liquid. Hindustan Unilever Ltd. 500ml MRP Rs. 115',
    identifiedProductName: 'Vim Concentrated Gel Dishwash Liquid',
    identifiedBrand: 'Vim',
    identifiedCategory: 'Household / Dishwash Gel',
    identifiedManufacturer: 'Hindustan Unilever Ltd',
    extractedDeclarations: [
      { fieldName: 'product_name', rawValue: 'Vim Concentrated Gel Dishwash Liquid', normalizedValue: 'Vim Dishwash' },
      { fieldName: 'manufacturer', rawValue: 'Hindustan Unilever Ltd', normalizedValue: 'Hindustan Unilever Ltd' },
      { fieldName: 'mrp', rawValue: 'Rs. 115.00 (Incl. of all taxes)', normalizedValue: '115.00' },
      { fieldName: 'net_quantity', rawValue: '500 ml', normalizedValue: '500 ml' },
    ],
    images: [{ id: 'img-1', storageKey: 'scans/vim.jpg' }],
  })

  assert(
    unifiedResult.bis.candidateStandards[0]?.standardNumber === 'NOT_DETERMINED',
    'Unified inspection sets standard to NOT_DETERMINED'
  )

  assert(
    unifiedResult.bis.qcoChecks[0]?.isMandatoryCertification === false,
    'Unified inspection sets mandatory certification to false'
  )

  assert(
    unifiedResult.overall.status === 'NEEDS_REVIEW',
    `Overall status for undetermined standard is NEEDS_REVIEW (Got: ${unifiedResult.overall.status})`
  )

  // ─────────────────────────────────────────────────────────────
  // TEST 5: PDF GENERATION, PAGINATION & LAYOUT VALIDATION
  // ─────────────────────────────────────────────────────────────
  console.log('\nTest Group 5: PDF Generation, Pagination & Layout')

  const mockReportData: InspectionReportData = {
    reportRef: 'REP-VIM-TEST-2026',
    generatedAt: new Date('2026-09-13T10:30:00Z'),
    securityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    inspection: {
      id: 'insp-vim-001',
      title: 'Vim Dishwash Packaging Verification',
      status: 'IN_PROGRESS',
      notes: 'Routine market surveillance inspection.',
      createdAt: new Date('2026-09-13T09:00:00Z'),
      updatedAt: new Date('2026-09-13T10:30:00Z'),
    },
    officer: {
      id: 'usr-officer-1',
      name: 'R. K. Sharma',
      email: 'rk.sharma@gov.in',
      role: 'AUTHORITY_OFFICER',
    },
    product: {
      id: 'prod-vim-1',
      name: 'Vim Concentrated Gel Dishwash Liquid',
      brand: 'Vim',
      genericName: 'Dishwashing Liquid',
      category: 'Household / Dishwash Gel',
      manufacturer: 'Hindustan Unilever Ltd., B-12 Industrial Area, Haridwar',
      packer: null,
      importer: null,
      countryOfOrigin: 'India',
      barcode: '8901030752109',
    },
    scan: {
      id: 'scan-vim-test-01',
      createdAt: new Date('2026-09-13T09:15:00Z'),
      identificationStatus: 'IDENTIFIED',
      identifiedProductName: 'Vim Concentrated Gel Dishwash Liquid',
      identifiedBrand: 'Vim',
      identifiedCategory: 'Household / Dishwash Gel',
      identifiedManufacturer: 'Hindustan Unilever Ltd',
      images: [
        {
          id: 'img-1',
          originalFilename: 'front_label.jpg',
          storageKey: 'evidence/front_label.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 245102,
          uploadedAt: new Date('2026-09-13T09:15:00Z'),
        },
      ],
    },
    declarations: [
      { id: 'd-1', fieldName: 'product_name', rawValue: 'Vim Concentrated Gel Dishwash Liquid', normalizedValue: 'Vim Dishwash', confidence: 0.98, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-2', fieldName: 'manufacturer', rawValue: 'Hindustan Unilever Ltd', normalizedValue: 'Hindustan Unilever Ltd', confidence: 0.95, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-3', fieldName: 'mrp', rawValue: 'Rs. 115.00 (Incl. of all taxes)', normalizedValue: '115.00', confidence: 0.94, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-4', fieldName: 'net_quantity', rawValue: '500 ml', normalizedValue: '500 ml', confidence: 0.96, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-5', fieldName: 'country_of_origin', rawValue: 'Made in India', normalizedValue: 'India', confidence: 0.92, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-6', fieldName: 'customer_care', rawValue: 'Toll-free 1800-10-22-221', normalizedValue: '18001022221', confidence: 0.90, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-7', fieldName: 'date_of_manufacture', rawValue: '08/2026', normalizedValue: '2026-08-01', confidence: 0.88, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-8', fieldName: 'packer', rawValue: null, normalizedValue: null, confidence: null, detectionStatus: 'NOT_DETECTED', sourceText: null },
      { id: 'd-9', fieldName: 'importer', rawValue: null, normalizedValue: null, confidence: null, detectionStatus: 'NOT_DETECTED', sourceText: null },
    ],
    complianceChecks: [
      {
        id: 'c-1',
        ruleId: 'r-1',
        ruleNumber: 'Rule 6(1)(a)',
        ruleTitle: 'Manufacturer Name and Address Declaration',
        ruleRequirement: 'Name and complete physical address of the manufacturer must be declared.',
        ruleVersionNumber: 1,
        ruleEffectiveDate: new Date('2022-01-01'),
        ruleChangeDescription: 'Gazette notification GSR 779(E)',
        sourceDocument: 'PCR 2011',
        sourceReference: 'Rule 6(1)(a)',
        status: 'PASS',
        isAdvisoryOnly: false,
        evaluationSummary: 'Manufacturer Hindustan Unilever Ltd declared with address.',
        checkedAt: new Date('2026-09-13T09:20:00Z'),
      },
      {
        id: 'c-2',
        ruleId: 'r-2',
        ruleNumber: 'Rule 6(1)(e)',
        ruleTitle: 'MRP Statutory Declaration Syntax',
        ruleRequirement: 'MRP must be stated inclusive of all taxes.',
        ruleVersionNumber: 1,
        ruleEffectiveDate: new Date('2022-01-01'),
        ruleChangeDescription: null,
        sourceDocument: 'PCR 2011',
        sourceReference: 'Rule 6(1)(e)',
        status: 'PASS',
        isAdvisoryOnly: false,
        evaluationSummary: 'Statutory syntax verified inclusive of all taxes.',
        checkedAt: new Date('2026-09-13T09:20:00Z'),
      },
    ],
    violations: [],
    onlineVerification: null,
    evidenceItems: [
      {
        id: 'ev-1',
        type: 'OFFICER_NOTE',
        title: 'Packaging Label Inspection',
        source: 'Officer Mobile Inspection',
        description: 'Physical packaging verified in store. All required Legal Metrology declarations present.',
        confidence: 1.0,
        createdByName: 'R. K. Sharma',
        createdAt: new Date('2026-09-13T09:22:00Z'),
        complianceCheckId: null,
        violationId: null,
      },
    ],
    decision: {
      id: 'dec-1',
      decision: 'COMPLIANT',
      remarks: 'No statutory violations found on physical commodity. Voluntary BIS domain.',
      decidedAt: new Date('2026-09-13T10:00:00Z'),
      officerName: 'R. K. Sharma',
    },
    bis: unifiedResult.bis,
  }

  const pdfBuffer = await defaultPdfService.generateInspectionPdf(mockReportData)
  assert(
    Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 5000,
    `PDF generated successfully (${pdfBuffer.length} bytes)`
  )

  // Parse PDF to examine text and page structure using Node built-in zlib
  const pdfBinary = pdfBuffer.toString('binary')
  const pageMatches = pdfBinary.match(/\/Type\s*\/Page\b/g)
  const numPages = pageMatches ? pageMatches.length : 0

  // Decompress FlateDecode streams to retrieve text
  const zlib = await import('zlib')
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let decompressedText = ''
  let streamMatch: RegExpExecArray | null
  while ((streamMatch = streamRegex.exec(pdfBinary)) !== null) {
    const rawStream = Buffer.from(streamMatch[1], 'binary')
    try {
      const unzipped = zlib.inflateSync(rawStream)
      decompressedText += unzipped.toString('latin1') + ' '
    } catch {
      decompressedText += streamMatch[1] + ' '
    }
  }

  console.log(`  [INFO] Generated PDF Page Count: ${numPages}`)

  assert(
    numPages >= 2 && numPages <= 5,
    `PDF page count is reasonable (2 to 5 pages, no runaway blank pages). Actual: ${numPages}`
  )

  // Decode hex tokens (<474f>) from PDF streams (spaces are already encoded as 20 in hex)
  let decodedText = ''
  const hexRegex = /<([0-9a-fA-F]+)>/g
  let hexMatch: RegExpExecArray | null
  while ((hexMatch = hexRegex.exec(decompressedText)) !== null) {
    const hex = hexMatch[1]
    for (let i = 0; i < hex.length; i += 2) {
      decodedText += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
    }
  }

  // Verify NOT_DETECTED did not split mid-word
  const hasSplitNotDetected = /NOT_DETECT\s+ED/.test(decodedText)
  assert(
    !hasSplitNotDetected,
    'Table Status column: "NOT_DETECTED" does NOT break mid-word into "NOT_DETECT ED"'
  )

  // Verify [PASSED] replacement string
  assert(
    decodedText.includes('[PASSED] ZERO FORMAL STATUTORY VIOLATIONS RECORDED'),
    'Zero violations rendered with clean "[PASSED]" prefix instead of corrupted checkmark'
  )

  // Verify all 13 sections are present
  const requiredSections = [
    '1. INSPECTION OVERVIEW',
    '2. PRODUCT & PACKAGING IDENTITY',
    '3. EXTRACTED LMPC DECLARATIONS',
    '4. LMPC COMPLIANCE EVALUATION',
    '5. BIS / INDIAN STANDARDS ASSESSMENT',
    '6. QUALITY CONTROL ORDER (QCO) APPLICABILITY',
    '7. CERTIFICATION / LICENSE VERIFICATION',
    '8. BIS COMPLIANCE FINDINGS & EVIDENTIARY ANALYSIS',
    '9. EVIDENCE TRACEABILITY',
    '10. OFFICER VERIFICATION CHECKLIST',
    '11. UNIFIED REGULATORY DISPOSITION',
    '12. OFFICIAL AUTHORITY VERDICT & SIGNATURE',
    '13. CRYPTOGRAPHIC AUDIT TRAIL & SECURITY HASH',
  ]

  let missingSections: string[] = []
  for (const s of requiredSections) {
    if (!decodedText.includes(s)) {
      missingSections.push(s)
    }
  }

  assert(
    missingSections.length === 0,
    `All 13 required Unified Inspection Report sections are rendered in PDF (Missing: ${missingSections.join(', ') || 'None'})`
  )

  // Verify Vim specific text in PDF
  assert(
    decodedText.includes('NOT DETERMINED') || decodedText.includes('NOT_DETERMINED'),
    'PDF correctly displays "NOT DETERMINED" for standard specification'
  )

  assert(
    !decodedText.includes('IS 1293:2019') && !decodedText.includes('S.O. 3673(E)'),
    'PDF strictly does NOT contain false positive IS 1293:2019 or S.O. 3673(E)'
  )

  // Summary
  console.log('\n==================================================')
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('==================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
