/**
 * VeriQO Phase 5A: Regulatory Case Management & Complaint-to-Inspection Workflow Test Suite
 *
 * Validates:
 * 1. Complaint → RegulatoryCase Idempotent Creation (Adjustment #1)
 * 2. Standalone Case Creation & Duplicate Protection
 * 3. Officer Assignment, Reassignment & RBAC Authorization
 * 4. Case Lifecycle State Machine & Controlled REJECTED State (Adjustment #2)
 * 5. Inspection Creation from Case with ProductScan & Complaint Preservation
 * 6. Case Resolution Prerequisites & Formal Closure RBAC
 * 7. Security, Officer Isolation & Closed Case Mutation Protection
 * 8. Unified Case Timeline Aggregation
 * 9. Strict Preservation of Statutory Rule Engine (Adjustment #3)
 */

import { prisma } from '../src/lib/prisma'
import {
  CaseService,
  CaseAccessError,
  CaseStateTransitionError,
  CasePrerequisiteError,
} from '../src/lib/cases/case-service'
import { defaultInspectionService } from '../src/lib/inspections/inspection-service'
import {
  PERMISSIBLE_CASE_TRANSITIONS,
  canUserAccessCase,
  canUserAssignCase,
  canUserRejectCase,
  canUserResolveCase,
  canUserCloseCase,
  canUserReopenCase,
} from '../src/lib/cases/types'
import { audit } from '../src/lib/audit'
import type { Role, CaseStatus, CasePriority } from '@prisma/client'

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

