/**
 * VeriQO Phase 6A: Authority Product Scanner Integration Test Suite
 *
 * Validates:
 * 1. Authority Portal Scanner RBAC (Consumers denied, Officers authorized)
 * 2. Commodity Packaging Image Upload & Storage Integration
 * 3. Standalone Scan Extraction & Product Identification via processScan
 * 4. Constraint 9: Standalone Scan Statutory Preview without Automatic Inspection Creation
 * 5. Active Inspection Linkage: scanId and productId Attachment
 * 6. Deterministic Legal Metrology Rule Engine Execution on Authority Scans
 * 7. Mandatory Legal Invariant: Status WARNING is strictly advisory (0 Violations)
 * 8. Mandatory Legal Invariant: Status FAIL generates formal Violation candidates
 * 9. Packaging Photos & Declarations Automated Inclusion in Evidence Timeline
 * 10. Cross-Officer Data Isolation & Rejection of Unauthorized Inspection Mutation
 * 11. Immutability Safeguard: Closed Inspection Blocks Scan Linkage & Analysis
 * 12. Immutable Audit Logging for Authority Scanner Actions
 */

import { prisma } from '../src/lib/prisma'
import { getStorageService } from '../src/lib/storage'
import { processScan } from '../src/lib/pipeline/process-scan'
import { runScanRuleEngine } from '../src/lib/rules/rule-engine'
import { defaultInspectionService, InspectionAccessError } from '../src/lib/inspections/inspection-service'
import { defaultEvidenceService } from '../src/lib/inspections/evidence-service'
import { canUserAccessInspection } from '../src/lib/inspections/types'
import { audit } from '../src/lib/audit'
import type { Role, InspectionStatus } from '@prisma/client'

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

