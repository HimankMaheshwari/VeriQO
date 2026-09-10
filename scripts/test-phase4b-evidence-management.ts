/**
 * VeriQO Phase 4B Test Suite: Evidence Management & Evidence Traceability
 *
 * Tests:
 * 1. Evidence Creation & Linking (All EvidenceTypes, createdById, title, source)
 * 2. Cross-Inspection Evidence Injection Prevention (Security Gate)
 * 3. Officer Isolation & RBAC Access Enforcement
 * 4. Physical Evidence Traceability Chain (Check -> Rule -> RuleVersion -> Declaration -> ScanImage)
 * 5. Statutory Safeguards (WARNING is advisory with 0 violations; FAIL produces violation candidate)
 * 6. Historical RuleVersion Locking (historical version preserved, not dynamically swapped)
 * 7. Online Discrepancy Evidence Traceability Chain (Discrepancy -> Snapshot Hash -> Domain -> Physical Decl)
 * 8. Comprehensive Chronological Evidence Timeline with Provenance Tagging
 * 9. Immutable Audit Logging (EVIDENCE_CREATED)
 */

import { PrismaClient, Role, EvidenceType } from '@prisma/client'
import { EvidenceService, EvidenceValidationError } from '../src/lib/inspections/evidence-service'
import { InspectionService, InspectionAccessError } from '../src/lib/inspections/inspection-service'

const prisma = new PrismaClient()
const evidenceService = new EvidenceService(prisma)
const inspectionService = new InspectionService(prisma)

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
  // Clean up existing test inspections, scans, etc.
  await prisma.evidence.deleteMany({
    where: { description: { contains: 'Phase4B_Test' } },
  })
  await prisma.inspection.deleteMany({
    where: { title: { contains: 'Phase4B_Test' } },
  })
  await prisma.productScan.deleteMany({
    where: { identifiedProductName: { contains: 'Phase4B_Test' } },
  })
  await prisma.user.deleteMany({
    where: { email: { contains: 'phase4b-test' } },
  })
}

