import { prisma } from '../src/lib/prisma'
import { defaultCaseService } from '../src/lib/cases/case-service'
import { audit } from '../src/lib/audit'

async function reconcile() {
  console.log('==================================================')
  console.log('VeriQO: Phase 5A Safe Data Reconciliation Script')
  console.log('==================================================')

  const complaintId = 'cmtpknwfu001f148vi2grrnef'
  const inspectionId = 'cmtppysul00035czmsh0ey52p'

  // Step 1: Fetch Complaint and Inspection
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { scan: true, case: true, inspection: true },
  })

  if (!complaint) {
    throw new Error(`Complaint ${complaintId} not found`)
  }

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: { scan: true, case: true, officer: true },
  })

  if (!inspection) {
    throw new Error(`Inspection ${inspectionId} not found`)
  }

  console.log(`\n[1] Verifying Context Matches:`)
  console.log(`  - Complaint: "${complaint.title}" (Ref: #${complaint.complaintRef.slice(-8).toUpperCase()})`)
  console.log(`  - Inspection: "${inspection.title}" (Status: ${inspection.status})`)
  console.log(`  - Complaint scanId: ${complaint.scanId}`)
  console.log(`  - Inspection scanId: ${inspection.scanId}`)
  console.log(`  - Inspection officer: ${inspection.officer.name} (${inspection.officer.role})`)

  // Guard: Context verification
  if (complaint.scanId !== inspection.scanId) {
    throw new Error(`Context mismatch: complaint.scanId (${complaint.scanId}) !== inspection.scanId (${inspection.scanId})`)
  }

  if (inspection.caseId && inspection.caseId !== complaint.case?.id) {
    throw new Error(`Inspection already linked to a different case: ${inspection.caseId}`)
  }

  if (!['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(inspection.officer.role)) {
    throw new Error(`Officer is not an authorized authority role: ${inspection.officer.role}`)
  }

  console.log('  ✓ Context and authorization checks passed.')

  // Step 2: Idempotently get or create RegulatoryCase for the complaint
  console.log('\n[2] Idempotently getting or creating RegulatoryCase...')
  const caseRecord = await defaultCaseService.getOrCreateCaseForComplaint(complaintId)
  console.log(`  ✓ Case ready: ${caseRecord.caseNumber} (ID: ${caseRecord.id}, Status: ${caseRecord.status})`)

  // Step 3: Link the inspection to the case safely
  console.log('\n[3] Linking Inspection to RegulatoryCase...')
  const userContext = { id: inspection.officerId, role: inspection.officer.role as any }
  const linkedInspection = await defaultCaseService.linkExistingInspection(
    caseRecord.id,
    inspectionId,
    userContext
  )
  console.log(`  ✓ Inspection ${linkedInspection.id} linked to case ${linkedInspection.caseId}`)

  // Step 4: Ensure assignedOfficer is set on the case
  const updatedCase = await prisma.regulatoryCase.findUnique({
    where: { id: caseRecord.id },
    include: { complaint: true, inspections: true, assignedOfficer: true },
  })

  if (!updatedCase?.assignedOfficerId) {
    await prisma.regulatoryCase.update({
      where: { id: caseRecord.id },
      data: { assignedOfficerId: inspection.officerId },
    })
    await audit({
      userId: inspection.officerId,
      action: 'CASE_ASSIGNED',
      entityType: 'RegulatoryCase',
      entityId: caseRecord.id,
      metadata: {
        newOfficerId: inspection.officerId,
        newOfficerName: inspection.officer.name,
        newStatus: 'INVESTIGATION',
        previousOfficerId: null,
        reason: 'Reconciled and assigned to existing inspecting officer',
      },
    })
    console.log(`  ✓ Assigned case to officer: ${inspection.officer.name}`)
  }

  // Step 5: Verify final database state
  console.log('\n[4] Final Verification of Database State:')
  const finalCase = await prisma.regulatoryCase.findUnique({
    where: { id: caseRecord.id },
    include: {
      complaint: true,
      inspections: true,
      assignedOfficer: true,
    },
  })

  console.log({
    caseNumber: finalCase?.caseNumber,
    caseStatus: finalCase?.status,
    assignedOfficer: finalCase?.assignedOfficer?.name,
    linkedComplaintRef: finalCase?.complaint?.complaintRef,
    linkedComplaintStatus: finalCase?.complaint?.status,
    linkedComplaintInspectionId: finalCase?.complaint?.inspectionId,
    inspectionsCount: finalCase?.inspections.length,
    inspectionId: finalCase?.inspections[0]?.id,
    inspectionStatus: finalCase?.inspections[0]?.status,
    inspectionCaseId: finalCase?.inspections[0]?.caseId,
  })

  console.log('\n==================================================')
  console.log('Reconciliation Completed Successfully!')
  console.log('==================================================')
}

reconcile()
  .catch((err) => {
    console.error('Reconciliation failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
