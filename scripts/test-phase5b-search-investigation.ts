/**
 * VeriQO Phase 5B: Authority Search & Investigation Test Suite
 *
 * Validates 26 core requirements:
 * 1. Basic case search
 * 2. Complaint reference search
 * 3. Product search
 * 4. Brand search
 * 5. Manufacturer search
 * 6. Inspection search
 * 7. Violation search
 * 8. Status filtering
 * 9. Priority filtering
 * 10. Date filtering
 * 11. Pagination
 * 12. Empty search results
 * 13. Mixed entity result normalization
 * 14. Case dossier investigation data
 * 15. Product historical investigation
 * 16. Manufacturer historical investigation
 * 17. Brand historical investigation
 * 18. Violation → RuleVersion trace
 * 19. Evidence trace remains accessible
 * 20. Online discrepancy trace remains accessible
 * 21. Officer authorization isolation
 * 22. Senior/Admin broader access
 * 23. Search cannot expose unauthorized records
 * 24. Search does not mutate compliance findings
 * 25. Search does not create duplicate cases
 * 26. Existing Phase 5A idempotency remains intact
 */

import { prisma } from '../src/lib/prisma'
import { AuthoritySearchService } from '../src/lib/search/search-service'
import { CaseService } from '../src/lib/cases/case-service'
import type { Role } from '@prisma/client'

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