async function runPhase5aTests() {
  console.log('\n======================================================')
  console.log('  VERIQO PHASE 5A: REGULATORY CASE MANAGEMENT TESTS')
  console.log('======================================================\n')

  const caseService = new CaseService(prisma)

  // Track entities for teardown
  const createdCaseIds: string[] = []
  const createdInspectionIds: string[] = []
  const createdComplaintIds: string[] = []
  const createdScanIds: string[] = []
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []

  try {
    // ─────────────────────────────────────────────────────────────
    // Setup: Test Users, Product, and ProductScan
    // ─────────────────────────────────────────────────────────────
    console.log('--- Setup: Creating Test Entities ---')

    const ts = Date.now()

    const consumer = await prisma.user.create({
      data: {
        email: `p5a-consumer-${ts}@example.com`,
        name: 'Phase 5A Consumer',
        hashedPassword: 'hash',
        role: 'CONSUMER',
      },
    })
    createdUserIds.push(consumer.id)

    const officer1 = await prisma.user.create({
      data: {
        email: `p5a-officer1-${ts}@example.com`,
        name: 'Inspector Verma',
        hashedPassword: 'hash',
        role: 'AUTHORITY_OFFICER',
      },
    })
    createdUserIds.push(officer1.id)

    const officer2 = await prisma.user.create({
      data: {
        email: `p5a-officer2-${ts}@example.com`,
        name: 'Inspector Sharma',
        hashedPassword: 'hash',
        role: 'AUTHORITY_OFFICER',
      },
    })
    createdUserIds.push(officer2.id)

    const senior = await prisma.user.create({
      data: {
        email: `p5a-senior-${ts}@example.com`,
        name: 'Director Nair',
        hashedPassword: 'hash',
        role: 'SENIOR_AUTHORITY',
      },
    })
    createdUserIds.push(senior.id)

    const admin = await prisma.user.create({
      data: {
        email: `p5a-admin-${ts}@example.com`,
        name: 'Administrator',
        hashedPassword: 'hash',
        role: 'ADMIN',
      },
    })
    createdUserIds.push(admin.id)

    const product = await prisma.product.create({
      data: {
        name: 'Phase 5A Premium Basmati Rice 5kg',
        brand: 'Heritage Agro',
        category: 'Food Grains',
        barcode: `890${ts.toString().slice(-9)}`,
      },
    })
    createdProductIds.push(product.id)

    const scan = await prisma.productScan.create({
      data: {
        userId: consumer.id,
        productId: product.id,
        status: 'COMPLETE',
        rawOcrText: 'Heritage Agro Basmati Rice 5kg MRP Rs 450 packed 01/2026',
        identifiedProductName: 'Heritage Agro Basmati Rice 5kg',
        identifiedBrand: 'Heritage Agro',
        identifiedCategory: 'Food Grains',
      },
    })
    createdScanIds.push(scan.id)

    await prisma.extractedDeclaration.createMany({
      data: [
        {
          scanId: scan.id,
          fieldName: 'net_quantity',
          rawValue: '5kg',
          normalizedValue: '5 kg',
          confidence: 0.98,
        },
        {
          scanId: scan.id,
          fieldName: 'mrp',
          rawValue: 'Rs 450',
          normalizedValue: '450.00',
          confidence: 0.95,
        },
      ],
    })

    console.log('Setup complete.\n')

    // ─────────────────────────────────────────────────────────────
    // Suite 1: Complaint → RegulatoryCase Idempotent Creation (Adjustment #1)
    // ─────────────────────────────────────────────────────────────
    console.log('--- Suite 1: Complaint → Case Idempotent Creation ---')

    const complaint1 = await prisma.complaint.create({
      data: {
        consumerId: consumer.id,
        title: 'Suspected Under-Weight Package and Missing Contact Details',
        description: 'The net weight was significantly less than 5kg and consumer care phone number was omitted.',
        productId: product.id,
        scanId: scan.id,
      },
    })
    createdComplaintIds.push(complaint1.id)

    await audit({
      userId: consumer.id,
      action: 'COMPLAINT_SUBMITTED',
      entityType: 'Complaint',
      entityId: complaint1.id,
      metadata: { complaintRef: complaint1.complaintRef, scanId: scan.id },
    })

    // Call idempotent case creation
    const case1 = await caseService.getOrCreateCaseForComplaint(complaint1.id)
    createdCaseIds.push(case1.id)

    assert(!!case1, 'Complaint creates a linked RegulatoryCase')
    assert(case1.caseNumber.startsWith('CASE-'), 'Case receives official CASE-YYYY-XXXXXX reference')
    assert(case1.status === 'SUBMITTED', 'Case initial status is SUBMITTED')
    assert(case1.priority === 'MEDIUM', 'Case default priority is MEDIUM')
    assert(case1.complaintId === complaint1.id, 'Case correctly links complaintId')
    assert(case1.productScanId === scan.id, 'Case preserves ProductScan association from complaint')
    assert(case1.createdById === consumer.id, 'Case tracks consumer origin')

    // Idempotency test (Adjustment #1)
    const case1SecondCall = await caseService.getOrCreateCaseForComplaint(complaint1.id)
    assert(case1SecondCall.id === case1.id, 'Idempotency: Repeated call returns identical case record')

    const totalCasesForComplaint = await prisma.regulatoryCase.count({
      where: { complaintId: complaint1.id },
    })
    assert(totalCasesForComplaint === 1, 'Idempotency: Exactly one RegulatoryCase exists per complaint')

    // Verify audit log for creation
    const creationAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'RegulatoryCase',
        entityId: case1.id,
        action: 'CASE_CREATED',
      },
    })
    assert(!!creationAudit, 'AuditLog records CASE_CREATED event')

    // ─────────────────────────────────────────────────────────────
    // Suite 2: Standalone Authority Case Creation & Duplicate Prevention
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 2: Standalone Authority Case Creation ---')

    const case2 = await caseService.createCase(officer1.id, {
      title: 'Market Surveillance: Supermarket Chain Packaging Audit',
      description: 'Ex-officio market surveillance of pre-packaged commodities in wholesale district.',
      productScanId: scan.id,
      priority: 'HIGH',
    })
    createdCaseIds.push(case2.id)

    assert(case2.status === 'SUBMITTED', 'Standalone case initial status is SUBMITTED')
    assert(case2.priority === 'HIGH', 'Standalone case accepts priority assignment')
    assert(case2.complaintId === null, 'Standalone case has null complaintId')
    assert(case2.productScanId === scan.id, 'Standalone case links ProductScan')

    // Attempting to create duplicate case for same complaint must be rejected
    let duplicateRejected = false
    try {
      await caseService.createCase(officer1.id, {
        title: 'Duplicate Case Attempt',
        complaintId: complaint1.id,
      })
    } catch (err) {
      if (err instanceof CasePrerequisiteError) duplicateRejected = true
    }
    assert(duplicateRejected, 'Duplicate case creation for already linked complaint is rejected')

    // ─────────────────────────────────────────────────────────────
    // Suite 3: Officer Assignment, Reassignment & RBAC Authorization
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 3: Officer Assignment & Reassignment RBAC ---')

    // Senior Authority assigns Officer 1
    const assignedCase1 = await caseService.assignOfficer(case1.id, senior, {
      officerId: officer1.id,
      reason: 'Assigned to jurisdictional packaging inspector',
    })

    assert(assignedCase1?.assignedOfficerId === officer1.id, 'Senior Authority successfully assigns officer')
    assert(assignedCase1?.status === 'ASSIGNED', 'Case status advances from SUBMITTED to ASSIGNED')

    // Verify linked complaint status sync
    const updatedComplaint1 = await prisma.complaint.findUnique({
      where: { id: complaint1.id },
    })
    assert(updatedComplaint1?.status === 'ASSIGNED', 'Linked complaint status synchronized to ASSIGNED')

    const assignmentAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'RegulatoryCase',
        entityId: case1.id,
        action: 'CASE_ASSIGNED',
      },
    })
    assert(!!assignmentAudit, 'AuditLog records CASE_ASSIGNED with metadata')

    // Admin reassigns Officer 1 -> Officer 2
    const reassignedCase1 = await caseService.assignOfficer(case1.id, admin, {
      officerId: officer2.id,
      reason: 'Workload balancing across inspectors',
    })

    assert(reassignedCase1?.assignedOfficerId === officer2.id, 'Admin successfully reassigns officer')
    const reassignmentAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'RegulatoryCase',
        entityId: case1.id,
        action: 'CASE_REASSIGNED',
      },
      orderBy: { createdAt: 'desc' },
    })
    assert(
      !!reassignmentAudit &&
        (reassignmentAudit.metadata as any)?.previousOfficerId === officer1.id &&
        (reassignmentAudit.metadata as any)?.newOfficerId === officer2.id,
      'AuditLog records CASE_REASSIGNED with previous and new officer'
    )

    // Unauthorized assignment: Officer 1 attempts to assign case
    let unauthorizedAssignRejected = false
    try {
      await caseService.assignOfficer(case2.id, officer1, {
        officerId: officer2.id,
      })
    } catch (err) {
      if (err instanceof CaseAccessError) unauthorizedAssignRejected = true
    }
    assert(unauthorizedAssignRejected, 'Ordinary Authority Officer cannot assign cases (Senior/Admin required)')

    // Assigning non-officer user rejected
    let nonOfficerAssignRejected = false
    try {
      await caseService.assignOfficer(case2.id, senior, {
        officerId: consumer.id,
      })
    } catch (err) {
      if (err instanceof CasePrerequisiteError) nonOfficerAssignRejected = true
    }
    assert(nonOfficerAssignRejected, 'Assigning non-authority user rejected')

    // ─────────────────────────────────────────────────────────────
    // Suite 4: Case Lifecycle & Controlled REJECTED State (Adjustment #2)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 4: Case Lifecycle & Controlled REJECTED State ---')

    const complaint3 = await prisma.complaint.create({
      data: {
        consumerId: consumer.id,
        title: 'Frivolous complaint on standard retail sweet packet',
        description: 'Consumer claiming package under 10g does not declare full consumer care details.',
      },
    })
    createdComplaintIds.push(complaint3.id)

    const case3 = await caseService.getOrCreateCaseForComplaint(complaint3.id)
    createdCaseIds.push(case3.id)

    // Invalid state transition test (skip states)
    let invalidSkipRejected = false
    try {
      await caseService.transitionStatus(case3.id, senior, 'CLOSED')
    } catch (err) {
      if (err instanceof CaseStateTransitionError) invalidSkipRejected = true
    }
    assert(invalidSkipRejected, 'Invalid state transition skipping lifecycle stages is rejected')

    // Rejection with short justification (<15 chars) rejected
    let shortReasonRejected = false
    try {
      await caseService.rejectCase(case3.id, officer1, {
        reason: 'Invalid',
      })
    } catch (err) {
      if (err instanceof CasePrerequisiteError) shortReasonRejected = true
    }
    assert(shortReasonRejected, 'Rejection with inadequate justification (<15 chars) is rejected')

    // Authorized rejection (Adjustment #2)
    const rejectedCase = await caseService.rejectCase(case3.id, senior, {
      reason: 'Commodity package is 8g and exempt under Rule 26(a) of Legal Metrology Rules.',
    })

    assert(rejectedCase?.status === 'REJECTED', 'Authorized rejection sets status to REJECTED')
    assert(!!rejectedCase?.closedAt, 'Rejection records closedAt timestamp')
    assert(
      Boolean(rejectedCase?.resolutionNotes?.includes('Rule 26(a)')),
      'Rejection records statutory justification in resolution notes'
    )

    const rejectedComplaint = await prisma.complaint.findUnique({
      where: { id: complaint3.id },
    })
    assert(rejectedComplaint?.status === 'CLOSED', 'Rejected case synchronizes linked complaint to CLOSED')

    const rejectionAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'RegulatoryCase',
        entityId: case3.id,
        action: 'CASE_STATUS_CHANGED',
      },
      orderBy: { createdAt: 'desc' },
    })
    assert(
      !!rejectionAudit && (rejectionAudit.metadata as any)?.to === 'REJECTED',
      'AuditLog records CASE_STATUS_CHANGED to REJECTED'
    )

    // Attempting to reject a resolved/closed case is rejected
    let invalidStateRejectRejected = false
    try {
      await caseService.rejectCase(case3.id, senior, {
        reason: 'Attempting to reject an already rejected case again.',
      })
    } catch (err) {
      if (err instanceof CaseStateTransitionError) invalidStateRejectRejected = true
    }
    assert(invalidStateRejectRejected, 'Rejection rejected when case is not in SUBMITTED or UNDER_REVIEW')

    // Reopen REJECTED case: Ordinary officer cannot reopen
    let officerReopenRejected = false
    try {
      await caseService.transitionStatus(case3.id, officer1, 'UNDER_REVIEW')
    } catch (err) {
      if (err instanceof CaseAccessError) officerReopenRejected = true
    }
    assert(officerReopenRejected, 'Ordinary officer cannot reopen a REJECTED case')

    // Senior Authority can reopen REJECTED case
    const reopenedCase = await caseService.transitionStatus(case3.id, senior, 'UNDER_REVIEW')
    assert(reopenedCase?.status === 'UNDER_REVIEW', 'Senior Authority can reopen a REJECTED case to UNDER_REVIEW')

    // ─────────────────────────────────────────────────────────────
    // Suite 5: Inspection Creation from Case
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 5: Inspection Creation from Case ---')

    // case1 is ASSIGNED to officer2
    const inspectionFromCase = await caseService.createInspectionFromCase(case1.id, officer2)
    assert(!!inspectionFromCase, 'Inspection successfully created from RegulatoryCase')
    if (!inspectionFromCase) throw new Error('Inspection creation failed')
    createdInspectionIds.push(inspectionFromCase.id)

    assert(inspectionFromCase.scanId === scan.id, 'Inspection inherits scanId from case')
    assert(inspectionFromCase.productId === product.id, 'Inspection inherits productId from case')
    assert(
      (inspectionFromCase as any).caseId === case1.id,
      'Inspection maintains foreign key caseId linkage'
    )

    // Verify case status auto-advanced to INVESTIGATION
    const caseAfterInspection = await prisma.regulatoryCase.findUnique({
      where: { id: case1.id },
    })
    assert(
      caseAfterInspection?.status === 'INVESTIGATION',
      'Case status automatically advances to INVESTIGATION upon inspection initiation'
    )

    // Verify complaint status auto-advanced to INVESTIGATING
    const complaintAfterInspection = await prisma.complaint.findUnique({
      where: { id: complaint1.id },
    })
    assert(
      complaintAfterInspection?.status === 'INVESTIGATING',
      'Linked complaint status automatically advances to INVESTIGATING'
    )

    // Verify inspection can run compliance evaluation and access scan declarations
    const fetchedInspection = await defaultInspectionService.getInspection(
      inspectionFromCase.id,
      { id: officer2.id, role: 'AUTHORITY_OFFICER' }
    )
    assert(
      fetchedInspection?.scan?.extractedDeclarations.length === 2,
      'Created inspection has full access to packaging OCR declarations'
    )

    // ─────────────────────────────────────────────────────────────
    // Suite 6: Case Resolution Prerequisites & Closure RBAC
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 6: Case Resolution Prerequisites & Closure RBAC ---')

    // Attempt to resolve without substantive notes
    let shortNotesRejected = false
    try {
      await caseService.resolveCase(case1.id, officer2, {
        resolutionNotes: 'Too short',
      })
    } catch (err) {
      if (err instanceof CasePrerequisiteError) shortNotesRejected = true
    }
    assert(shortNotesRejected, 'Resolving case with <15 chars notes is rejected')

    // Attempt to resolve while inspection is in progress without an official decision
    let unresolvedInspectionRejected = false
    try {
      await caseService.resolveCase(case1.id, officer2, {
        resolutionNotes: 'Attempting resolution while inspection is in draft/progress without decision.',
      })
    } catch (err) {
      if (err instanceof CasePrerequisiteError) unresolvedInspectionRejected = true
    }
    assert(
      unresolvedInspectionRejected,
      'Resolving case blocked while linked inspection has no formal terminal decision'
    )

    // Record officer decision on the inspection
    await defaultInspectionService.recordDecision(
      inspectionFromCase.id,
      officer2,
      {
        decision: 'COMPLIANT',
        remarks: 'Sample verified compliant under Legal Metrology Rules; no statutory violations detected.',
      }
    )

    // Now resolve the case
    const resolvedCase = await caseService.resolveCase(case1.id, officer2, {
      resolutionNotes: 'Inspection concluded compliant. Notice cleared and product verified.',
    })

    assert(resolvedCase?.status === 'RESOLVED', 'Case status successfully transitions to RESOLVED')
    const resolvedComplaint = await prisma.complaint.findUnique({
      where: { id: complaint1.id },
    })
    assert(resolvedComplaint?.status === 'RESOLVED', 'Linked complaint status transitions to RESOLVED')

    const resolutionAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'RegulatoryCase',
        entityId: case1.id,
        action: 'CASE_RESOLVED',
      },
    })
    assert(!!resolutionAudit, 'AuditLog records CASE_RESOLVED event')

    // Closure: Ordinary officer cannot close case
    let officerCloseRejected = false
    try {
      await caseService.closeCase(case1.id, officer2, {
        remarks: 'Attempting to close as inspecting officer',
      })
    } catch (err) {
      if (err instanceof CaseAccessError) officerCloseRejected = true
    }
    assert(officerCloseRejected, 'Ordinary officer cannot formally close case (Senior/Admin required)')

    // Senior Authority formally closes case
    const closedCase = await caseService.closeCase(case1.id, senior, {
      remarks: 'Docket reviewed and approved for archival closure.',
    })

    assert(closedCase?.status === 'CLOSED', 'Senior Authority successfully closes case')
    assert(!!closedCase?.closedAt, 'Closure records closedAt timestamp')

    const closedComplaint = await prisma.complaint.findUnique({
      where: { id: complaint1.id },
    })
    assert(closedComplaint?.status === 'CLOSED', 'Linked complaint status transitions to CLOSED')

    const closeAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: 'RegulatoryCase',
        entityId: case1.id,
        action: 'CASE_CLOSED',
      },
    })
    assert(!!closeAudit, 'AuditLog records CASE_CLOSED event')

    // Mutation lock on CLOSED case
    let closedMutationBlocked = false
    try {
      await caseService.updateCase(case1.id, senior, {
        title: 'Attempting to edit closed case title',
      })
    } catch (err) {
      if (err instanceof CaseAccessError) closedMutationBlocked = true
    }
    assert(closedMutationBlocked, 'Mutation on CLOSED case is strictly blocked')

    // ─────────────────────────────────────────────────────────────
    // Suite 7: Security, Officer Isolation & Cross-Scoping Protection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 7: Security, Officer Isolation & Scoping ---')

    // Create a private case assigned to officer1
    const privateCase = await caseService.createCase(senior.id, {
      title: 'Confidential Jurisdiction Audit',
      assignedOfficerId: officer1.id,
    })
    createdCaseIds.push(privateCase.id)

    // Officer 2 attempts to view privateCase
    let officerIsolationEnforced = false
    try {
      await caseService.getCase(privateCase.id, officer2)
    } catch (err) {
      if (err instanceof CaseAccessError) officerIsolationEnforced = true
    }
    assert(officerIsolationEnforced, 'Officer 2 cannot access Officer 1 private assigned case')

    // Senior Authority can access Officer 1 case
    const seniorAccess = await caseService.getCase(privateCase.id, senior)
    assert(!!seniorAccess, 'Senior Authority maintains global read access across officer cases')

    // Consumer cannot access authority case inbox
    let consumerInboxBlocked = false
    try {
      await caseService.listCases(consumer)
    } catch (err) {
      if (err instanceof CaseAccessError) consumerInboxBlocked = true
    }
    assert(consumerInboxBlocked, 'Consumer access to authority cases list is blocked')

    // Consumer cannot access case detail
    let consumerDetailBlocked = false
    try {
      await caseService.getCase(privateCase.id, consumer)
    } catch (err) {
      if (err instanceof CaseAccessError) consumerDetailBlocked = true
    }
    assert(consumerDetailBlocked, 'Consumer access to authority case detail is blocked')

    // ─────────────────────────────────────────────────────────────
    // Suite 8: Unified Case Timeline Aggregation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 8: Unified Case Timeline Aggregation ---')

    const timeline = await caseService.getCaseTimeline(case1.id, senior)
    assert(timeline.length >= 5, 'Case timeline contains all lifecycle and inspection milestones')

    const actionsInTimeline = timeline.map((t) => t.action)
    assert(actionsInTimeline.includes('COMPLAINT_SUBMITTED'), 'Timeline includes COMPLAINT_SUBMITTED')
    assert(actionsInTimeline.includes('CASE_CREATED'), 'Timeline includes CASE_CREATED')
    assert(actionsInTimeline.includes('CASE_ASSIGNED'), 'Timeline includes CASE_ASSIGNED')
    assert(actionsInTimeline.includes('INSPECTION_CREATED'), 'Timeline includes INSPECTION_CREATED')
    assert(actionsInTimeline.includes('CASE_RESOLVED'), 'Timeline includes CASE_RESOLVED')
    assert(actionsInTimeline.includes('CASE_CLOSED'), 'Timeline includes CASE_CLOSED')

    // Verify chronological ordering
    let isChronological = true
    for (let i = 1; i < timeline.length; i++) {
      if (new Date(timeline[i].timestamp).getTime() < new Date(timeline[i - 1].timestamp).getTime()) {
        isChronological = false
        break
      }
    }
    assert(isChronological, 'Case timeline events are strictly ordered chronologically')

    // ─────────────────────────────────────────────────────────────
    // Suite 9: Statutory Engine Safeguard (Adjustment #3)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 9: Statutory Engine Safeguard (Adjustment #3) ---')

    const legalRulesCount = await prisma.legalRule.count()
    const ruleVersionsCount = await prisma.ruleVersion.count()
    assert(legalRulesCount > 0, 'LegalRule table untouched by case management')
    assert(ruleVersionsCount > 0, 'RuleVersion historical snapshots untouched by case management')
    assert(
      typeof (caseService as any).evaluateCompliance === 'undefined',
      'CaseService contains ZERO compliance evaluation methods (deterministic engine preserved)'
    )

    // ─────────────────────────────────────────────────────────────
    // Suite 10: Complaint-to-Case Intake & Safe Inspection Reconciliation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 10: Complaint-to-Case Intake & Safe Inspection Reconciliation ---')

    // 1. Existing complaint created without a case
    const unlinkedComplaint = await prisma.complaint.create({
      data: {
        consumerId: consumer.id,
        title: 'Pre-Phase-5A Unlinked Complaint',
        description: 'Testing on-demand case initiation and idempotency for older complaints.',
        scanId: scan.id,
        status: 'SUBMITTED',
      },
    })
    createdComplaintIds.push(unlinkedComplaint.id)

    // Verify it initially has no case
    const checkBefore = await prisma.regulatoryCase.findUnique({
      where: { complaintId: unlinkedComplaint.id },
    })
    assert(!checkBefore, 'Pre-existing complaint initially has no RegulatoryCase')

    // 2. Explicit on-demand case creation (simulating Initiate Case button)
    const onDemandCase = await caseService.getOrCreateCaseForComplaint(unlinkedComplaint.id)
    createdCaseIds.push(onDemandCase.id)
    assert(!!onDemandCase, 'Explicit action creates exactly one RegulatoryCase for unlinked complaint')
    assert(onDemandCase.complaintId === unlinkedComplaint.id, 'Created case is properly linked to complaint')

    // 3. Repeating the action is strictly idempotent and does not create duplicates
    const onDemandRepeat = await caseService.getOrCreateCaseForComplaint(unlinkedComplaint.id)
    assert(onDemandRepeat.id === onDemandCase.id, 'Repeating action returns identical case (idempotent)')
    const allCasesForComplaint = await prisma.regulatoryCase.findMany({
      where: { complaintId: unlinkedComplaint.id },
    })
    assert(allCasesForComplaint.length === 1, 'Exactly one RegulatoryCase exists for this complaint')

    // 4. Case -> Create Inspection produces inspection with caseId
    const inspectionFromOnDemand = await caseService.createInspectionFromCase(
      onDemandCase.id,
      officer1
    )
    assert(!!inspectionFromOnDemand, 'Inspection created from on-demand case')
    if (!inspectionFromOnDemand) throw new Error('Inspection creation failed')
    createdInspectionIds.push(inspectionFromOnDemand.id)
    assert((inspectionFromOnDemand as any).caseId === onDemandCase.id, 'Case -> Create Inspection produces inspection with caseId')

    // 5. Legacy direct inspection creation (without caseId)
    const legacyDirectInspection = await defaultInspectionService.createInspection(
      officer1.id,
      {
        scanId: scan.id,
        title: 'Legacy Standalone Inspection without Initial Case',
        notes: 'Testing reconciliation path',
      }
    )
    createdInspectionIds.push(legacyDirectInspection.id)
    assert(legacyDirectInspection.caseId === null || typeof (legacyDirectInspection as any).caseId === 'undefined', 'Legacy direct inspection has null caseId')

    // 6. Safe inspection reconciliation: linking unlinked inspection to a case
    const standaloneCaseForReconcile = await caseService.createCase(senior.id, {
      title: 'Surveillance Case for Reconciliation',
      priority: 'MEDIUM',
      productScanId: scan.id,
    })
    createdCaseIds.push(standaloneCaseForReconcile.id)

    const reconciledInspection = await caseService.linkExistingInspection(
      standaloneCaseForReconcile.id,
      legacyDirectInspection.id,
      officer1
    )
    assert(reconciledInspection.caseId === standaloneCaseForReconcile.id, 'Existing inspection safely linked to case')

    // 7. Cross-complaint / cross-scan context mismatch rejection
    // Create a different scan for another product
    const otherScan = await prisma.productScan.create({
      data: {
        userId: consumer.id,
        status: 'COMPLETE',
      },
    })
    createdScanIds.push(otherScan.id)

    const otherInspection = await defaultInspectionService.createInspection(
      officer1.id,
      {
        scanId: otherScan.id,
        title: 'Mismatched Scan Inspection',
      }
    )
    createdInspectionIds.push(otherInspection.id)

    let crossScanRejected = false
    try {
      await caseService.linkExistingInspection(
        standaloneCaseForReconcile.id,
        otherInspection.id,
        officer1
      )
    } catch (err) {
      if (err instanceof CasePrerequisiteError) crossScanRejected = true
    }
    assert(crossScanRejected, 'Cross-inspection linking with mismatched scan context is strictly rejected')

    // 8. Reject linking an inspection that is already linked to another case
    let alreadyLinkedRejected = false
    try {
      await caseService.linkExistingInspection(
        onDemandCase.id,
        reconciledInspection.id,
        officer1
      )
    } catch (err) {
      if (err instanceof CasePrerequisiteError) alreadyLinkedRejected = true
    }
    assert(alreadyLinkedRejected, 'Linking inspection already attached to another case is strictly rejected')
  } catch (err) {
    console.error('Test execution exception:', err)
    totalFailed++
  } finally {
    console.log('\n--- Cleanup: Deleting Test Entities ---')
    try {
      if (createdCaseIds.length > 0) {
        await prisma.inspection.updateMany({
          where: { caseId: { in: createdCaseIds } },
          data: { caseId: null },
        })
        await prisma.regulatoryCase.deleteMany({ where: { id: { in: createdCaseIds } } })
      }
      if (createdInspectionIds.length > 0) {
        await prisma.report.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.officerDecision.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.evidence.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.violation.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.complianceCheck.deleteMany({ where: { inspectionId: { in: createdInspectionIds } } })
        await prisma.inspection.deleteMany({ where: { id: { in: createdInspectionIds } } })
      }
      if (createdComplaintIds.length > 0) {
        await prisma.complaintUpdate.deleteMany({ where: { complaintId: { in: createdComplaintIds } } })
        await prisma.complaint.deleteMany({ where: { id: { in: createdComplaintIds } } })
      }
      if (createdScanIds.length > 0) {
        await prisma.extractedDeclaration.deleteMany({ where: { scanId: { in: createdScanIds } } })
        await prisma.scanImage.deleteMany({ where: { scanId: { in: createdScanIds } } })
        await prisma.productScan.deleteMany({ where: { id: { in: createdScanIds } } })
      }
      if (createdProductIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
      }
      if (createdUserIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } })
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
      }
      console.log('Cleanup completed successfully.')
    } catch (cleanErr) {
      console.error('Cleanup warning:', cleanErr)
    }
  }

  console.log('\n======================================================')
  console.log(`  PHASE 5A TEST RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPhase5aTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test error:', err)
    process.exit(1)
  })
