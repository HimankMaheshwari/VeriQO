/**
 * VeriQO Phase 4A: Authority Inspection Workflow Test Suite
 *
 * Validates:
 * 1. Inspection Lifecycle State Machine (DRAFT → IN_PROGRESS → PENDING_REVIEW → CLOSED)
 * 2. Invalid Transition Rejection & State Invariants
 * 3. Authority / Senior Authority / Admin RBAC Enforcement
 * 4. Integration with ProductScan, ScanImage, ExtractedDeclaration, and Phase 3C OnlineVerification
 * 5. Deterministic Compliance Analysis Execution & RuleVersion Tracking
 * 6. Mandatory Legal Safeguard: WARNING remains advisory and NEVER creates a Violation record
 * 7. Mandatory Legal Safeguard: FAIL creates formal automated Violation candidates
 * 8. Officer Decision Workflow with Remarks and Status Updates
 * 9. Inspector Evidence Observation Notes Attachment
 * 10. Immutable Audit Logging for Inspection Actions
 */

import { prisma } from '../src/lib/prisma'
import {
  InspectionService,
  InspectionAccessError,
  InspectionStateTransitionError,
} from '../src/lib/inspections/inspection-service'
import {
  PERMISSIBLE_TRANSITIONS,
  canUserAccessInspection,
  canUserReopenInspection,
} from '../src/lib/inspections/types'
import type { Role, InspectionStatus, AuthorityDecision } from '@prisma/client'

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

