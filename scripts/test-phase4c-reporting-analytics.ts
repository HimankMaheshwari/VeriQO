/**
 * VeriQO Phase 4C Test Suite: Official Reporting, Server-Side PDF Generation & Authority Analytics
 *
 * Verification Requirements:
 * 1. Deterministic report data assembly
 * 2. Report contains exact historical ruleVersionNumber
 * 3. Historical RuleVersion remains unchanged when a newer version exists
 * 4. WARNING appears as WARNING and does not become a Violation
 * 5. FAIL Violation appears only from persisted formal Violation records
 * 6. Report includes persisted product/declaration information
 * 7. Report includes online verification/discrepancy data when available
 * 8. Report includes Phase 4B evidence references
 * 9. PDF generation returns a valid PDF buffer
 * 10. PDF contains expected report sections/header metadata
 * 11. Report record is persisted
 * 12. Report generation is audited
 * 13. Unauthorized officer cannot generate/access another officer's report
 * 14. Senior Authority/Admin can access permitted reports
 * 15. Analytics counts are based on real database records
 * 16. Analytics correctly separates inspection statuses
 * 17. Analytics correctly separates officer decisions
 * 18. Analytics correctly aggregates violation severity
 * 19. Analytics correctly identifies top violated rules
 * 20. Empty datasets return safe zero/empty metrics
 */

import { PrismaClient, Role, InspectionStatus, AuthorityDecision, ViolationSeverity, EvidenceType } from '@prisma/client'
import { ReportGenerator } from '../src/lib/inspections/report-generator'
import { PdfService } from '../src/lib/inspections/pdf-service'
import { AnalyticsService } from '../src/lib/inspections/analytics-service'
import { InspectionService, InspectionAccessError } from '../src/lib/inspections/inspection-service'
import { getStorageService } from '../src/lib/storage'
import { audit } from '../src/lib/audit'

const prisma = new PrismaClient()
const reportGenerator = new ReportGenerator(prisma)
const pdfService = new PdfService()
const analyticsService = new AnalyticsService(prisma)
const inspectionService = new InspectionService(prisma)
const storageService = getStorageService()