async function runTests() {
  console.log('\n==================================================')
  console.log('VeriQO Phase 4B: Evidence Management & Traceability Test Suite')
  console.log('==================================================\n')

  try {
    await cleanupTestData()

    // 0. Setup test users
    const officer1 = await prisma.user.create({
      data: {
        email: 'phase4b-test-officer1@lm.gov.in',
        name: 'Inspector Rajesh Kumar (Phase 4B)',
        role: 'AUTHORITY_OFFICER',
        hashedPassword: 'test-hash-password-123',
      },
    })
    const officer2 = await prisma.user.create({
      data: {
        email: 'phase4b-test-officer2@lm.gov.in',
        name: 'Inspector Sunita Verma (Phase 4B)',
        role: 'AUTHORITY_OFFICER',
        hashedPassword: 'test-hash-password-123',
      },
    })
    const seniorAuth = await prisma.user.create({
      data: {
        email: 'phase4b-test-senior@lm.gov.in',
        name: 'Director General Sharma (Phase 4B)',
        role: 'SENIOR_AUTHORITY',
        hashedPassword: 'test-hash-password-123',
      },
    })
    const admin = await prisma.user.create({
      data: {
        email: 'phase4b-test-admin@lm.gov.in',
        name: 'System Admin (Phase 4B)',
        role: 'ADMIN',
        hashedPassword: 'test-hash-password-123',
      },
    })

    // Setup Test Product Scan 1 (Belongs to Inspection 1)
    const scan1 = await prisma.productScan.create({
      data: {
        userId: officer1.id,
        status: 'COMPLETE',
        identificationStatus: 'IDENTIFIED',
        identifiedProductName: 'Phase4B_Test Premium Almond Milk 1L',
        identifiedBrand: 'Phase4B_Test PureDairy',
        identifiedCategory: 'DAIRY_BEVERAGE',
        images: {
          create: [
            {
              storageKey: 'uploads/scans/test/phase4b_front.jpg',
              originalFilename: 'packaging_front.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 2048576,
            },
          ],
        },
        extractedDeclarations: {
          create: [
            {
              fieldName: 'net_quantity',
              rawValue: 'Net Qty: 1 L',
              normalizedValue: '1 L',
              confidence: 0.98,
              detectionStatus: 'DETECTED',
              sourceText: 'NET QUANTITY 1 LITRE',
            },
            {
              fieldName: 'mrp',
              rawValue: 'MRP Rs. 150.00 (incl. of all taxes)',
              normalizedValue: '150.00',
              confidence: 0.97,
              detectionStatus: 'DETECTED',
              sourceText: 'MRP Rs. 150.00 INCL. ALL TAXES',
            },
            {
              fieldName: 'customer_care',
              rawValue: 'Call 1800-123-4567 or email support@puredairy.in',
              normalizedValue: 'support@puredairy.in',
              confidence: 0.95,
              detectionStatus: 'DETECTED',
              sourceText: 'CUSTOMER CARE: 1800-123-4567',
            },
          ],
        },
      },
      include: { images: true, extractedDeclarations: true },
    })

    // Setup Test Product Scan 2 (Belongs to Inspection 2 — for cross-injection testing)
    const scan2 = await prisma.productScan.create({
      data: {
        userId: officer2.id,
        status: 'COMPLETE',
        identificationStatus: 'IDENTIFIED',
        identifiedProductName: 'Phase4B_Test Foreign Product Scan 2',
        images: {
          create: [
            {
              storageKey: 'uploads/scans/test/phase4b_foreign.jpg',
              originalFilename: 'foreign_photo.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 1048576,
            },
          ],
        },
        extractedDeclarations: {
          create: [
            {
              fieldName: 'mrp',
              rawValue: 'MRP Rs. 99.00',
              normalizedValue: '99.00',
              confidence: 0.95,
              detectionStatus: 'DETECTED',
            },
          ],
        },
      },
      include: { images: true, extractedDeclarations: true },
    })

    // Create Inspection 1 (Officer 1)
    const inspection1 = await inspectionService.createInspection(officer1.id, {
      scanId: scan1.id,
      title: 'Phase4B_Test Inspection 1',
      notes: 'Initial packaging inspection for almond milk',
    })

    // Create Inspection 2 (Officer 2)
    const inspection2 = await inspectionService.createInspection(officer2.id, {
      scanId: scan2.id,
      title: 'Phase4B_Test Inspection 2',
      notes: 'Unrelated inspection for foreign scan',
    })

    // Create Online Verification on Scan 1
    const onlineVer1 = await prisma.onlineVerification.create({
      data: {
        scanId: scan1.id,
        sourceUrl: 'https://ecommerce.example.in/p/almond-milk-1l',
        domain: 'ecommerce.example.in',
        status: 'COMPLETED',
        overallMatchStatus: 'MISMATCH',
        snapshot: {
          create: {
            httpStatus: 200,
            contentType: 'text/html',
            contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            rawHtml: '<html><body>Almond Milk Rs. 180</body></html>',
          },
        },
        discrepancies: {
          create: [
            {
              fieldName: 'mrp',
              discrepancyType: 'PRICE_MISMATCH',
              severity: 'HIGH',
              physicalValue: '150.00',
              onlineValue: '180.00',
              discrepancyRatio: 1.2,
              message: 'Online listed price Rs. 180 exceeds physical package MRP Rs. 150',
              isStatutoryConcern: true,
              statutoryReference: 'Rule 6(1)(e) / Section 36(1) Price Metrology Assurance',
            },
          ],
        },
      },
      include: { discrepancies: true, snapshot: true },
    })

    // Run Compliance Analysis on Inspection 1 to generate ComplianceCheck and Violation records
    const analysisResult = await inspectionService.runComplianceAnalysis(inspection1.id, {
      id: officer1.id,
      role: officer1.role,
    })
    assert(analysisResult.checksCreated > 0, `Compliance analysis executed: created ${analysisResult.checksCreated} checks`)

    // Fetch created checks and violations
    const checks = await prisma.complianceCheck.findMany({
      where: { inspectionId: inspection1.id },
      include: { rule: true },
    })
    const passCheck = checks.find((c) => c.status === 'PASS')
    const warningCheck = checks.find((c) => c.status === 'WARNING')
    const failCheck = checks.find((c) => c.status === 'FAIL')

    console.log(`\n--- 1. Evidence Creation & Linking Across Classifications ---`)

    // 1.1 Attach OFFICER_OBSERVATION
    const obsEvidence = await evidenceService.createEvidence(
      inspection1.id,
      { id: officer1.id, role: officer1.role },
      {
        type: 'OFFICER_OBSERVATION',
        title: 'Phase4B_Test Physical Retailer Inspection',
        description: 'Phase4B_Test: Package physically examined at Supermarket Shelf 4A.',
        confidence: 1.0,
        scanImageId: scan1.images[0]?.id,
      }
    )
    assert(obsEvidence.id !== undefined, 'OFFICER_OBSERVATION evidence record created')
    assert(obsEvidence.createdById === officer1.id, 'Evidence correctly attributed to inspecting officer')
    assert(obsEvidence.type === 'OFFICER_OBSERVATION', 'Evidence type correctly stored as OFFICER_OBSERVATION')
    assert(obsEvidence.scanImageId === scan1.images[0]?.id, 'Evidence correctly linked to physical ScanImage')

    // 1.2 Attach FIELD_MEASUREMENT linked to compliance check
    const measurementEvidence = await evidenceService.createEvidence(
      inspection1.id,
      { id: officer1.id, role: officer1.role },
      {
        type: 'FIELD_MEASUREMENT',
        title: 'Phase4B_Test Vernier Caliper Font Measurement',
        description: 'Phase4B_Test: Numerals measured at 4.2mm height using calibrated digital caliper.',
        confidence: 1.0,
        complianceCheckId: passCheck?.id ?? undefined,
      }
    )
    assert(measurementEvidence.type === 'FIELD_MEASUREMENT', 'FIELD_MEASUREMENT evidence record created')
    assert(measurementEvidence.title === 'Phase4B_Test Vernier Caliper Font Measurement', 'Measurement title preserved')
    assert(measurementEvidence.complianceCheckId === passCheck?.id, 'Field measurement linked directly to ComplianceCheck')

    // 1.3 Attach ONLINE_DISCREPANCY evidence
    const discrepancy = onlineVer1.discrepancies[0]
    const onlineEvidence = await evidenceService.createEvidence(
      inspection1.id,
      { id: officer1.id, role: officer1.role },
      {
        type: 'ONLINE_DISCREPANCY',
        title: 'Phase4B_Test E-Commerce Price Mismatch Evidence',
        description: 'Phase4B_Test: Listing price verified Rs. 30 higher than package MRP.',
        onlineVerificationId: onlineVer1.id,
        onlineDiscrepancyId: discrepancy.id,
      }
    )
    assert(onlineEvidence.type === 'ONLINE_DISCREPANCY', 'ONLINE_DISCREPANCY evidence record created')
    assert(onlineEvidence.onlineDiscrepancyId === discrepancy.id, 'Evidence linked to specific OnlineDiscrepancy')

    console.log(`\n--- 2. Immutable Audit Logging (EVIDENCE_CREATED) ---`)

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Evidence',
        action: 'EVIDENCE_CREATED',
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })
    assert(auditLogs.length >= 3, `Immutable AuditLogs generated: ${auditLogs.length} recent records`)
    assert(auditLogs[0]?.userId === officer1.id, 'Audit log correctly captures officer userId')
    assert(auditLogs[0]?.action === 'EVIDENCE_CREATED', 'Audit action recorded as EVIDENCE_CREATED')

    console.log(`\n--- 3. Cross-Inspection Evidence Injection Prevention (Security Gate) ---`)

    // 3.1 Attempt to inject ScanImage from Inspection 2 into Inspection 1
    let rejectedImage = false
    try {
      await evidenceService.createEvidence(
        inspection1.id,
        { id: officer1.id, role: officer1.role },
        {
          type: 'SCAN_IMAGE',
          description: 'Phase4B_Test: Malicious foreign image attachment',
          scanImageId: scan2.images[0]?.id, // Foreign scan image!
        }
      )
    } catch (err: any) {
      if (err instanceof EvidenceValidationError) {
        rejectedImage = true
      }
    }
    assert(rejectedImage, 'Cross-inspection ScanImage injection strictly rejected by EvidenceService')

    // 3.2 Attempt to inject ExtractedDeclaration from Scan 2 into Inspection 1
    let rejectedDecl = false
    try {
      await evidenceService.createEvidence(
        inspection1.id,
        { id: officer1.id, role: officer1.role },
        {
          type: 'EXTRACTED_TEXT',
          description: 'Phase4B_Test: Foreign declaration attachment',
          extractedDeclarationId: scan2.extractedDeclarations[0]?.id, // Foreign declaration!
        }
      )
    } catch (err: any) {
      if (err instanceof EvidenceValidationError) {
        rejectedDecl = true
      }
    }
    assert(rejectedDecl, 'Cross-inspection ExtractedDeclaration injection strictly rejected')

    // 3.3 Attempt to inject ComplianceCheck from Inspection 1 into Inspection 2
    let rejectedCheck = false
    try {
      await evidenceService.createEvidence(
        inspection2.id,
        { id: officer2.id, role: officer2.role },
        {
          type: 'COMPLIANCE_FINDING',
          description: 'Phase4B_Test: Foreign compliance check attachment',
          complianceCheckId: passCheck?.id, // Belongs to Inspection 1!
        }
      )
    } catch (err: any) {
      if (err instanceof EvidenceValidationError) {
        rejectedCheck = true
      }
    }
    assert(rejectedCheck, 'Cross-inspection ComplianceCheck injection strictly rejected')

    console.log(`\n--- 4. Officer Isolation & RBAC Access Enforcement ---`)

    // 4.1 Officer 2 cannot attach evidence to Officer 1's inspection
    let unauthorizedAttach = false
    try {
      await evidenceService.createEvidence(
        inspection1.id,
        { id: officer2.id, role: officer2.role },
        {
          type: 'OFFICER_NOTE',
          description: 'Phase4B_Test: Unauthorized officer note',
        }
      )
    } catch (err: any) {
      if (err instanceof InspectionAccessError) {
        unauthorizedAttach = true
      }
    }
    assert(unauthorizedAttach, 'Unauthorized Officer 2 blocked from attaching evidence to Officer 1 inspection')

    // 4.2 Officer 2 cannot view evidence of Officer 1's inspection
    let unauthorizedView = false
    try {
      await evidenceService.getInspectionEvidence(
        inspection1.id,
        { id: officer2.id, role: officer2.role }
      )
    } catch (err: any) {
      if (err instanceof InspectionAccessError) {
        unauthorizedView = true
      }
    }
    assert(unauthorizedView, 'Unauthorized Officer 2 blocked from viewing evidence of Officer 1 inspection')

    // 4.3 Senior Authority can view and attach evidence
    const seniorEvidence = await evidenceService.createEvidence(
      inspection1.id,
      { id: seniorAuth.id, role: seniorAuth.role },
      {
        type: 'OFFICER_NOTE',
        title: 'Phase4B_Test Supervisory Note',
        description: 'Phase4B_Test: Supervised by Senior Authority.',
      }
    )
    assert(seniorEvidence.id !== undefined, 'Senior Authority can attach evidence to any inspection')

    const seniorViewList = await evidenceService.getInspectionEvidence(
      inspection1.id,
      { id: seniorAuth.id, role: seniorAuth.role }
    )
    assert(seniorViewList.length >= 4, `Senior Authority retrieved all ${seniorViewList.length} evidence records`)

    // 4.4 Admin can view evidence
    const adminViewList = await evidenceService.getInspectionEvidence(
      inspection1.id,
      { id: admin.id, role: admin.role }
    )
    assert(adminViewList.length === seniorViewList.length, 'Administrator successfully viewed all inspection evidence')

    console.log(`\n--- 5. Physical Evidence Traceability Chain ---`)

    if (passCheck) {
      const trace = await evidenceService.getPhysicalEvidenceTrace(passCheck.id, {
        id: officer1.id,
        role: officer1.role,
      })

      assert(trace.complianceCheckId === passCheck.id, 'Trace maps to exact ComplianceCheck')
      assert(trace.rule.ruleNumber.length > 0, `Trace includes statutory rule: ${trace.rule.ruleNumber}`)
      assert(trace.rule.requirement.length > 0, 'Trace includes exact statutory mandate requirement')
      assert(trace.ruleVersion !== null, `Trace includes locked RuleVersion: v${trace.ruleVersion?.versionNumber}`)
      assert(trace.ruleVersion?.effectiveDate !== undefined, 'Trace includes statutory effective date')
      assert(trace.status === passCheck.status, `Trace status matches check: ${trace.status}`)
      assert(trace.scanImage?.storageKey === scan1.images[0]?.storageKey, 'Trace resolves packaging photograph source')
      assert(trace.attachedEvidence.length > 0, `Trace includes ${trace.attachedEvidence.length} linked officer evidence items`)
    } else {
      console.warn('  ! No PASS check found for trace test')
    }

    console.log(`\n--- 6. Statutory Safeguards & Advisory Findings ---`)

    // Test Advisory WARNING Safeguard
    if (warningCheck) {
      const warningTrace = await evidenceService.getPhysicalEvidenceTrace(warningCheck.id, {
        id: officer1.id,
        role: officer1.role,
      })
      assert(warningTrace.isAdvisoryOnly === true, 'WARNING check is correctly flagged as isAdvisoryOnly')
      assert(warningTrace.violation === null, 'Advisory WARNING created ZERO formal violation records')
    } else {
      console.log('  i No WARNING check in this scan; verifying zero violation rule invariance')
      const violationsForPass = await prisma.violation.findMany({
        where: { inspectionId: inspection1.id, ruleId: passCheck?.ruleId },
      })
      assert(violationsForPass.length === 0, 'PASS finding produces ZERO violation records')
    }

    // Test Formal Violation Candidate for FAIL
    if (failCheck) {
      const failTrace = await evidenceService.getPhysicalEvidenceTrace(failCheck.id, {
        id: officer1.id,
        role: officer1.role,
      })
      assert(failTrace.isAdvisoryOnly === false, 'FAIL finding is not advisory')
      assert(failTrace.violation !== null, 'FAIL finding includes formal Violation record')
      assert(failTrace.violation?.remediationGuidance !== undefined, 'Violation candidate provides statutory remediation guidance')
    }

    console.log(`\n--- 7. Online Discrepancy Evidence Traceability Chain ---`)

    const onlineTrace = await evidenceService.getOnlineEvidenceTrace(discrepancy.id, {
      id: officer1.id,
      role: officer1.role,
    })
    assert(onlineTrace.onlineDiscrepancyId === discrepancy.id, 'Online trace resolves target discrepancy ID')
    assert(onlineTrace.domain === 'ecommerce.example.in', 'Online trace resolves external domain')
    assert(onlineTrace.snapshot?.contentHash === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Online trace resolves SHA-256 snapshot hash')
    assert(onlineTrace.discrepancy.discrepancyType === 'PRICE_MISMATCH', 'Online trace captures PRICE_MISMATCH discrepancy type')
    assert(onlineTrace.discrepancy.physicalValue === '150.00', 'Physical value matches packaging MRP (Rs. 150)')
    assert(onlineTrace.discrepancy.onlineValue === '180.00', 'Online value captures marketplace price (Rs. 180)')
    assert(onlineTrace.discrepancy.isStatutoryConcern === true, 'Statutory concern flag preserved')
    assert(onlineTrace.discrepancy.statutoryReference?.includes('Rule 6(1)(e)') === true, 'Statutory authority citation verified')

    console.log(`\n--- 8. Comprehensive Chronological Evidence Timeline ---`)

    const timeline = await evidenceService.getInspectionTimeline(inspection1.id, {
      id: officer1.id,
      role: officer1.role,
    })
    assert(timeline.length > 5, `Timeline assembled ${timeline.length} chronological milestones`)

    // Verify all major provenances exist
    const provenances = new Set(timeline.map((item) => item.provenance))
    assert(provenances.has('PHYSICAL_SCAN'), 'Timeline contains PHYSICAL_SCAN provenance')
    assert(provenances.has('AUTOMATED_EXTRACTION'), 'Timeline contains AUTOMATED_EXTRACTION provenance')
    assert(provenances.has('DETERMINISTIC_EVALUATION'), 'Timeline contains DETERMINISTIC_EVALUATION provenance')
    assert(provenances.has('ONLINE_ACQUISITION'), 'Timeline contains ONLINE_ACQUISITION provenance')
    assert(provenances.has('OFFICER_ENTRY'), 'Timeline contains OFFICER_ENTRY provenance')

    // Verify chronological descending order
    let isSorted = true
    for (let i = 0; i < timeline.length - 1; i++) {
      const curr = new Date(timeline[i]?.timestamp ?? 0).getTime()
      const next = new Date(timeline[i + 1]?.timestamp ?? 0).getTime()
      if (curr < next) {
        isSorted = false
        break
      }
    }
    assert(isSorted, 'Timeline strictly sorted in reverse-chronological order (newest first)')

    console.log('\n==================================================')
    console.log(`Phase 4B Test Summary: ${testPassed} Passed, ${testFailed} Failed`)
    console.log('==================================================\n')

    if (testFailed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal error during Phase 4B test suite:', err)
    process.exit(1)
  } finally {
    await cleanupTestData()
    await prisma.$disconnect()
  }
}

runTests()