async function runPhase5bTests() {
  console.log('\n======================================================')
  console.log('  VERIQO PHASE 5B: AUTHORITY SEARCH & INVESTIGATION TESTS')
  console.log('======================================================\n')

  const searchService = new AuthoritySearchService(prisma)
  const caseService = new CaseService(prisma)

  // Track entities for clean teardown
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []
  const createdScanIds: string[] = []
  const createdVerificationIds: string[] = []
  const createdComplaintIds: string[] = []
  const createdCaseIds: string[] = []
  const createdInspectionIds: string[] = []
  const createdRuleIds: string[] = []
  const createdRuleVersionIds: string[] = []
  const createdCheckIds: string[] = []
  const createdViolationIds: string[] = []
  const createdEvidenceIds: string[] = []
  const createdDiscrepancyIds: string[] = []

  try {
    // ─────────────────────────────────────────────────────────────
    // SETUP FIXTURES
    // ─────────────────────────────────────────────────────────────
    console.log('--- Setting up Test Fixtures ---')
    const timestamp = Date.now()

    // 1. Users: Officer 1, Officer 2, Senior Officer
    const officer1 = await prisma.user.create({
      data: {
        email: `p5b-officer1-${timestamp}@veriqo.test`,
        name: `P5B Inspector Alpha ${timestamp}`,
        hashedPassword: 'mock-hashed-password',
        role: 'AUTHORITY_OFFICER',
        isActive: true,
      },
    })
    createdUserIds.push(officer1.id)

    const officer2 = await prisma.user.create({
      data: {
        email: `p5b-officer2-${timestamp}@veriqo.test`,
        name: `P5B Inspector Beta ${timestamp}`,
        hashedPassword: 'mock-hashed-password',
        role: 'AUTHORITY_OFFICER',
        isActive: true,
      },
    })
    createdUserIds.push(officer2.id)

    const seniorAdmin = await prisma.user.create({
      data: {
        email: `p5b-senior-${timestamp}@veriqo.test`,
        name: `P5B Chief Controller ${timestamp}`,
        hashedPassword: 'mock-hashed-password',
        role: 'SENIOR_AUTHORITY',
        isActive: true,
      },
    })
    createdUserIds.push(seniorAdmin.id)

    const consumer = await prisma.user.create({
      data: {
        email: `p5b-consumer-${timestamp}@veriqo.test`,
        name: `P5B Citizen Tester ${timestamp}`,
        hashedPassword: 'mock-hashed-password',
        role: 'CONSUMER',
        isActive: true,
      },
    })
    createdUserIds.push(consumer.id)

    // 2. Product & Brand & Manufacturer
    const testBrand = `P5BBrand-${timestamp}`
    const testMfg = `P5B PharmaCorp Ltd-${timestamp}`
    const testProductName = `P5B Herbal Skin Radiance 200ml-${timestamp}`

    const product = await prisma.product.create({
      data: {
        name: testProductName,
        brand: testBrand,
        manufacturer: testMfg,
        category: 'Cosmetics & Personal Care',
        barcode: `890${timestamp.toString().slice(-9)}`,
        metadata: {
          standardQuantity: '200 ml',
          declaredMrp: 450.0,
        },
      },
    })
    createdProductIds.push(product.id)

    // 3. Product Scan
    const scan = await prisma.productScan.create({
      data: {
        userId: consumer.id,
        productId: product.id,
        identifiedProductName: product.name,
        identifiedBrand: product.brand,
        identifiedCategory: product.category,
        identifiedManufacturer: testMfg,
        status: 'COMPLETE',
        extractedDeclarations: {
          create: [
            { fieldName: 'Net Quantity', rawValue: '200ml', normalizedValue: '200 ml', detectionStatus: 'DETECTED', confidence: 0.98 },
            { fieldName: 'MRP', rawValue: 'Rs 450', normalizedValue: '450.00', detectionStatus: 'DETECTED', confidence: 0.95 },
            { fieldName: 'Manufacturer', rawValue: testMfg, normalizedValue: testMfg, detectionStatus: 'DETECTED', confidence: 0.92 },
          ],
        },
      },
    })
    createdScanIds.push(scan.id)

    // 4. Online Verification & Discrepancy linked to Scan
    const onlineVer = await prisma.onlineVerification.create({
      data: {
        scanId: scan.id,
        sourceUrl: 'https://ecommerce-example.in/p/elixir',
        domain: 'ecommerce-example.in',
        status: 'COMPLETED',
        discrepancies: {
          create: [
            {
              fieldName: 'mrp',
              discrepancyType: 'MRP_MISMATCH',
              onlineValue: '550.00',
              physicalValue: '450.00',
              severity: 'HIGH',
              message: 'Online listed price exceeds physical MRP',
            },
          ],
        },
      },
      include: { discrepancies: true },
    })
    createdVerificationIds.push(onlineVer.id)
    const discrepancy = onlineVer.discrepancies[0]
    createdDiscrepancyIds.push(discrepancy.id)

    // 5. Consumer Complaint
    const complaintRef = `CMP-P5B-${timestamp.toString().slice(-6)}`
    const complaint = await prisma.complaint.create({
      data: {
        complaintRef,
        consumerId: consumer.id,
        productId: product.id,
        scanId: scan.id,
        title: `Overcharging violation for ${testProductName}`,
        description: `E-commerce portal is selling above declared MRP with misleading quantity`,
        status: 'INVESTIGATING',
      },
    })
    createdComplaintIds.push(complaint.id)

    // 6. Regulatory Case 1 (Officer 1) via idempotent CaseService
    const case1 = await caseService.getOrCreateCaseForComplaint(complaint.id)
    createdCaseIds.push(case1.id)

    // Update Priority to HIGH and assign Officer 1
    await caseService.updateCase(
      case1.id,
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' },
      { priority: 'HIGH' }
    )
    await caseService.assignOfficer(
      case1.id,
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' },
      { officerId: officer1.id }
    )

    // 7. Regulatory Case 2 (Officer 2) - independent case for isolation testing
    const case2 = await caseService.createCase(
      seniorAdmin.id,
      {
        title: `Independent audit for Mumbai region ${timestamp}`,
        priority: 'MEDIUM',
      }
    )
    createdCaseIds.push(case2.id)

    await caseService.assignOfficer(
      case2.id,
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' },
      { officerId: officer2.id }
    )

    // 8. Statutory Rule & RuleVersion
    const ruleNumber = `P5B-RULE-${timestamp.toString().slice(-4)}`
    const statutoryRule = await prisma.legalRule.create({
      data: {
        ruleNumber,
        title: 'Requirement of Plain and Conspicuous Net Quantity Declaration',
        requirement: 'Every package shall bear thereon a declaration as to the net quantity.',
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceReference: 'Rule 6(1)(b)',
        defaultSeverity: 'CRITICAL',
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
      },
    })
    createdRuleIds.push(statutoryRule.id)

    const ruleVersion = await prisma.ruleVersion.create({
      data: {
        ruleId: statutoryRule.id,
        versionNumber: 1,
        changeDescription: 'Enacted baseline metrology rule version',
        changedById: seniorAdmin.id,
        effectiveDate: new Date('2024-01-01'),
        snapshot: { minHeightMm: 4.0, mandatoryUnit: 'ml' },
      },
    })
    createdRuleVersionIds.push(ruleVersion.id)

    // 9. Statutory Inspection for Case 1 assigned to Officer 1
    const inspection1 = await prisma.inspection.create({
      data: {
        caseId: case1.id,
        productId: product.id,
        scanId: scan.id,
        officerId: officer1.id,
        title: `Metrology Inspection for ${testProductName}`,
        status: 'IN_PROGRESS',
      },
    })
    createdInspectionIds.push(inspection1.id)

    // 10. Cryptographic Evidence for Inspection 1
    const evidence = await prisma.evidence.create({
      data: {
        inspectionId: inspection1.id,
        type: 'SCAN_IMAGE',
        title: 'Front packaging declaration photograph',
        metadata: {
          sha256Hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
          storageKey: `evidence/p5b/${timestamp}/front.jpg`,
        },
      },
    })
    createdEvidenceIds.push(evidence.id)

    // 11. ComplianceCheck & Recorded Violation for Inspection 1
    const check = await prisma.complianceCheck.create({
      data: {
        inspectionId: inspection1.id,
        ruleId: statutoryRule.id,
        ruleVersionNumber: 1,
        status: 'FAIL',
        evaluationDetails: {
          field: 'Net Quantity Height',
          expectedValue: '>= 4.0 mm font size',
          actualValue: '2.1 mm font size',
          confidence: 0.99,
        },
      },
    })
    createdCheckIds.push(check.id)

    const violation = await prisma.violation.create({
      data: {
        inspectionId: inspection1.id,
        ruleId: statutoryRule.id,
        severity: 'CRITICAL',
        description: `Net quantity declaration font size is 2.1mm, below statutory minimum of 4.0mm under Rule 6(1)(b)`,
        remediationGuidance: 'Recall non-compliant packaging batches and reissue packaging with compliant font sizing',
      },
    })
    createdViolationIds.push(violation.id)

    // 12. Inspection for Case 2 assigned to Officer 2
    const inspection2 = await prisma.inspection.create({
      data: {
        caseId: case2.id,
        officerId: officer2.id,
        title: `Mumbai Routine Inspection ${timestamp}`,
        status: 'IN_PROGRESS',
      },
    })
    createdInspectionIds.push(inspection2.id)

    // 13. Historical inspection with NO case, but sharing product/scan with active case1 (Officer 1)
    const histInspectionWithActiveCase = await prisma.inspection.create({
      data: {
        productId: product.id,
        scanId: scan.id,
        officerId: officer1.id,
        title: `Pre-Docket Inspection for ${testProductName}`,
        status: 'CLOSED',
      },
    })
    createdInspectionIds.push(histInspectionWithActiveCase.id)

    const histViolationWithActiveCase = await prisma.violation.create({
      data: {
        inspectionId: histInspectionWithActiveCase.id,
        ruleId: statutoryRule.id,
        severity: 'HIGH',
        description: `Pre-docket MRP declaration violation`,
      },
    })
    createdViolationIds.push(histViolationWithActiveCase.id)

    // 14. Standalone commodity & inspection with NO case anywhere
    const standaloneProduct = await prisma.product.create({
      data: {
        name: `Standalone Pure Product ${timestamp}`,
        brand: `StandaloneBrand-${timestamp}`,
        category: 'Food & Beverages',
      },
    })
    createdProductIds.push(standaloneProduct.id)

    const standaloneScan = await prisma.productScan.create({
      data: {
        userId: consumer.id,
        productId: standaloneProduct.id,
        status: 'COMPLETE',
      },
    })
    createdScanIds.push(standaloneScan.id)

    const standaloneInspectionNoCase = await prisma.inspection.create({
      data: {
        productId: standaloneProduct.id,
        scanId: standaloneScan.id,
        officerId: officer1.id,
        title: `Standalone Inspection No Case ${timestamp}`,
        status: 'CLOSED',
      },
    })
    createdInspectionIds.push(standaloneInspectionNoCase.id)

    const standaloneViolationNoCase = await prisma.violation.create({
      data: {
        inspectionId: standaloneInspectionNoCase.id,
        ruleId: statutoryRule.id,
        severity: 'LOW',
        description: `Standalone isolated violation`,
      },
    })
    createdViolationIds.push(standaloneViolationNoCase.id)

    // 15. Inspection on scan linked to case2 (assigned to officer2), but inspection owned by officer1
    const scanForCase2 = await prisma.productScan.create({
      data: {
        userId: consumer.id,
        status: 'COMPLETE',
      },
    })
    createdScanIds.push(scanForCase2.id)

    await prisma.regulatoryCase.update({
      where: { id: case2.id },
      data: { productScanId: scanForCase2.id },
    })

    const crossInspOfficer1 = await prisma.inspection.create({
      data: {
        scanId: scanForCase2.id,
        officerId: officer1.id,
        title: `Cross Isolation Inspection ${timestamp}`,
        status: 'CLOSED',
      },
    })
    createdInspectionIds.push(crossInspOfficer1.id)

    const crossViolationOfficer1 = await prisma.violation.create({
      data: {
        inspectionId: crossInspOfficer1.id,
        ruleId: statutoryRule.id,
        severity: 'MEDIUM',
        description: `Cross isolation violation test`,
      },
    })
    createdViolationIds.push(crossViolationOfficer1.id)

    console.log('--- Fixtures Initialized Successfully ---\n')

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Basic Case Search
    // ─────────────────────────────────────────────────────────────
    console.log('Test 1: Basic Case Search')
    const caseSearchResult = await searchService.search(
      { q: case1.caseNumber, type: 'CASE' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      caseSearchResult.results.length >= 1 &&
      caseSearchResult.results.some(i => i.id === case1.id && i.type === 'CASE'),
      'Basic case search returns target case with correct type and metadata'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Complaint Reference Search
    // ─────────────────────────────────────────────────────────────
    console.log('Test 2: Complaint Reference Search')
    const complaintSearchResult = await searchService.search(
      { q: complaintRef, type: 'COMPLAINT' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      complaintSearchResult.results.length >= 1 &&
      complaintSearchResult.results.some(i => i.id === complaint.id && i.type === 'COMPLAINT'),
      'Complaint reference search finds matching complaint docket'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Product / Commodity Search
    // ─────────────────────────────────────────────────────────────
    console.log('Test 3: Product Search')
    const productSearchResult = await searchService.search(
      { q: testProductName, type: 'PRODUCT' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      productSearchResult.results.length >= 1 &&
      productSearchResult.results.some(i => i.id === product.id && i.type === 'PRODUCT'),
      'Product search correctly resolves registered commodity'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Brand Search
    // ─────────────────────────────────────────────────────────────
    console.log('Test 4: Brand Search')
    const brandSearchResult = await searchService.search(
      { q: testBrand, type: 'BRAND' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      brandSearchResult.results.length >= 1 &&
      brandSearchResult.results.some(i => i.title === testBrand && i.type === 'BRAND'),
      'Brand search groups and returns registered brand'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Manufacturer Search
    // ─────────────────────────────────────────────────────────────
    console.log('Test 5: Manufacturer Search')
    const mfgSearchResult = await searchService.search(
      { q: testMfg, type: 'MANUFACTURER' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      mfgSearchResult.results.length >= 1 &&
      mfgSearchResult.results.some(i => i.title === testMfg && i.type === 'MANUFACTURER'),
      'Manufacturer search discovers corporate entity'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Inspection Search
    // ─────────────────────────────────────────────────────────────
    console.log('Test 6: Inspection Search')
    const insSearchResult = await searchService.search(
      { q: inspection1.title!, type: 'INSPECTION' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      insSearchResult.results.length >= 1 &&
      insSearchResult.results.some(i => i.id === inspection1.id && i.type === 'INSPECTION'),
      'Inspection search finds statutory inspection record'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Violation Search
    // ─────────────────────────────────────────────────────────────
    console.log('Test 7: Violation Search')
    const violSearchResult = await searchService.search(
      { q: ruleNumber, type: 'VIOLATION' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      violSearchResult.results.length >= 1 &&
      violSearchResult.results.some(i => i.id === violation.id && i.type === 'VIOLATION'),
      'Violation search finds recorded statutory violation'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Status Filtering
    // ─────────────────────────────────────────────────────────────
    console.log('Test 8: Status Filtering')
    const statusFiltered = await searchService.search(
      { type: 'CASE', status: 'ASSIGNED' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      statusFiltered.results.length >= 1 &&
      statusFiltered.results.every(i => i.status === 'ASSIGNED'),
      'Status filtering correctly restricts results to specified lifecycle state'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Priority Filtering
    // ─────────────────────────────────────────────────────────────
    console.log('Test 9: Priority Filtering')
    const priorityFiltered = await searchService.search(
      { type: 'CASE', priority: 'HIGH' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      priorityFiltered.results.length >= 1 &&
      priorityFiltered.results.some(i => i.id === case1.id) &&
      !priorityFiltered.results.some(i => i.id === case2.id),
      'Priority filtering isolates HIGH priority dockets from MEDIUM'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Date Filtering
    // ─────────────────────────────────────────────────────────────
    console.log('Test 10: Date Filtering')
    const futureDate = new Date(Date.now() + 86400000)
    const futureResults = await searchService.search(
      { type: 'CASE', q: case1.caseNumber, from: futureDate.toISOString() },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      futureResults.results.length === 0,
      'Date range filtering strictly excludes records outside boundary'
    )

    const pastDate = new Date(Date.now() - 86400000)
    const validRangeResults = await searchService.search(
      { type: 'CASE', q: case1.caseNumber, from: pastDate.toISOString(), to: futureDate.toISOString() },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      validRangeResults.results.some(i => i.id === case1.id),
      'Date range filtering includes records within valid window'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Pagination
    // ─────────────────────────────────────────────────────────────
    console.log('Test 11: Pagination')
    const page1 = await searchService.search(
      { type: 'ALL', page: 1, pageSize: 1 },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    const page2 = await searchService.search(
      { type: 'ALL', page: 2, pageSize: 1 },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      page1.results.length === 1 &&
      page1.pagination.page === 1 &&
      page1.pagination.pageSize === 1 &&
      page2.pagination.page === 2 &&
      page1.results[0].id !== page2.results[0]?.id,
      'Server-side pagination properly splits result stream across pages'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Empty Search Results
    // ─────────────────────────────────────────────────────────────
    console.log('Test 12: Empty Search Results')
    const emptyResult = await searchService.search(
      { q: `NONEXISTENT_DOCKET_${timestamp}_XYZ` },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      emptyResult.results.length === 0 &&
      emptyResult.pagination.totalCount === 0 &&
      emptyResult.pagination.totalPages === 0,
      'Empty query returns clean structured zero-state response'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Mixed Entity Result Normalization
    // ─────────────────────────────────────────────────────────────
    console.log('Test 13: Mixed Entity Result Normalization')
    const mixedResult = await searchService.search(
      { q: `P5B`, type: 'ALL', pageSize: 50 },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    const hasMultipleTypes = new Set(mixedResult.results.map(i => i.type)).size >= 2
    const allHaveRequiredFields = mixedResult.results.every(
      i => Boolean(i.id && i.type && i.title && i.href && i.badgeText)
    )
    assert(
      hasMultipleTypes && allHaveRequiredFields,
      'Mixed entity search successfully normalizes diverse entities into unified contract'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Case Dossier Investigation Data
    // ─────────────────────────────────────────────────────────────
    console.log('Test 14: Case Dossier Investigation Data')
    const caseDossier = await caseService.getCase(case1.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    assert(
      caseDossier !== null &&
      caseDossier.id === case1.id &&
      caseDossier.complaint?.id === complaint.id &&
      caseDossier.productScan?.id === scan.id &&
      caseDossier.inspections.some(ins => ins.id === inspection1.id) &&
      caseDossier.inspections[0].violations.some(v => v.id === violation.id),
      'Case dossier integrates full investigation chain (Complaint → Case → Scan → Inspection → Violations)'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Product Historical Investigation
    // ─────────────────────────────────────────────────────────────
    console.log('Test 15: Product Historical Investigation')
    const productDossier = await searchService.getProductInvestigation(
      product.id,
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      productDossier !== null &&
      productDossier.product.id === product.id &&
      productDossier.cases.some(c => c.id === case1.id) &&
      productDossier.complaints.some(c => c.id === complaint.id) &&
      productDossier.inspections.some(i => i.id === inspection1.id) &&
      productDossier.violations.some(v => v.id === violation.id) &&
      productDossier.onlineDiscrepancies.some(d => d.id === discrepancy.id),
      'Product investigation dossier compiles complete regulatory footprint'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Manufacturer Historical Investigation
    // ─────────────────────────────────────────────────────────────
    console.log('Test 16: Manufacturer Historical Investigation')
    const mfgProfile = await searchService.getManufacturerInvestigation(
      testMfg,
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      mfgProfile !== null &&
      mfgProfile.name === testMfg &&
      mfgProfile.type === 'MANUFACTURER' &&
      mfgProfile.summaryCounts.productsCount >= 1 &&
      mfgProfile.summaryCounts.casesCount >= 1 &&
      mfgProfile.summaryCounts.inspectionsCount >= 1 &&
      mfgProfile.summaryCounts.violationsCount >= 1,
      'Manufacturer investigation aggregates multi-docket corporate regulatory history'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 17: Brand Historical Investigation
    // ─────────────────────────────────────────────────────────────
    console.log('Test 17: Brand Historical Investigation')
    const brandProfile = await searchService.getBrandInvestigation(
      testBrand,
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      brandProfile !== null &&
      brandProfile.name === testBrand &&
      brandProfile.type === 'BRAND' &&
      brandProfile.summaryCounts.productsCount >= 1 &&
      brandProfile.products.some(p => p.id === product.id),
      'Brand investigation compiles brand-level commodities and violations'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 18: Violation → RuleVersion Trace
    // ─────────────────────────────────────────────────────────────
    console.log('Test 18: Violation → RuleVersion Trace')
    const violationDossier = await searchService.getViolationInvestigation(
      violation.id,
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      violationDossier !== null &&
      violationDossier.violation.id === violation.id &&
      violationDossier.historicalRuleVersion?.versionNumber === 1 &&
      violationDossier.rule.sourceDocument.includes('Legal Metrology') &&
      violationDossier.complianceCheck?.status === 'FAIL',
      'Violation investigation preserves immutable RuleVersion snapshot and statutory grounding'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 18.A: Historical inspection with no case and no related active case
    // ─────────────────────────────────────────────────────────────
    console.log('Test 18.A: Historical inspection with no case and no related active case')
    const dossierNoCase = await searchService.getViolationInvestigation(
      standaloneViolationNoCase.id,
      { id: officer1.id, role: 'AUTHORITY_OFFICER' }
    )
    assert(
      dossierNoCase !== null &&
      dossierNoCase.case === null &&
      dossierNoCase.relatedActiveCase === null,
      'A. Historical inspection with no case and no related active case has null case and null relatedActiveCase'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 18.B: Historical inspection with no case but related active case
    // ─────────────────────────────────────────────────────────────
    console.log('Test 18.B: Historical inspection with no case but related active case')
    const dossierWithRelatedActive = await searchService.getViolationInvestigation(
      histViolationWithActiveCase.id,
      { id: officer1.id, role: 'AUTHORITY_OFFICER' }
    )
    assert(
      dossierWithRelatedActive !== null &&
      dossierWithRelatedActive.case === null &&
      Boolean(dossierWithRelatedActive.relatedActiveCase) &&
      dossierWithRelatedActive.relatedActiveCase?.id === case1.id &&
      dossierWithRelatedActive.relatedActiveCase?.caseNumber === case1.caseNumber,
      'B. Historical inspection with no case discovers related active case on shared commodity context'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 18.C: Direct case-linked inspection
    // ─────────────────────────────────────────────────────────────
    console.log('Test 18.C: Direct case-linked inspection')
    assert(
      violationDossier !== null &&
      violationDossier.case !== null &&
      violationDossier.case.id === case1.id &&
      violationDossier.case.caseNumber === case1.caseNumber,
      'C. Direct case-linked inspection preserves direct parent case docket'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 18.D: Cross-inspection/cross-case isolation
    // ─────────────────────────────────────────────────────────────
    console.log('Test 18.D: Cross-inspection/cross-case isolation')
    // 1. Officer 1 views their inspection where related active case is assigned to Officer 2 -> relatedActiveCase must be filtered out
    const crossDossierOfficer1 = await searchService.getViolationInvestigation(
      crossViolationOfficer1.id,
      { id: officer1.id, role: 'AUTHORITY_OFFICER' }
    )
    assert(
      crossDossierOfficer1 !== null &&
      !crossDossierOfficer1.relatedActiveCase,
      'D1. Officer cannot discover another officer assigned active case via contextual discovery'
    )

    // 2. Senior Admin views same violation -> can see related active case across officer boundaries
    const crossDossierSenior = await searchService.getViolationInvestigation(
      crossViolationOfficer1.id,
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    assert(
      crossDossierSenior !== null &&
      Boolean(crossDossierSenior.relatedActiveCase) &&
      crossDossierSenior.relatedActiveCase?.id === case2.id,
      'D2. Senior Authority can view related active case across officer boundaries'
    )

    // 3. Officer 2 tries to access Officer 1 violation directly -> blocked by RBAC
    const crossDossierOfficer2 = await searchService.getViolationInvestigation(
      crossViolationOfficer1.id,
      { id: officer2.id, role: 'AUTHORITY_OFFICER' }
    )
    assert(
      crossDossierOfficer2 === null,
      'D3. Officer 2 strictly blocked from accessing Officer 1 private violation dossier'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 19: Evidence Trace Remains Accessible
    // ─────────────────────────────────────────────────────────────
    console.log('Test 19: Evidence Trace Remains Accessible')
    assert(
      violationDossier !== null &&
      violationDossier.evidenceItems.some(
        e => e.id === evidence.id && e.sha256Hash?.includes('e3b0c442')
      ),
      'Evidence trace links directly to cryptographic SHA-256 artifacts'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 20: Online Discrepancy Trace Remains Accessible
    // ─────────────────────────────────────────────────────────────
    console.log('Test 20: Online Discrepancy Trace Remains Accessible')
    assert(
      productDossier !== null &&
      productDossier.onlineDiscrepancies.some(
        d => d.discrepancyType === 'MRP_MISMATCH' && d.onlineValue === '550.00'
      ),
      'Online e-commerce verification discrepancies are cataloged in investigation history'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 21: Officer Authorization Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('Test 21: Officer Authorization Isolation')
    const officer1Cases = await searchService.search(
      { type: 'CASE' },
      { id: officer1.id, role: 'AUTHORITY_OFFICER' }
    )
    const officer1SeesCase1 = officer1Cases.results.some(i => i.id === case1.id)
    const officer1SeesCase2 = officer1Cases.results.some(i => i.id === case2.id)
    assert(
      officer1SeesCase1 && !officer1SeesCase2,
      'Officer 1 sees assigned case but is isolated from Officer 2 assigned case'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 22: Senior/Admin Broader Access
    // ─────────────────────────────────────────────────────────────
    console.log('Test 22: Senior/Admin Broader Access')
    const seniorCases = await searchService.search(
      { type: 'CASE' },
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' }
    )
    const seniorSeesCase1 = seniorCases.results.some(i => i.id === case1.id)
    const seniorSeesCase2 = seniorCases.results.some(i => i.id === case2.id)
    assert(
      seniorSeesCase1 && seniorSeesCase2,
      'Senior Authority has global jurisdiction over both Officer 1 and Officer 2 dockets'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 23: Search Cannot Expose Unauthorized Records
    // ─────────────────────────────────────────────────────────────
    console.log('Test 23: Search Cannot Expose Unauthorized Records')
    const officer1TargetSearch = await searchService.search(
      { q: case2.caseNumber, type: 'CASE' },
      { id: officer1.id, role: 'AUTHORITY_OFFICER' }
    )
    assert(
      officer1TargetSearch.results.length === 0,
      'Direct search query for unauthorized case number returns zero results at query layer'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 24: Search Does Not Mutate Compliance Findings
    // ─────────────────────────────────────────────────────────────
    console.log('Test 24: Search Does Not Mutate Compliance Findings')
    const checkBefore = await prisma.complianceCheck.findUnique({ where: { id: check.id } })
    const violBefore = await prisma.violation.findUnique({ where: { id: violation.id } })

    // Perform multiple comprehensive searches
    await searchService.search({ q: ruleNumber }, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })
    await searchService.getViolationInvestigation(violation.id, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })

    const checkAfter = await prisma.complianceCheck.findUnique({ where: { id: check.id } })
    const violAfter = await prisma.violation.findUnique({ where: { id: violation.id } })

    assert(
      checkBefore?.status === checkAfter?.status &&
      violBefore?.severity === violAfter?.severity &&
      violBefore?.description === violAfter?.description,
      'Search and investigation queries strictly maintain deterministic compliance immutability'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 25: Search Does Not Create Duplicate Cases
    // ─────────────────────────────────────────────────────────────
    console.log('Test 25: Search Does Not Create Duplicate Cases')
    const caseCountBefore = await prisma.regulatoryCase.count()

    // Run broad search queries
    await searchService.search({ q: case1.caseNumber }, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })
    await searchService.search({ q: complaintRef }, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })

    const caseCountAfter = await prisma.regulatoryCase.count()
    assert(
      caseCountBefore === caseCountAfter,
      'Search operations have zero database write side-effects on case counts'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST 26: Existing Phase 5A Idempotency Remains Intact
    // ─────────────────────────────────────────────────────────────
    console.log('Test 26: Existing Phase 5A Idempotency Remains Intact')
    const idempotentCase = await caseService.getOrCreateCaseForComplaint(complaint.id)
    assert(
      idempotentCase.id === case1.id &&
      idempotentCase.caseNumber === case1.caseNumber,
      'Phase 5A getOrCreateCaseForComplaint remains strictly idempotent'
    )

  } finally {
    // ─────────────────────────────────────────────────────────────
    // CLEANUP FIXTURES
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Cleaning up Test Fixtures ---')
    try {
      if (createdViolationIds.length > 0) {
        await prisma.violation.deleteMany({ where: { id: { in: createdViolationIds } } })
      }
      if (createdCheckIds.length > 0) {
        await prisma.complianceCheck.deleteMany({ where: { id: { in: createdCheckIds } } })
      }
      if (createdEvidenceIds.length > 0) {
        await prisma.evidence.deleteMany({ where: { id: { in: createdEvidenceIds } } })
      }
      if (createdRuleVersionIds.length > 0) {
        await prisma.ruleVersion.deleteMany({ where: { id: { in: createdRuleVersionIds } } })
      }
      if (createdRuleIds.length > 0) {
        await prisma.legalRule.deleteMany({ where: { id: { in: createdRuleIds } } })
      }
      if (createdInspectionIds.length > 0) {
        await prisma.inspection.deleteMany({ where: { id: { in: createdInspectionIds } } })
      }
      if (createdCaseIds.length > 0) {
        await prisma.regulatoryCase.deleteMany({ where: { id: { in: createdCaseIds } } })
      }
      if (createdDiscrepancyIds.length > 0) {
        await prisma.onlineDiscrepancy.deleteMany({ where: { id: { in: createdDiscrepancyIds } } })
      }
      if (createdVerificationIds.length > 0) {
        await prisma.onlineVerification.deleteMany({ where: { id: { in: createdVerificationIds } } })
      }
      if (createdComplaintIds.length > 0) {
        await prisma.complaint.deleteMany({ where: { id: { in: createdComplaintIds } } })
      }
      if (createdScanIds.length > 0) {
        await prisma.extractedDeclaration.deleteMany({ where: { scanId: { in: createdScanIds } } })
        await prisma.productScan.deleteMany({ where: { id: { in: createdScanIds } } })
      }
      if (createdProductIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
      }
      if (createdUserIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } })
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
      }
      console.log('Cleanup completed cleanly.')
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr)
    }
  }

  console.log('\n======================================================')
  console.log(`  PHASE 5B TESTS COMPLETE: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPhase5bTests()
  .catch((err) => {
    console.error('Fatal error during Phase 5B tests:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