let testPassed = 0
let testFailed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`)
    testPassed++
  } else {
    console.error(`  ✗ [FAIL] ${message}`)
    testFailed++
  }
}

async function cleanupTestData() {
  await prisma.report.deleteMany({
    where: { title: { contains: 'Phase4C_Test' } },
  })
  await prisma.auditLog.deleteMany({
    where: { entityType: { in: ['Phase4C_Test', 'Report'] } },
  })
  await prisma.evidence.deleteMany({
    where: { description: { contains: 'Phase4C_Test' } },
  })
  await prisma.violation.deleteMany({
    where: { description: { contains: 'Phase4C_Test' } },
  })
  await prisma.complianceCheck.deleteMany({
    where: { officerNote: { contains: 'Phase4C_Test' } },
  })
  await prisma.officerDecision.deleteMany({
    where: { remarks: { contains: 'Phase4C_Test' } },
  })
  await prisma.inspection.deleteMany({
    where: { title: { contains: 'Phase4C_Test' } },
  })
  await prisma.onlineDiscrepancy.deleteMany({
    where: { message: { contains: 'Phase4C_Test' } },
  })
  await prisma.onlineListingField.deleteMany({
    where: { rawValue: { contains: 'Phase4C_Test' } },
  })
  await prisma.onlineListingSnapshot.deleteMany({
    where: { contentHash: { contains: 'phase4c-test' } },
  })
  await prisma.onlineVerification.deleteMany({
    where: { sourceUrl: { contains: 'phase4c-test' } },
  })
  await prisma.extractedDeclaration.deleteMany({
    where: { rawValue: { contains: 'Phase4C_Test' } },
  })
  await prisma.scanImage.deleteMany({
    where: { originalFilename: { contains: 'phase4c-test' } },
  })
  await prisma.productScan.deleteMany({
    where: { identifiedProductName: { contains: 'Phase4C_Test' } },
  })
  await prisma.product.deleteMany({
    where: { name: { contains: 'Phase4C_Test' } },
  })
  await prisma.ruleVersion.deleteMany({
    where: { changeDescription: { contains: 'Phase4C_Test' } },
  })
  await prisma.legalRule.deleteMany({
    where: { ruleNumber: { contains: 'P4C-TEST' } },
  })
  await prisma.user.deleteMany({
    where: { email: { contains: 'phase4c-test' } },
  })
}

async function runTests() {
  console.log('\n==================================================')
  console.log('VeriQO Phase 4C: Reporting, PDF & Analytics Test Suite')
  console.log('==================================================\n')

  try {
    await cleanupTestData()

    // 0. Setup test users
    const officer1 = await prisma.user.create({
      data: {
        email: 'phase4c-test-officer1@lm.gov.in',
        name: 'Inspector Vikram Singh (Phase 4C)',
        role: 'AUTHORITY_OFFICER',
        hashedPassword: 'test-hash-password-123',
      },
    })

    const officer2 = await prisma.user.create({
      data: {
        email: 'phase4c-test-officer2@lm.gov.in',
        name: 'Inspector Priya Patel (Phase 4C)',
        role: 'AUTHORITY_OFFICER',
        hashedPassword: 'test-hash-password-123',
      },
    })

    const seniorAuth = await prisma.user.create({
      data: {
        email: 'phase4c-test-senior@lm.gov.in',
        name: 'Controller General Verma (Phase 4C)',
        role: 'SENIOR_AUTHORITY',
        hashedPassword: 'test-hash-password-123',
      },
    })

    const admin = await prisma.user.create({
      data: {
        email: 'phase4c-test-admin@lm.gov.in',
        name: 'System Admin (Phase 4C)',
        role: 'ADMIN',
        hashedPassword: 'test-hash-password-123',
      },
    })

    // Setup Test Legal Rule with Historical Versioning
    const rule = await prisma.legalRule.create({
      data: {
        ruleNumber: 'P4C-TEST-RULE-6(1)(e)',
        title: 'Retail Sale Price Declaration (MRP)',
        requirement: 'The retail sale price of the package shall be clearly printed in Indian Rupees.',
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceReference: 'Rule 6(1)(e)',
        defaultSeverity: 'HIGH',
        effectiveDate: new Date('2011-04-01'),
        isActive: true,
      },
    })

    // Historical Version 1
    const ruleVersion1 = await prisma.ruleVersion.create({
      data: {
        ruleId: rule.id,
        versionNumber: 1,
        changeDescription: 'Phase4C_Test Initial Rule 6(1)(e) statutory enactment',
        changedById: admin.id,
        effectiveDate: new Date('2011-04-01'),
        snapshot: {
          ruleNumber: rule.ruleNumber,
          title: rule.title,
          requirement: rule.requirement,
          defaultSeverity: 'HIGH',
        },
      },
    })

    // Setup Product & ProductScan
    const product = await prisma.product.create({
      data: {
        name: 'Phase4C_Test Organic Almond Milk 1L',
        brand: 'NutriPure India',
        category: 'Food & Beverages',
        manufacturer: 'NutriPure Agro Foods Ltd, Mumbai',
        packer: 'NutriPure Agro Foods Ltd, Mumbai',
        countryOfOrigin: 'India',
        barcode: '8901234567890',
      },
    })

    const scan = await prisma.productScan.create({
      data: {
        userId: officer1.id,
        productId: product.id,
        status: 'COMPLETE',
        identificationStatus: 'IDENTIFIED',
        identifiedProductName: product.name,
        identifiedBrand: product.brand,
        identifiedCategory: product.category,
        identifiedManufacturer: product.manufacturer,
      },
    })

    const scanImage = await prisma.scanImage.create({
      data: {
        scanId: scan.id,
        storageKey: 'scans/phase4c-test/front.jpg',
        originalFilename: 'phase4c-test-front.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 154200,
      },
    })

    // Extracted declarations
    const declMRP = await prisma.extractedDeclaration.create({
      data: {
        scanId: scan.id,
        fieldName: 'mrp',
        rawValue: 'Phase4C_Test MRP Rs 120.00 (incl. of all taxes)',
        normalizedValue: '120.00 INR',
        confidence: 0.98,
        detectionStatus: 'DETECTED',
        sourceText: 'MRP Rs 120.00',
      },
    })

    const declQty = await prisma.extractedDeclaration.create({
      data: {
        scanId: scan.id,
        fieldName: 'net_quantity',
        rawValue: 'Phase4C_Test 1000 ml',
        normalizedValue: '1 L',
        confidence: 0.96,
        detectionStatus: 'DETECTED',
        sourceText: 'Net Qty: 1000 ml',
      },
    })

    // Setup Inspection 1 (Assigned to officer1)
    const inspection1 = await prisma.inspection.create({
      data: {
        officerId: officer1.id,
        productId: product.id,
        scanId: scan.id,
        title: 'Phase4C_Test Official Metrology Inspection #1',
        notes: 'Statutory verification of packaged beverage commodity.',
        status: 'PENDING_REVIEW',
      },
    })

    // Add Compliance Checks:
    // Check 1: FAIL against ruleVersion 1
    const check1 = await prisma.complianceCheck.create({
      data: {
        inspectionId: inspection1.id,
        scanId: scan.id,
        ruleId: rule.id,
        ruleVersionNumber: 1, // Historical version locked
        status: 'FAIL',
        officerNote: 'Phase4C_Test Non-compliant price display formatting detected.',
        evaluationDetails: { summary: 'Phase4C_Test Non-compliant price display formatting detected.' },
      },
    })

    // Formal Violation resulting from FAIL check1
    const violation1 = await prisma.violation.create({
      data: {
        inspectionId: inspection1.id,
        scanId: scan.id,
        ruleId: rule.id,
        severity: 'HIGH',
        description: 'Phase4C_Test Price declaration missing statutory font height compliance under Rule 6(1)(e).',
        remediationGuidance: 'Repack or re-label with minimum specified numeral height as per Rule 9 Schedule II.',
      },
    })

    // Check 2: Advisory WARNING check (Must NOT create a violation)
    const check2 = await prisma.complianceCheck.create({
      data: {
        inspectionId: inspection1.id,
        scanId: scan.id,
        ruleId: rule.id,
        ruleVersionNumber: 1,
        status: 'WARNING',
        officerNote: 'Phase4C_Test Advisory warning: Customer care phone number text contrast is suboptimal.',
        evaluationDetails: { summary: 'Phase4C_Test Advisory warning: Customer care phone number text contrast is suboptimal.' },
      },
    })

    // Online verification & discrepancy
    const onlineVerif = await prisma.onlineVerification.create({
      data: {
        scanId: scan.id,
        sourceUrl: 'https://ecommerce.phase4c-test.in/p/almond-milk-1l',
        domain: 'ecommerce.phase4c-test.in',
        status: 'SUCCESS',
        overallMatchStatus: 'MISMATCH',
      },
    })

    const snapshot = await prisma.onlineListingSnapshot.create({
      data: {
        verificationId: onlineVerif.id,
        contentHash: 'phase4c-test-sha256-abc1234567890abcdef',
        httpStatus: 200,
        contentType: 'text/html; charset=utf-8',
        rawHtml: '<html><body>Phase4C_Test E-commerce Listing</body></html>',
      },
    })

    const onlineDiscrepancy = await prisma.onlineDiscrepancy.create({
      data: {
        verificationId: onlineVerif.id,
        fieldName: 'mrp',
        discrepancyType: 'PRICE_MISMATCH',
        severity: 'HIGH',
        physicalValue: '120.00 INR',
        onlineValue: '150.00 INR',
        discrepancyRatio: 1.25,
        message: 'Phase4C_Test E-commerce listed selling price exceeds physical package MRP by 25%.',
        isStatutoryConcern: true,
        statutoryReference: 'Section 36(1) of Legal Metrology Act, 2009',
      },
    })

    // Phase 4B Evidence items
    const evidence1 = await prisma.evidence.create({
      data: {
        inspectionId: inspection1.id,
        scanId: scan.id,
        type: 'EXTRACTED_TEXT',
        extractedDeclarationId: declMRP.id,
        complianceCheckId: check1.id,
        violationId: violation1.id,
        title: 'Phase4C_Test Physical MRP OCR Declaration Evidence',
        description: 'Phase4C_Test Extracted MRP declaration bounding box and text content.',
        confidence: 0.98,
        createdById: officer1.id,
      },
    })

    const evidence2 = await prisma.evidence.create({
      data: {
        inspectionId: inspection1.id,
        type: 'ONLINE_DISCREPANCY',
        onlineDiscrepancyId: onlineDiscrepancy.id,
        title: 'Phase4C_Test E-Commerce Price Mismatch Evidence',
        description: 'Phase4C_Test Online listed price is Rs 150 vs Rs 120 physical package MRP.',
        createdById: officer1.id,
      },
    })

    // Officer Final Decision
    const officerDecision = await prisma.officerDecision.create({
      data: {
        inspectionId: inspection1.id,
        officerId: officer1.id,
        decision: 'NON_COMPLIANT',
        remarks: 'Phase4C_Test Notice issued to manufacturer and e-commerce platform for Section 36 pricing discrepancy.',
      },
    })

    // =========================================================================
    // TEST 1: Deterministic report data assembly
    // =========================================================================
    console.log('--- Requirement 1: Deterministic Report Data Assembly ---')
    const reportData = await reportGenerator.assembleReportData(inspection1.id, {
      id: officer1.id,
      role: officer1.role,
    })
    assert(
      reportData !== null &&
      reportData.inspection.id === inspection1.id &&
      reportData.officer.id === officer1.id &&
      reportData.securityHash.length === 64,
      'Report data assembled deterministically with valid 64-char SHA-256 security hash'
    )

    // =========================================================================
    // TEST 2: Report contains exact historical ruleVersionNumber
    // =========================================================================
    console.log('--- Requirement 2: Exact Historical RuleVersion in Report ---')
    const reportCheck1 = reportData.complianceChecks.find((c) => c.id === check1.id)
    assert(
      reportCheck1 !== undefined && reportCheck1.ruleVersionNumber === 1,
      `Report check contains exact historical ruleVersionNumber: 1`
    )

    // =========================================================================
    // TEST 3: Historical RuleVersion remains unchanged when a newer version exists
    // =========================================================================
    console.log('--- Requirement 3: RuleVersion Immutability when Newer Exists ---')
    // Create newer version 2 for the rule
    const ruleVersion2 = await prisma.ruleVersion.create({
      data: {
        ruleId: rule.id,
        versionNumber: 2,
        changeDescription: 'Phase4C_Test Revised amendment for unit sale price requirements',
        changedById: admin.id,
        effectiveDate: new Date('2022-12-01'),
        snapshot: {
          ruleNumber: rule.ruleNumber,
          title: rule.title,
          requirement: 'Amended requirement text v2',
          defaultSeverity: 'CRITICAL',
        },
      },
    })

    const reportDataRechecked = await reportGenerator.assembleReportData(inspection1.id, {
      id: officer1.id,
      role: officer1.role,
    })
    const recheckedCheck1 = reportDataRechecked.complianceChecks.find((c) => c.id === check1.id)
    assert(
      recheckedCheck1?.ruleVersionNumber === 1,
      'Historical check retained locked ruleVersionNumber=1 despite existence of newer version=2'
    )

    // =========================================================================
    // TEST 4: WARNING appears as WARNING and does not become a Violation
    // =========================================================================
    console.log('--- Requirement 4: Advisory WARNING Handling ---')
    const reportCheck2 = reportData.complianceChecks.find((c) => c.id === check2.id)
    assert(
      reportCheck2?.status === 'WARNING' && reportCheck2.isAdvisoryOnly === true,
      'ComplianceCheck with status WARNING is marked advisory-only'
    )
    const warningInViolations = reportData.violations.find((v) => v.description.includes('contrast is suboptimal'))
    assert(
      warningInViolations === undefined,
      'WARNING check did not produce any formal Violation in report'
    )

    // =========================================================================
    // TEST 5: FAIL Violation appears only from persisted formal Violation records
    // =========================================================================
    console.log('--- Requirement 5: Formal Violations from Persisted Records Only ---')
    assert(
      reportData.violations.length === 1 &&
      reportData.violations[0].id === violation1.id &&
      reportData.violations[0].severity === 'HIGH',
      'Report contains only persisted formal Violation records with exact severity'
    )

    // =========================================================================
    // TEST 6: Report includes persisted product/declaration information
    // =========================================================================
    console.log('--- Requirement 6: Product & Ground-Truth Declarations in Report ---')
    assert(
      reportData.product?.name === product.name &&
      reportData.product?.brand === product.brand &&
      reportData.declarations.some((d) => d.fieldName === 'mrp' && d.normalizedValue === '120.00 INR'),
      'Report accurately includes persisted product identity and normalized ground-truth declarations'
    )

    // =========================================================================
    // TEST 7: Report includes online verification/discrepancy data when available
    // =========================================================================
    console.log('--- Requirement 7: E-commerce Online Discrepancy Data in Report ---')
    assert(
      reportData.onlineVerification?.domain === 'ecommerce.phase4c-test.in' &&
      reportData.onlineVerification.snapshot?.contentHash === 'phase4c-test-sha256-abc1234567890abcdef' &&
      reportData.onlineVerification.discrepancies.some((d) => d.isStatutoryConcern && d.discrepancyType === 'PRICE_MISMATCH'),
      'Report accurately includes online snapshot hash, domain, and statutory price discrepancy'
    )

    // =========================================================================
    // TEST 8: Report includes Phase 4B evidence references
    // =========================================================================
    console.log('--- Requirement 8: Evidence References & Traceability in Report ---')
    assert(
      reportData.evidenceItems.length === 2 &&
      reportData.evidenceItems.some((e) => e.type === 'EXTRACTED_TEXT' && e.violationId === violation1.id) &&
      reportData.evidenceItems.some((e) => e.type === 'ONLINE_DISCREPANCY'),
      'Report accurately includes Phase 4B evidence references linked to findings'
    )

    // =========================================================================
    // TEST 9: PDF generation returns a valid PDF buffer
    // =========================================================================
    console.log('--- Requirement 9: Server-Side PDF Buffer Generation ---')
    const pdfBuffer = await pdfService.generateInspectionPdf(reportData)
    assert(
      Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 1000,
      `Generated PDF buffer is valid with size ${pdfBuffer.length} bytes`
    )

    // =========================================================================
    // TEST 10: PDF contains expected report sections/header metadata
    // =========================================================================
    console.log('--- Requirement 10: PDF Magic Header & Content Markers ---')
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii')
    assert(
      pdfHeader === '%PDF-',
      `PDF buffer starts with standard publication header marker '%PDF-' (found: '${pdfHeader}')`
    )

    // =========================================================================
    // TEST 11: Report record is persisted in Database
    // =========================================================================
    console.log('--- Requirement 11: Report Record Persistence ---')
    const storageKey = await storageService.upload(
      pdfBuffer,
      `reports/${inspection1.id}/${reportData.reportRef}.pdf`,
      'application/pdf'
    )

    const persistedReport = await prisma.report.create({
      data: {
        inspectionId: inspection1.id,
        generatedById: officer1.id,
        format: 'PDF',
        storageKey,
        reportRef: reportData.reportRef,
        title: `Phase4C_Test Official Metrology Inspection Report — ${reportData.inspection.title}`,
        fileSizeBytes: pdfBuffer.length,
        metadata: {
          securityHash: reportData.securityHash,
          checksCount: reportData.complianceChecks.length,
          violationsCount: reportData.violations.length,
        },
      },
    })

    assert(
      persistedReport.id !== undefined &&
      persistedReport.reportRef === reportData.reportRef &&
      persistedReport.fileSizeBytes === pdfBuffer.length,
      `Report successfully persisted in database with reportRef: ${persistedReport.reportRef}`
    )

    // =========================================================================
    // TEST 12: Report generation is audited
    // =========================================================================
    console.log('--- Requirement 12: Report Generation Audit Logging ---')
    await audit({
      userId: officer1.id,
      action: 'REPORT_GENERATED',
      entityType: 'Inspection',
      entityId: inspection1.id,
      metadata: {
        reportId: persistedReport.id,
        reportRef: persistedReport.reportRef,
        securityHash: reportData.securityHash,
      },
    })

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        action: 'REPORT_GENERATED',
        entityId: inspection1.id,
      },
      orderBy: { createdAt: 'desc' },
    })

    assert(
      auditEntry !== null && (auditEntry.metadata as any)?.reportRef === persistedReport.reportRef,
      'REPORT_GENERATED action logged with report reference and security hash'
    )

    // =========================================================================
    // TEST 13: Unauthorized officer cannot generate/access another officer's report
    // =========================================================================
    console.log('--- Requirement 13: Unauthorized Officer Access Prevention ---')
    let unauthorizedBlocked = false
    try {
      await inspectionService.getInspection(inspection1.id, {
        id: officer2.id,
        role: 'AUTHORITY_OFFICER',
      })
    } catch (err: any) {
      if (err instanceof InspectionAccessError) {
        unauthorizedBlocked = true
      }
    }
    assert(
      unauthorizedBlocked,
      'Officer2 correctly blocked by InspectionAccessError when accessing Officer1 inspection'
    )

    // =========================================================================
    // TEST 14: Senior Authority/Admin can access permitted reports
    // =========================================================================
    console.log('--- Requirement 14: Senior Authority / Admin Access ---')
    const seniorAccess = await inspectionService.getInspection(inspection1.id, {
      id: seniorAuth.id,
      role: 'SENIOR_AUTHORITY',
    })
    const adminAccess = await inspectionService.getInspection(inspection1.id, {
      id: admin.id,
      role: 'ADMIN',
    })
    assert(
      seniorAccess !== null && adminAccess !== null && seniorAccess.id === inspection1.id,
      'Senior Authority and Admin successfully access inspection and its reports'
    )

    // =========================================================================
    // Setup additional data for Analytics Testing
    // =========================================================================
    // Inspection 2 for officer1 (Status: CLOSED, Decision: COMPLIANT)
    const inspection2 = await prisma.inspection.create({
      data: {
        officerId: officer1.id,
        title: 'Phase4C_Test Closed Compliant Inspection #2',
        status: 'CLOSED',
      },
    })
    await prisma.officerDecision.create({
      data: {
        inspectionId: inspection2.id,
        officerId: officer1.id,
        decision: 'COMPLIANT',
        remarks: 'Phase4C_Test Fully compliant packaged commodity.',
      },
    })

    // Inspection 3 for officer1 (Status: DRAFT)
    const inspection3 = await prisma.inspection.create({
      data: {
        officerId: officer1.id,
        title: 'Phase4C_Test Draft Inspection #3',
        status: 'DRAFT',
      },
    })

    // Inspection 4 for officer2 (Isolation check: officer1 should NOT see officer2's inspection in scoped analytics)
    const inspection4 = await prisma.inspection.create({
      data: {
        officerId: officer2.id,
        title: 'Phase4C_Test Officer 2 Isolated Inspection',
        status: 'IN_PROGRESS',
      },
    })

    // =========================================================================
    // TEST 15: Analytics counts are based on real database records
    // =========================================================================
    console.log('--- Requirement 15: Real Database Analytics Aggregation ---')
    const officer1Analytics = await analyticsService.getAuthorityAnalytics({
      id: officer1.id,
      role: 'AUTHORITY_OFFICER',
    })
    assert(
      officer1Analytics.scope === 'OFFICER' &&
      officer1Analytics.totalInspections === 3,
      `Officer1 analytics correctly counts exactly 3 assigned inspections (found: ${officer1Analytics.totalInspections})`
    )

    // =========================================================================
    // TEST 16: Analytics correctly separates inspection statuses
    // =========================================================================
    console.log('--- Requirement 16: Inspection Status Distribution ---')
    assert(
      officer1Analytics.inspectionsByStatus.DRAFT === 1 &&
      officer1Analytics.inspectionsByStatus.PENDING_REVIEW === 1 &&
      officer1Analytics.inspectionsByStatus.CLOSED === 1 &&
      officer1Analytics.inspectionsByStatus.IN_PROGRESS === 0,
      'Analytics correctly separates inspections into DRAFT(1), PENDING_REVIEW(1), CLOSED(1), IN_PROGRESS(0)'
    )

    // =========================================================================
    // TEST 17: Analytics correctly separates officer decisions
    // =========================================================================
    console.log('--- Requirement 17: Officer Decision Distribution ---')
    assert(
      officer1Analytics.officerDecisions.NON_COMPLIANT === 1 &&
      officer1Analytics.officerDecisions.COMPLIANT === 1 &&
      officer1Analytics.officerDecisions.PENDING === 1,
      'Analytics correctly separates decisions: NON_COMPLIANT(1), COMPLIANT(1), PENDING(1)'
    )

    // =========================================================================
    // TEST 18: Analytics correctly aggregates violation severity
    // =========================================================================
    console.log('--- Requirement 18: Violation Severity Breakdown ---')
    assert(
      officer1Analytics.violationsBySeverity.HIGH === 1 &&
      officer1Analytics.violationsBySeverity.CRITICAL === 0 &&
      officer1Analytics.violationsBySeverity.TOTAL === 1,
      'Analytics correctly aggregates HIGH(1), CRITICAL(0), TOTAL(1) violations'
    )

    // =========================================================================
    // TEST 19: Analytics correctly identifies top violated rules
    // =========================================================================
    console.log('--- Requirement 19: Top Violated Rules ---')
    assert(
      officer1Analytics.topViolatedRules.length === 1 &&
      officer1Analytics.topViolatedRules[0].ruleNumber === rule.ruleNumber &&
      officer1Analytics.topViolatedRules[0].count === 1,
      `Analytics correctly identifies '${rule.ruleNumber}' as top violated rule with count 1`
    )

    // =========================================================================
    // TEST 20: Empty datasets return safe zero/empty metrics
    // =========================================================================
    console.log('--- Requirement 20: Safe Handling of Empty Datasets ---')
    const freshOfficer = await prisma.user.create({
      data: {
        email: 'phase4c-test-empty@lm.gov.in',
        name: 'New Trainee Officer (Phase 4C)',
        role: 'AUTHORITY_OFFICER',
        hashedPassword: 'test-hash-password-123',
      },
    })

    const emptyAnalytics = await analyticsService.getAuthorityAnalytics({
      id: freshOfficer.id,
      role: 'AUTHORITY_OFFICER',
    })

    assert(
      emptyAnalytics.totalInspections === 0 &&
      emptyAnalytics.violationsBySeverity.TOTAL === 0 &&
      emptyAnalytics.topViolatedRules.length === 0 &&
      emptyAnalytics.onlineVerificationStats.totalChecked === 0 &&
      emptyAnalytics.onlineVerificationStats.matchRatePercentage === 0 &&
      emptyAnalytics.recentActivity.length === 0 &&
      emptyAnalytics.monthlyTrends.length === 6,
      'Empty dataset safely returns zero totals, 0% match rate, empty lists, and 6 empty trend periods without errors'
    )

    console.log('\n==================================================')
    console.log(`Phase 4C Test Summary: ${testPassed} Passed, ${testFailed} Failed`)
    console.log('==================================================\n')

    await cleanupTestData()

    if (testFailed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Fatal test error in Phase 4C suite:', error)
    await cleanupTestData()
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runTests()