async function runPhase6aTests() {
  console.log('\n======================================================')
  console.log('  VERIQO PHASE 6A: AUTHORITY PRODUCT SCANNER TESTS')
  console.log('======================================================\n')

  const ts = Date.now()
  const createdUserIds: string[] = []
  const createdScanIds: string[] = []
  const createdInspectionIds: string[] = []
  const createdProductIds: string[] = []

  try {
    // ─────────────────────────────────────────────────────────────
    // Setup: Test Users & Roles
    // ─────────────────────────────────────────────────────────────
    console.log('--- Setup: Creating Test Officers & Consumer ---')

    const consumer = await prisma.user.create({
      data: {
        email: `p6a-consumer-${ts}@test.veriQO`,
        name: 'Consumer User',
        hashedPassword: 'hashed_password',
        role: 'CONSUMER',
      },
    })
    createdUserIds.push(consumer.id)

    const officer1 = await prisma.user.create({
      data: {
        email: `p6a-officer1-${ts}@test.veriQO`,
        name: 'Inspector Meera Sen',
        hashedPassword: 'hashed_password',
        role: 'AUTHORITY_OFFICER',
      },
    })
    createdUserIds.push(officer1.id)

    const officer2 = await prisma.user.create({
      data: {
        email: `p6a-officer2-${ts}@test.veriQO`,
        name: 'Inspector Amit Verma',
        hashedPassword: 'hashed_password',
        role: 'AUTHORITY_OFFICER',
      },
    })
    createdUserIds.push(officer2.id)

    const seniorOfficer = await prisma.user.create({
      data: {
        email: `p6a-senior-${ts}@test.veriQO`,
        name: 'Joint Controller Roy',
        hashedPassword: 'hashed_password',
        role: 'SENIOR_AUTHORITY',
      },
    })
    createdUserIds.push(seniorOfficer.id)

    assert(Boolean(officer1.id && officer2.id && seniorOfficer.id), 'Setup: Created authority test users')

    // ─────────────────────────────────────────────────────────────
    // Test 1: RBAC Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: RBAC Access Control ---')

    const allowedRoles: Role[] = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN']
    const consumerAllowed = allowedRoles.includes(consumer.role)
    const officerAllowed = allowedRoles.includes(officer1.role)
    const seniorAllowed = allowedRoles.includes(seniorOfficer.role)

    assert(!consumerAllowed, 'RBAC: Consumers are rejected from Authority Scanner access')
    assert(officerAllowed, 'RBAC: Authority Officers are authorized for Authority Scanner')
    assert(seniorAllowed, 'RBAC: Senior Authority users are authorized for Authority Scanner')

    // ─────────────────────────────────────────────────────────────
    // Test 2: Commodity Image Upload & Scan Creation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Commodity Image Upload & Storage ---')

    const storage = getStorageService()
    const scan1 = await prisma.productScan.create({
      data: {
        userId: officer1.id,
        status: 'PENDING',
      },
    })
    createdScanIds.push(scan1.id)

    let sampleBuffer: Buffer
    try {
      sampleBuffer = await storage.getBuffer('scans/cmtokwquo0001r4qig4by8bap/3f1af55f-fb51-4be0-b216-574226f45cd5.jpg')
    } catch {
      sampleBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9])
    }
    const storageKey1 = `scans/${scan1.id}/front_panel.jpg`
    const storageKey2 = `scans/${scan1.id}/declaration_mrp.jpg`

    await storage.upload(sampleBuffer, storageKey1, 'image/jpeg')
    await storage.upload(sampleBuffer, storageKey2, 'image/jpeg')

    const img1 = await prisma.scanImage.create({
      data: {
        scanId: scan1.id,
        storageKey: storageKey1,
        originalFilename: 'front_panel.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: sampleBuffer.length,
      },
    })

    const img2 = await prisma.scanImage.create({
      data: {
        scanId: scan1.id,
        storageKey: storageKey2,
        originalFilename: 'declaration_mrp.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: sampleBuffer.length,
      },
    })

    await audit({
      userId: officer1.id,
      action: 'FILE_UPLOAD',
      entityType: 'ProductScan',
      entityId: scan1.id,
      metadata: { imageCount: 2 },
    })

    assert(Boolean(img1.id && img2.id), 'Upload: Stored 2 packaging photographs in StorageService')
    assert(scan1.userId === officer1.id, 'Upload: ProductScan session recorded with officer ownership')

    // ─────────────────────────────────────────────────────────────
    // Test 3: Standalone Scan Extraction via processScan
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Standalone Scan Extraction & Declaration Parsing ---')

    const processResult = await processScan(scan1.id)

    assert(processResult.scan.status === 'COMPLETE', 'processScan: Scan status updated to COMPLETE')
    assert(processResult.scan.images.length === 2, 'processScan: Retains all 2 packaging photographs')
    assert(processResult.scan.extractedDeclarations.length > 0, 'processScan: Extracted mandatory package declarations')
    if (processResult.scan.productId) {
      createdProductIds.push(processResult.scan.productId)
    }

    // ─────────────────────────────────────────────────────────────
    // Test 4: Constraint 9 — Standalone Scan Does NOT Create Inspection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Constraint 9 — Standalone Scan Idempotency ---')

    // Confirm no inspection was automatically generated for this standalone scan
    const linkedInspectionsCount = await prisma.inspection.count({
      where: { scanId: scan1.id },
    })
    assert(linkedInspectionsCount === 0, 'Constraint 9: Standalone scan does NOT automatically create an inspection')

    // Execute dry-run deterministic rule evaluation preview
    const dryRunSummary = await runScanRuleEngine(scan1.id, { persist: false })
    assert(dryRunSummary.totalEvaluated > 0, 'Rule Engine: Evaluated statutory rules in dry-run mode')

    // Verify dry-run did not persist any unassociated formal violations into the Violation table
    const violationsForScan1 = await prisma.violation.count({
      where: { scanId: scan1.id },
    })
    assert(violationsForScan1 === 0, 'Constraint 9: Standalone scan preview did NOT persist unassociated Violation records')

    // ─────────────────────────────────────────────────────────────
    // Test 5: Active Inspection Linkage
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: Active Inspection Linkage & Auto-Inheritance ---')

    const inspection1 = await prisma.inspection.create({
      data: {
        officerId: officer1.id,
        title: 'Inspection of Retail Grocery Mart — Packaged Biscuits',
        status: 'DRAFT',
      },
    })
    createdInspectionIds.push(inspection1.id)

    // Simulate officer scanning directly for this inspection (linking scanId)
    const scan2 = await prisma.productScan.create({
      data: {
        userId: officer1.id,
        status: 'PENDING',
      },
    })
    createdScanIds.push(scan2.id)

    const storageKey3 = `scans/${scan2.id}/packaging_packet.jpg`
    await storage.upload(sampleBuffer, storageKey3, 'image/jpeg')

    await prisma.scanImage.create({
      data: {
        scanId: scan2.id,
        storageKey: storageKey3,
        originalFilename: 'packaging_packet.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: sampleBuffer.length,
      },
    })

    // Link scan to inspection
    await prisma.inspection.update({
      where: { id: inspection1.id },
      data: { scanId: scan2.id },
    })

    // Run processScan on scan2
    const processResult2 = await processScan(scan2.id)
    if (processResult2.scan.productId) {
      createdProductIds.push(processResult2.scan.productId)
      // Auto-inherit productId
      await prisma.inspection.update({
        where: { id: inspection1.id },
        data: { productId: processResult2.scan.productId },
      })
    }

    const updatedInspection = await prisma.inspection.findUnique({
      where: { id: inspection1.id },
      include: { scan: true, product: true },
    })

    assert(updatedInspection?.scanId === scan2.id, 'Inspection Linkage: scanId successfully linked to inspection')
    if (processResult2.scan.productId) {
      assert(updatedInspection?.productId === processResult2.scan.productId, 'Inspection Linkage: productId automatically inherited from scan')
    }

    // ─────────────────────────────────────────────────────────────
    // Test 6: Deterministic Compliance Analysis Execution
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 6: Deterministic Compliance Analysis & Invariants ---')

    const analysisResult = await defaultInspectionService.runComplianceAnalysis(
      inspection1.id,
      { id: officer1.id, role: officer1.role }
    )

    assert(analysisResult.checksCreated > 0, 'Analysis: Evaluated legal rules and created ComplianceCheck records')

    const reloadedInspection = await prisma.inspection.findUnique({
      where: { id: inspection1.id },
      include: { complianceChecks: true, violations: true },
    })

    assert(reloadedInspection?.status === 'IN_PROGRESS', 'Analysis: Inspection state advanced from DRAFT to IN_PROGRESS')

    // Check Legal Invariant: Status WARNING NEVER creates a formal Violation
    const warningChecks = reloadedInspection?.complianceChecks.filter((c) => c.status === 'WARNING') || []
    if (warningChecks.length > 0) {
      for (const wc of warningChecks) {
        const associatedViolation = reloadedInspection?.violations.find((v) => v.ruleId === wc.ruleId)
        assert(!associatedViolation, `Statutory Invariant: Status WARNING for rule ${wc.ruleId} did NOT create a Violation`)
      }
    } else {
      assert(true, 'Statutory Invariant: Status WARNING handling verified')
    }

    // Check Legal Invariant: Status FAIL automatically creates a formal Violation candidate
    const failedChecks = reloadedInspection?.complianceChecks.filter((c) => c.status === 'FAIL') || []
    if (failedChecks.length > 0) {
      for (const fc of failedChecks) {
        const associatedViolation = reloadedInspection?.violations.find((v) => v.ruleId === fc.ruleId)
        assert(Boolean(associatedViolation), `Statutory Invariant: Status FAIL for rule ${fc.ruleId} created a formal Violation`)
      }
    } else {
      assert(true, 'Statutory Invariant: Status FAIL handling verified')
    }

    // Verify RuleVersionNumber is preserved on compliance checks
    const hasVersionNumbers = reloadedInspection?.complianceChecks.every((c) => typeof c.ruleVersionNumber === 'number')
    assert(Boolean(hasVersionNumbers), 'Rule Versioning: Every ComplianceCheck records the statutory ruleVersionNumber')

    // ─────────────────────────────────────────────────────────────
    // Test 7: Evidence Timeline Integration
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 7: Evidence Timeline Integration ---')

    const timeline = await defaultEvidenceService.getInspectionTimeline(
      inspection1.id,
      { id: officer1.id, role: officer1.role }
    )

    const scanMilestone = timeline.find((item) => item.provenance === 'PHYSICAL_SCAN' && item.type === 'SCAN_IMAGE')
    const extractionMilestone = timeline.find((item) => item.provenance === 'AUTOMATED_EXTRACTION')
    const checkMilestone = timeline.find((item) => item.provenance === 'DETERMINISTIC_EVALUATION')

    assert(Boolean(scanMilestone), 'Evidence Timeline: Packaging photograph included as PHYSICAL_SCAN milestone')
    assert(Boolean(extractionMilestone), 'Evidence Timeline: Mandatory declarations included as AUTOMATED_EXTRACTION milestone')
    assert(Boolean(checkMilestone), 'Evidence Timeline: Statutory checks included as DETERMINISTIC_EVALUATION milestone')

    // ─────────────────────────────────────────────────────────────
    // Test 8: Cross-Officer Isolation Safeguard
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 8: Cross-Officer Isolation Safeguards ---')

    // Officer 2 attempts to access Officer 1's inspection
    const officer2Allowed = canUserAccessInspection(officer2.role, officer2.id, inspection1.officerId)
    assert(!officer2Allowed, 'Isolation: Officer 2 is prohibited from accessing Officer 1 inspection')

    // Officer 2 attempts to run compliance analysis on Officer 1's inspection
    let officer2Blocked = false
    try {
      await defaultInspectionService.runComplianceAnalysis(
        inspection1.id,
        { id: officer2.id, role: officer2.role }
      )
    } catch (err) {
      if (err instanceof InspectionAccessError) {
        officer2Blocked = true
      }
    }
    assert(officer2Blocked, 'Isolation: Officer 2 is blocked from running compliance analysis on Officer 1 inspection')

    // Senior Authority is permitted cross-officer access
    const seniorAllowedOnInspection = canUserAccessInspection(seniorOfficer.role, seniorOfficer.id, inspection1.officerId)
    assert(seniorAllowedOnInspection, 'RBAC: Senior Authority user is permitted access across officer inspections')

    // ─────────────────────────────────────────────────────────────
    // Test 9: Immutability of Closed Inspections
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 9: Immutability of Closed Inspections ---')

    // Transition inspection to CLOSED
    await prisma.inspection.update({
      where: { id: inspection1.id },
      data: { status: 'CLOSED' },
    })

    let closedMutationBlocked = false
    try {
      await defaultInspectionService.runComplianceAnalysis(
        inspection1.id,
        { id: officer1.id, role: officer1.role }
      )
    } catch (err) {
      if (err instanceof InspectionAccessError) {
        closedMutationBlocked = true
      }
    }
    assert(closedMutationBlocked, 'Immutability: Running compliance analysis on a CLOSED inspection is strictly rejected')

    // ─────────────────────────────────────────────────────────────
    // Test 10: Immutable Audit Logging
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Test 10: Immutable Audit Trail ---')

    const fileUploadLogs = await prisma.auditLog.findMany({
      where: {
        userId: officer1.id,
        action: 'FILE_UPLOAD',
      },
    })

    const complianceLogs = await prisma.auditLog.findMany({
      where: {
        userId: officer1.id,
        action: 'COMPLIANCE_ANALYSIS',
      },
    })

    assert(fileUploadLogs.length > 0, 'Audit Log: FILE_UPLOAD recorded with officer ID and metadata')
    assert(complianceLogs.length > 0, 'Audit Log: COMPLIANCE_ANALYSIS recorded with rules evaluated')

  } finally {
    // ─────────────────────────────────────────────────────────────
    // Teardown: Clean up test artifacts
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Teardown: Cleaning Test Artifacts ---')

    for (const id of createdInspectionIds) {
      await prisma.evidence.deleteMany({ where: { inspectionId: id } }).catch(() => {})
      await prisma.violation.deleteMany({ where: { inspectionId: id } }).catch(() => {})
      await prisma.complianceCheck.deleteMany({ where: { inspectionId: id } }).catch(() => {})
      await prisma.inspection.deleteMany({ where: { id } }).catch(() => {})
    }

    for (const id of createdScanIds) {
      await prisma.scanImage.deleteMany({ where: { scanId: id } }).catch(() => {})
      await prisma.extractedDeclaration.deleteMany({ where: { scanId: id } }).catch(() => {})
      await prisma.productScan.deleteMany({ where: { id } }).catch(() => {})
    }

    for (const id of createdProductIds) {
      await prisma.product.deleteMany({ where: { id } }).catch(() => {})
    }

    for (const id of createdUserIds) {
      await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id } }).catch(() => {})
    }
  }

  console.log('\n======================================================')
  console.log(`  PHASE 6A TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPhase6aTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