async function runPhase4aTests() {
  console.log('\n======================================================')
  console.log('  VERIQO PHASE 4A: AUTHORITY INSPECTION WORKFLOW TESTS')
  console.log('======================================================\n')

  const service = new InspectionService(prisma)

  // Track created entities for cleanup
  const createdInspectionIds: string[] = []
  const createdScanIds: string[] = []
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []

  try {
    // ─────────────────────────────────────────────────────────────
    // Setup Test Users for RBAC validation
    // ─────────────────────────────────────────────────────────────
    console.log('--- Setup: Test Users & Roles ---')

    const officer1 = await prisma.user.upsert({
      where: { email: 'officer1.p4a@test.veriQO' },
      update: {},
      create: {
        email: 'officer1.p4a@test.veriQO',
        name: 'Officer Rajesh',
        hashedPassword: 'hash',
        role: 'AUTHORITY_OFFICER',
      },
    })
    createdUserIds.push(officer1.id)

    const officer2 = await prisma.user.upsert({
      where: { email: 'officer2.p4a@test.veriQO' },
      update: {},
      create: {
        email: 'officer2.p4a@test.veriQO',
        name: 'Officer Vikram',
        hashedPassword: 'hash',
        role: 'AUTHORITY_OFFICER',
      },
    })
    createdUserIds.push(officer2.id)

    const seniorAuthority = await prisma.user.upsert({
      where: { email: 'senior.p4a@test.veriQO' },
      update: {},
      create: {
        email: 'senior.p4a@test.veriQO',
        name: 'Supt. Anita Mehta',
        hashedPassword: 'hash',
        role: 'SENIOR_AUTHORITY',
      },
    })
    createdUserIds.push(seniorAuthority.id)

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin.p4a@test.veriQO' },
      update: {},
      create: {
        email: 'admin.p4a@test.veriQO',
        name: 'Admin User',
        hashedPassword: 'hash',
        role: 'ADMIN',
      },
    })
    createdUserIds.push(adminUser.id)

    console.log('  Setup complete.\n')

    // ─────────────────────────────────────────────────────────────
    // 1. Inspection Creation & Initial State
    // ─────────────────────────────────────────────────────────────
    console.log('--- 1. Inspection Creation & Lifecycle ---')

    const insp1 = await service.createInspection(officer1.id, {
      title: 'P4A Test Inspection Alpha',
      notes: 'Initial surveillance at Connaught Place',
    })
    createdInspectionIds.push(insp1.id)

    assert(insp1.status === 'DRAFT', 'New inspection initializes in DRAFT status')
    assert(insp1.officerId === officer1.id, 'Inspection is assigned to the creating officer')

    // ─────────────────────────────────────────────────────────────
    // 2. Permissible State Transitions
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. State Machine Transitions ---')

    // DRAFT -> IN_PROGRESS
    const t1 = await service.transitionStatus(
      insp1.id,
      { id: officer1.id, role: officer1.role },
      'IN_PROGRESS'
    )
    assert(t1?.status === 'IN_PROGRESS', 'Transition DRAFT -> IN_PROGRESS succeeds')

    // IN_PROGRESS -> PENDING_REVIEW
    const t2 = await service.transitionStatus(
      insp1.id,
      { id: officer1.id, role: officer1.role },
      'PENDING_REVIEW'
    )
    assert(t2?.status === 'PENDING_REVIEW', 'Transition IN_PROGRESS -> PENDING_REVIEW succeeds')

    // PENDING_REVIEW -> CLOSED
    const t3 = await service.transitionStatus(
      insp1.id,
      { id: officer1.id, role: officer1.role },
      'CLOSED'
    )
    assert(t3?.status === 'CLOSED', 'Transition PENDING_REVIEW -> CLOSED succeeds')

    // ─────────────────────────────────────────────────────────────
    // 3. Invalid State Transitions Rejection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Invalid State Transitions Rejection ---')

    const insp2 = await service.createInspection(officer1.id, {
      title: 'P4A Test Inspection Beta (Invalid Transitions)',
    })
    createdInspectionIds.push(insp2.id)

    // DRAFT -> PENDING_REVIEW (Invalid jump)
    let jumped = false
    try {
      await service.transitionStatus(
        insp2.id,
        { id: officer1.id, role: officer1.role },
        'PENDING_REVIEW'
      )
      jumped = true
    } catch (err: any) {
      assert(
        err instanceof InspectionStateTransitionError,
        'Direct transition DRAFT -> PENDING_REVIEW correctly rejected'
      )
    }
    if (jumped) assert(false, 'Direct transition DRAFT -> PENDING_REVIEW correctly rejected')

    // Advance insp2 to PENDING_REVIEW legitimately
    await service.transitionStatus(insp2.id, { id: officer1.id, role: officer1.role }, 'IN_PROGRESS')
    await service.transitionStatus(insp2.id, { id: officer1.id, role: officer1.role }, 'PENDING_REVIEW')

    // PENDING_REVIEW -> DRAFT (Invalid backward jump)
    let reversed = false
    try {
      await service.transitionStatus(
        insp2.id,
        { id: officer1.id, role: officer1.role },
        'DRAFT'
      )
      reversed = true
    } catch (err: any) {
      assert(
        err instanceof InspectionStateTransitionError,
        'Backward transition PENDING_REVIEW -> DRAFT correctly rejected'
      )
    }
    if (reversed) assert(false, 'Backward transition PENDING_REVIEW -> DRAFT correctly rejected')

    // ─────────────────────────────────────────────────────────────
    // 4. Reopening Closed Inspections (RBAC Gate)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Reopening Closed Inspections (RBAC Gate) ---')

    // Close insp2
    await service.transitionStatus(insp2.id, { id: officer1.id, role: officer1.role }, 'CLOSED')

    // Standard Authority Officer attempts to reopen -> BLOCKED
    let officerReopened = false
    try {
      await service.transitionStatus(
        insp2.id,
        { id: officer1.id, role: officer1.role },
        'IN_PROGRESS'
      )
      officerReopened = true
    } catch (err: any) {
      assert(
        err instanceof InspectionAccessError,
        'Standard officer blocked from reopening CLOSED inspection'
      )
    }
    if (officerReopened) assert(false, 'Standard officer blocked from reopening CLOSED inspection')

    // Senior Authority attempts to reopen -> ALLOWED
    const seniorReopened = await service.transitionStatus(
      insp2.id,
      { id: seniorAuthority.id, role: seniorAuthority.role },
      'IN_PROGRESS'
    )
    assert(
      seniorReopened?.status === 'IN_PROGRESS',
      'Senior Authority successfully reopens CLOSED inspection'
    )

    // Re-close insp2
    await service.transitionStatus(insp2.id, { id: seniorAuthority.id, role: seniorAuthority.role }, 'CLOSED')

    // Admin attempts to reopen -> ALLOWED
    const adminReopened = await service.transitionStatus(
      insp2.id,
      { id: adminUser.id, role: adminUser.role },
      'IN_PROGRESS'
    )
    assert(
      adminReopened?.status === 'IN_PROGRESS',
      'Administrator successfully reopens CLOSED inspection'
    )

    // ─────────────────────────────────────────────────────────────
    // 5. RBAC Isolation Between Officers
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Officer Isolation & RBAC Boundaries ---')

    // Officer 2 attempts to get Officer 1's inspection -> BLOCKED
    let officer2Accessed = false
    try {
      await service.getInspection(insp1.id, {
        id: officer2.id,
        role: officer2.role,
      })
      officer2Accessed = true
    } catch (err: any) {
      assert(
        err instanceof InspectionAccessError,
        'Officer 2 cannot view Officer 1 private inspection'
      )
    }
    if (officer2Accessed) assert(false, 'Officer 2 cannot view Officer 1 private inspection')

    // Officer 2 attempts to update Officer 1's inspection -> BLOCKED
    let officer2Updated = false
    try {
      await service.updateInspection(
        insp1.id,
        { id: officer2.id, role: officer2.role },
        { title: 'Hacked by Officer 2' }
      )
      officer2Updated = true
    } catch (err: any) {
      assert(
        err instanceof InspectionAccessError,
        'Officer 2 cannot update Officer 1 private inspection'
      )
    }
    if (officer2Updated) assert(false, 'Officer 2 cannot update Officer 1 private inspection')

    // Senior Authority can access Officer 1's inspection
    const seniorView = await service.getInspection(insp1.id, {
      id: seniorAuthority.id,
      role: seniorAuthority.role,
    })
    assert(
      seniorView?.id === insp1.id,
      'Senior Authority can view any officer inspection'
    )

    // Admin can access Officer 1's inspection
    const adminView = await service.getInspection(insp1.id, {
      id: adminUser.id,
      role: adminUser.role,
    })
    assert(
      adminView?.id === insp1.id,
      'Administrator can view any officer inspection'
    )

    // ─────────────────────────────────────────────────────────────
    // 6. Data Hierarchy Integration: Scan, Declarations, Images, OnlineVerification
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Complete Data Integration & Hierarchy ---')

    // Create test Product
    const testProduct = await prisma.product.create({
      data: {
        barcode: `TEST-P4A-${Date.now()}`,
        name: 'Himalayan Organic Premium Basmati Rice',
        brand: 'Himalayan Heritage',
        category: 'Food - Grains',
      },
    })
    createdProductIds.push(testProduct.id)

    // Create test ProductScan
    const testScan = await prisma.productScan.create({
      data: {
        userId: officer1.id,
        productId: testProduct.id,
        status: 'COMPLETE',
        identifiedProductName: 'Himalayan Organic Premium Basmati Rice 5kg',
        identifiedBrand: 'Himalayan Heritage',
        ocrStatus: 'SUCCESS',
        rawOcrText: 'Himalayan Heritage Basmati Rice. Net Qty: 5 kg. MRP: Rs. 450.00 incl. of all taxes.',
      },
    })
    createdScanIds.push(testScan.id)

    // Attach ScanImage records
    await prisma.scanImage.createMany({
      data: [
        {
          scanId: testScan.id,
          storageKey: 'scans/test-p4a-front.jpg',
          originalFilename: 'test-p4a-front.jpg',
          sizeBytes: 102400,
          mimeType: 'image/jpeg',
        },
        {
          scanId: testScan.id,
          storageKey: 'scans/test-p4a-back.jpg',
          originalFilename: 'test-p4a-back.jpg',
          sizeBytes: 204800,
          mimeType: 'image/jpeg',
        },
      ],
    })

    // Attach ExtractedDeclaration records (simulating standard declarations)
    await prisma.extractedDeclaration.createMany({
      data: [
        {
          scanId: testScan.id,
          fieldName: 'product_name',
          detectionStatus: 'DETECTED',
          rawValue: 'Himalayan Organic Premium Basmati Rice',
          normalizedValue: 'Himalayan Organic Premium Basmati Rice',
          confidence: 0.98,
        },
        {
          scanId: testScan.id,
          fieldName: 'net_quantity',
          detectionStatus: 'DETECTED',
          rawValue: '5 kg',
          normalizedValue: '5 kg',
          confidence: 0.99,
        },
        {
          scanId: testScan.id,
          fieldName: 'mrp',
          detectionStatus: 'DETECTED',
          rawValue: '₹ 450.00',
          normalizedValue: '₹ 450.00',
          confidence: 0.97,
        },
        {
          scanId: testScan.id,
          fieldName: 'manufacturer',
          detectionStatus: 'DETECTED',
          rawValue: 'Himalayan Foods Pvt Ltd',
          normalizedValue: 'Himalayan Foods Pvt Ltd',
          confidence: 0.95,
        },
        {
          scanId: testScan.id,
          fieldName: 'address',
          detectionStatus: 'DETECTED',
          rawValue: 'Plot 12, Industrial Area, Dehradun, Uttarakhand - 248001',
          normalizedValue: 'Plot 12, Industrial Area, Dehradun, Uttarakhand - 248001',
          confidence: 0.94,
        },
        {
          scanId: testScan.id,
          fieldName: 'customer_care',
          detectionStatus: 'DETECTED',
          rawValue: 'care@himalayanfoods.com, +91-11-23456789',
          normalizedValue: 'care@himalayanfoods.com, +91-11-23456789',
          confidence: 0.95,
        },
        {
          scanId: testScan.id,
          fieldName: 'country_of_origin',
          detectionStatus: 'DETECTED',
          rawValue: 'India',
          normalizedValue: 'India',
          confidence: 0.99,
        },
        {
          scanId: testScan.id,
          fieldName: 'date_of_packing',
          detectionStatus: 'DETECTED',
          rawValue: '01/2026',
          normalizedValue: '01/2026',
          confidence: 0.93,
        },
      ],
    })

    // Attach Phase 3C OnlineVerification record
    const onlineVer = await prisma.onlineVerification.create({
      data: {
        scanId: testScan.id,
        sourceUrl: 'https://ecommerce-store.test/p/himalayan-basmati-5kg',
        domain: 'ecommerce-store.test',
        status: 'SUCCESS',
        overallMatchStatus: 'MISMATCH',
        sourcePriority: 'ECOMMERCE',
      },
    })

    // Attach OnlineListingSnapshot
    await prisma.onlineListingSnapshot.create({
      data: {
        verificationId: onlineVer.id,
        contentHash: 'sha256-html-hash',
        httpStatus: 200,
        contentType: 'text/html',
        rawHtml: '<html><body>Himalayan Basmati 5kg Rs. 520</body></html>',
      },
    })

    // Attach OnlineDiscrepancy
    await prisma.onlineDiscrepancy.create({
      data: {
        verificationId: onlineVer.id,
        fieldName: 'mrp',
        discrepancyType: 'PRICE_MISMATCH',
        physicalValue: '₹ 450.00',
        onlineValue: '₹ 520.00',
        severity: 'CRITICAL',
        message: 'Online listed MRP exceeds physical package MRP (₹ 520.00 vs ₹ 450.00)',
      },
    })

    // Create Inspection linked to the Scan
    const linkedInsp = await service.createInspection(officer1.id, {
      title: 'Full Hierarchy Statutory Inspection',
      scanId: testScan.id,
      notes: 'Investigating online e-commerce MRP discrepancy against physical package',
    })
    createdInspectionIds.push(linkedInsp.id)

    // Retrieve via service
    const fullInsp = await service.getInspection(linkedInsp.id, {
      id: officer1.id,
      role: officer1.role,
    })

    assert(fullInsp !== null, 'Linked inspection retrieved successfully')
    assert(fullInsp?.scan !== null, 'Scan relation loaded on inspection')
    assert(fullInsp?.scan?.images.length === 2, 'Physical ScanImage records loaded (count: 2)')
    assert(
      (fullInsp?.scan?.extractedDeclarations.length || 0) >= 8,
      'ExtractedDeclaration records loaded (count >= 8)'
    )
    assert(
      (fullInsp?.scan?.onlineVerifications.length || 0) >= 1,
      'Phase 3C OnlineVerification records loaded'
    )
    assert(
      fullInsp?.scan?.onlineVerifications[0]?.discrepancies.length === 1,
      'OnlineDiscrepancy records loaded with physical-vs-online comparison'
    )
    assert(
      fullInsp?.productId === testProduct.id,
      'Inspection automatically inherited productId from linked scan'
    )

    // ─────────────────────────────────────────────────────────────
    // 7. Run Compliance Analysis & RuleVersion Tracking
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Deterministic Compliance Analysis Execution ---')

    const analysisResult = await service.runComplianceAnalysis(
      linkedInsp.id,
      { id: officer1.id, role: officer1.role }
    )

    assert(
      analysisResult.totalRulesEvaluated > 0,
      `Deterministic rule engine evaluated ${analysisResult.totalRulesEvaluated} legal rules`
    )
    assert(
      analysisResult.checksCreated > 0,
      `Created ${analysisResult.checksCreated} ComplianceCheck records in database`
    )

    // Verify ComplianceCheck records in DB
    const checksInDb = await prisma.complianceCheck.findMany({
      where: { inspectionId: linkedInsp.id },
      include: { rule: true },
    })

    assert(
      checksInDb.length === analysisResult.checksCreated,
      'ComplianceCheck records count in DB matches analysis result'
    )

    // Check RuleVersion tracking: each check must record ruleVersionNumber
    const allHaveVersions = checksInDb.every((c) => (c.ruleVersionNumber ?? 0) >= 1)
    assert(
      allHaveVersions,
      'Every ComplianceCheck accurately records statutory ruleVersionNumber'
    )

    // Verify auto-transition of inspection status from DRAFT to IN_PROGRESS
    const inspAfterAnalysis = await prisma.inspection.findUnique({
      where: { id: linkedInsp.id },
      select: { status: true },
    })
    assert(
      inspAfterAnalysis?.status === 'IN_PROGRESS',
      'Running compliance analysis automatically advanced inspection from DRAFT to IN_PROGRESS'
    )

    // ─────────────────────────────────────────────────────────────
    // 8. MANDATORY LEGAL SAFEGUARD: Warning Advisory vs Fail Violation Candidate
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 8. Mandatory Legal Safeguards: WARNING Advisory vs FAIL Violation ---')

    // Find all checks with WARNING status
    const warningChecks = checksInDb.filter((c) => c.status === 'WARNING')
    console.log(`  Advisory WARNING checks found: ${warningChecks.length}`)

    // Find all checks with FAIL status
    const failChecks = checksInDb.filter((c) => c.status === 'FAIL')
    console.log(`  Statutory FAIL checks found: ${failChecks.length}`)

    // Query Violations created for this inspection
    const violationsInDb = await prisma.violation.findMany({
      where: { inspectionId: linkedInsp.id },
    })

    // SAFEGUARD 1: NO Violation may be created from a WARNING check
    let warningCreatedViolation = false
    for (const wCheck of warningChecks) {
      const match = violationsInDb.some((v) => v.ruleId === wCheck.ruleId)
      if (match) {
        warningCreatedViolation = true
        break
      }
    }
    assert(
      !warningCreatedViolation,
      'SAFEGUARD CONFIRMED: Advisory WARNING results NEVER create formal Violation records'
    )

    // SAFEGUARD 2: FAIL checks MUST create formal automated Violation candidates
    assert(
      violationsInDb.length === failChecks.length,
      `Formal Violation candidates (${violationsInDb.length}) strictly match FAIL checks (${failChecks.length})`
    )

    // SAFEGUARD 3: Explicit live test for an advisory LOW-severity rule producing WARNING
    console.log('  Testing live advisory rule with defaultSeverity: LOW...')
    const testWarningRuleConditions = {
      operator: 'AND',
      conditions: [
        {
          field: 'declarations.customer_care.normalizedValue',
          operator: 'CONTAINS',
          value: 'toll-free-1800-advisory-not-present',
          failureMessage: 'Advisory toll-free number not detected in customer care',
        },
      ],
    }

    const testWarningRule = await prisma.legalRule.create({
      data: {
        ruleNumber: `LMPC-TEST-WARN-${Date.now()}`,
        title: 'Advisory Font Prominence Check',
        requirement: 'Prominence and placement of consumer care declaration advisory test',
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        effectiveDate: new Date('2011-04-01'),
        defaultSeverity: 'LOW',
        isActive: true,
        conditions: testWarningRuleConditions as any,
      },
    })

    const testWarningRuleVersion = await prisma.ruleVersion.create({
      data: {
        ruleId: testWarningRule.id,
        versionNumber: 1,
        changeDescription: 'Initial test version',
        changedById: officer1.id,
        effectiveDate: new Date('2011-04-01'),
        snapshot: {
          ...testWarningRule,
          conditions: testWarningRuleConditions,
        } as any,
      },
    })

    // Re-run compliance analysis with this advisory rule present
    const warningAnalysis = await service.runComplianceAnalysis(
      linkedInsp.id,
      { id: officer1.id, role: officer1.role }
    )

    assert(
      warningAnalysis.warningCount >= 1,
      `Rule engine evaluated advisory rule and produced ${warningAnalysis.warningCount} WARNING status result(s)`
    )

    // Verify in DB that the warning rule produced a ComplianceCheck with status WARNING
    const warningCheckInDb = await prisma.complianceCheck.findFirst({
      where: {
        inspectionId: linkedInsp.id,
        ruleId: testWarningRule.id,
      },
    })

    assert(
      warningCheckInDb !== null && warningCheckInDb.status === 'WARNING',
      'Advisory rule successfully recorded as ComplianceCheck with status WARNING'
    )

    // Verify in DB that NO Violation was created for this warning rule
    const warningViolationInDb = await prisma.violation.findFirst({
      where: {
        inspectionId: linkedInsp.id,
        ruleId: testWarningRule.id,
      },
    })

    assert(
      warningViolationInDb === null,
      'SAFEGUARD CONFIRMED: Database has 0 Violation records for the advisory WARNING rule'
    )

    // Clean up test advisory rule
    await prisma.ruleVersion.deleteMany({ where: { ruleId: testWarningRule.id } })
    await prisma.complianceCheck.deleteMany({ where: { ruleId: testWarningRule.id } })
    await prisma.legalRule.delete({ where: { id: testWarningRule.id } })

    // ─────────────────────────────────────────────────────────────
    // 9. Officer Final Decision & Mandatory Audit Trail
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 9. Officer Final Decision & Audit Trail ---')

    // Record decision: NON_COMPLIANT
    const decisionResult = await service.recordDecision(
      linkedInsp.id,
      { id: officer1.id, role: officer1.role },
      {
        decision: 'NON_COMPLIANT',
        remarks: 'Confirmed omission of Unit Sale Price and e-commerce price discrepancy. Issued Form 1 Notice.',
      }
    )

    assert(
      decisionResult.decision === 'NON_COMPLIANT',
      'Officer decision NON_COMPLIANT recorded successfully'
    )
    assert(
      decisionResult.remarks?.includes('Form 1 Notice') === true,
      'Officer statutory remarks persisted'
    )

    // Verify inspection transitioned to CLOSED
    const inspAfterDecision = await prisma.inspection.findUnique({
      where: { id: linkedInsp.id },
      select: { status: true },
    })
    assert(
      inspAfterDecision?.status === 'CLOSED',
      'Recording final decision automatically transitions inspection to CLOSED'
    )

    // Verify AuditLog entry
    const decisionAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: linkedInsp.id,
        action: 'AUTHORITY_DECISION',
      },
      orderBy: { createdAt: 'desc' },
    })

    assert(decisionAudit !== null, 'AUTHORITY_DECISION audit log generated')
    assert(
      (decisionAudit?.metadata as any)?.decision === 'NON_COMPLIANT',
      'Audit log contains statutory decision metadata'
    )

    // Test FURTHER_INVESTIGATION decision behavior
    // Reopen inspection via Senior Authority first
    await service.transitionStatus(
      linkedInsp.id,
      { id: seniorAuthority.id, role: seniorAuthority.role },
      'IN_PROGRESS'
    )

    await service.recordDecision(
      linkedInsp.id,
      { id: officer1.id, role: officer1.role },
      {
        decision: 'FURTHER_INVESTIGATION',
        remarks: 'Sample forwarded to Government Approved Testing Laboratory for net weight verification.',
      }
    )

    const inspAfterInvestigate = await prisma.inspection.findUnique({
      where: { id: linkedInsp.id },
      select: { status: true },
    })
    assert(
      inspAfterInvestigate?.status === 'IN_PROGRESS',
      'FURTHER_INVESTIGATION decision keeps inspection in IN_PROGRESS status'
    )

    // ─────────────────────────────────────────────────────────────
    // 10. Attaching Evidence & Inspector Observations
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 10. Attaching Officer Evidence Observations ---')

    const evidence = await service.attachEvidence(
      linkedInsp.id,
      { id: officer1.id, role: officer1.role },
      {
        type: 'OFFICER_NOTE',
        description: 'Physical measurement taken using calibrated digital balance (Model DS-215, Sr. No. 8832).',
        confidence: 1.0,
      }
    )

    assert(evidence !== null, 'Officer observation evidence attached successfully')
    assert(evidence.type === 'OFFICER_NOTE', 'Evidence type is OFFICER_NOTE')

    const evidenceAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: evidence.id,
        action: { in: ['EVIDENCE_CREATED', 'INSPECTION_UPDATED'] },
      },
    })
    assert(evidenceAudit !== null, 'Evidence attachment audited in AuditLog')

  } catch (error: any) {
    console.error('Unhandled test suite error:', error)
    totalFailed++
  } finally {
    // ─────────────────────────────────────────────────────────────
    // Cleanup test data
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Cleanup: Removing Test Fixtures ---')
    try {
      if (createdInspectionIds.length > 0) {
        await prisma.evidence.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.violation.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.complianceCheck.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.officerDecision.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.auditLog.deleteMany({ where: { entityId: { in: createdInspectionIds } } })
        await prisma.inspection.deleteMany({ where: { id: { in: createdInspectionIds } } })
      }
      if (createdScanIds.length > 0) {
        await prisma.onlineDiscrepancy.deleteMany({
          where: { verification: { scanId: { in: createdScanIds } } },
        })
        await prisma.onlineListingField.deleteMany({
          where: { verification: { scanId: { in: createdScanIds } } },
        })
        await prisma.onlineListingSnapshot.deleteMany({
          where: { verification: { scanId: { in: createdScanIds } } },
        })
        await prisma.onlineVerification.deleteMany({ where: { scanId: { in: createdScanIds } } })
        await prisma.extractedDeclaration.deleteMany({ where: { scanId: { in: createdScanIds } } })
        await prisma.scanImage.deleteMany({ where: { scanId: { in: createdScanIds } } })
        await prisma.productScan.deleteMany({ where: { id: { in: createdScanIds } } })
      }
      if (createdProductIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
      }
      console.log('  Cleanup complete.')
    } catch (cleanErr) {
      console.error('  Cleanup warning:', cleanErr)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log('\n======================================================')
  console.log(`  PHASE 4A TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPhase4aTests()
