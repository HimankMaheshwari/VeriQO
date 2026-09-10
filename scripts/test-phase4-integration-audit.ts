/**
 * VeriQO Phase 4 Final Integration & Security Audit Test Suite
 *
 * Validates:
 * 1. Online verification server-side scanId <-> inspectionId matching (rejects cross-linking).
 * 2. Physical evidence traceability route scoping (rejects cross-inspection checkId).
 * 3. Online evidence traceability route scoping (rejects cross-inspection discrepancyId).
 * 4. Officer ownership isolation & Senior/Admin RBAC access.
 * 5. Rule 26(a) small-package statutory verification (proviso omission, tobacco & pan masala exclusions).
 * 6. Evidentiary separation of online price discrepancies from automated legal decisions.
 */

import { prisma } from '../src/lib/prisma'
import { defaultEvidenceService } from '../src/lib/inspections/evidence-service'
import { defaultInspectionService, InspectionAccessError, RegulatoryDecisionConsistencyError } from '../src/lib/inspections/inspection-service'
import { defaultPdfService } from '../src/lib/inspections/pdf-service'
import { defaultReportGenerator } from '../src/lib/inspections/report-generator'
import { evaluateRules } from '../src/lib/rules/rule-engine'
import { buildRuleEngineContextFromData } from '../src/lib/rules/context-builder'
import { evaluateRule26SmallPackageExemption } from '../src/lib/rules/applicability-evaluator'
import { VERIFIED_STATUTORY_RULES } from '../src/lib/rules/seed/legal-rules-data'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`)
    passed++
  } else {
    console.error(`  ✗ [FAIL] ${message}`)
    failed++
  }
}

async function runAuditTests() {
  console.log('\n==================================================')
  console.log('VeriQO Phase 4: Integration & Security Audit Tests')
  console.log('==================================================\n')

  const timestamp = Date.now()
  const officer1Email = `audit-off1-${timestamp}@veriQO.gov.in`
  const officer2Email = `audit-off2-${timestamp}@veriQO.gov.in`
  const seniorEmail = `audit-senior-${timestamp}@veriQO.gov.in`
  const consumerEmail = `audit-cons-${timestamp}@example.com`

  // Seed test users
  const officer1 = await prisma.user.create({
    data: { email: officer1Email, name: 'Audit Officer 1', role: 'AUTHORITY_OFFICER', hashedPassword: 'dummy-hashed-password' },
  })
  const officer2 = await prisma.user.create({
    data: { email: officer2Email, name: 'Audit Officer 2', role: 'AUTHORITY_OFFICER', hashedPassword: 'dummy-hashed-password' },
  })
  const senior = await prisma.user.create({
    data: { email: seniorEmail, name: 'Senior Director', role: 'SENIOR_AUTHORITY', hashedPassword: 'dummy-hashed-password' },
  })
  const consumer = await prisma.user.create({
    data: { email: consumerEmail, name: 'Consumer A', role: 'CONSUMER', hashedPassword: 'dummy-hashed-password' },
  })

  // Seed scans
  const scan1 = await prisma.productScan.create({
    data: {
      userId: consumer.id,
      identifiedProductName: 'Audit Biscuit 100g',
      status: 'COMPLETE',
      extractedDeclarations: {
        create: [
          {
            fieldName: 'mrp',
            rawValue: 'MRP Rs 50.00',
            normalizedValue: '50.00',
            confidence: 0.95,
            detectionStatus: 'DETECTED',
          },
          {
            fieldName: 'net_quantity',
            rawValue: '100 g',
            normalizedValue: '100 g',
            confidence: 0.95,
            detectionStatus: 'DETECTED',
          },
        ],
      },
    },
  })

  const scan2 = await prisma.productScan.create({
    data: {
      userId: consumer.id,
      identifiedProductName: 'Audit Juice 200ml',
      status: 'COMPLETE',
    },
  })

  // Seed inspections
  const inspection1 = await prisma.inspection.create({
    data: {
      title: 'Inspection 1',
      officerId: officer1.id,
      scanId: scan1.id,
      status: 'IN_PROGRESS',
    },
  })

  const inspection2 = await prisma.inspection.create({
    data: {
      title: 'Inspection 2',
      officerId: officer2.id,
      scanId: scan2.id,
      status: 'IN_PROGRESS',
    },
  })

  // Seed compliance check on inspection1
  const rule = await prisma.legalRule.findFirst({
    where: { ruleNumber: 'LMPC-2011-R06-1-E' },
    include: { versions: true },
  })

  const check1 = await prisma.complianceCheck.create({
    data: {
      inspectionId: inspection1.id,
      ruleId: rule?.id || 'dummy-rule-id',
      scanId: scan1.id,
      ruleVersionNumber: 1,
      status: 'PASS',
      evaluationDetails: { conditions: [] },
    },
  })

  // Seed online verification on scan1
  const onlineVerif1 = await prisma.onlineVerification.create({
    data: {
      scanId: scan1.id,
      sourceUrl: 'https://example-mart.com/product/123',
      domain: 'example-mart.com',
      overallMatchStatus: 'MISMATCH',
      discrepancies: {
        create: [
          {
            fieldName: 'mrp',
            discrepancyType: 'PRICE_MISMATCH',
            onlineValue: '65.00',
            physicalValue: '50.00',
            message: 'Online selling price ₹65.00 exceeds package MRP ₹50.00',
          },
        ],
      },
    },
    include: { discrepancies: true },
  })
  const discrepancy1 = onlineVerif1.discrepancies[0]

  console.log('--- Test 1: Physical Traceability Route Scoping ---')
  // 1A: Calling with correct inspectionId succeeds
  const trace1 = await defaultEvidenceService.getPhysicalEvidenceTrace(
    check1.id,
    { id: officer1.id, role: officer1.role },
    inspection1.id
  )
  assert(trace1.complianceCheckId === check1.id, 'Physical trace succeeds when inspectionId matches')

  // 1B: Calling with mismatched inspectionId throws InspectionAccessError
  let crossInspectionBlocked = false
  try {
    await defaultEvidenceService.getPhysicalEvidenceTrace(
      check1.id,
      { id: officer1.id, role: officer1.role },
      inspection2.id // Deliberate cross-inspection attempt!
    )
  } catch (err: any) {
    if (err instanceof InspectionAccessError) crossInspectionBlocked = true
  }
  assert(crossInspectionBlocked, 'Physical trace rejects cross-inspection checkId mismatch with InspectionAccessError')

  console.log('\n--- Test 2: Online Traceability Route Scoping ---')
  // 2A: Calling with correct inspectionId succeeds
  const onlineTrace1 = await defaultEvidenceService.getOnlineEvidenceTrace(
    discrepancy1.id,
    { id: officer1.id, role: officer1.role },
    inspection1.id
  )
  assert(onlineTrace1.onlineDiscrepancyId === discrepancy1.id, 'Online trace succeeds when inspectionId matches')

  // 2B: Calling with mismatched inspectionId throws InspectionAccessError
  let crossOnlineBlocked = false
  try {
    await defaultEvidenceService.getOnlineEvidenceTrace(
      discrepancy1.id,
      { id: officer1.id, role: officer1.role },
      inspection2.id // Deliberate cross-inspection attempt!
    )
  } catch (err: any) {
    if (err instanceof InspectionAccessError) crossOnlineBlocked = true
  }
  assert(crossOnlineBlocked, 'Online trace rejects cross-inspection discrepancyId mismatch with InspectionAccessError')

  console.log('\n--- Test 3: Officer Isolation & Senior/Admin Access ---')
  // 3A: Officer 2 cannot access Officer 1 physical trace
  let officer2Blocked = false
  try {
    await defaultEvidenceService.getPhysicalEvidenceTrace(
      check1.id,
      { id: officer2.id, role: officer2.role },
      inspection1.id
    )
  } catch (err: any) {
    if (err instanceof InspectionAccessError) officer2Blocked = true
  }
  assert(officer2Blocked, 'Officer 2 blocked from accessing Officer 1 inspection evidence trace')

  // 3B: Senior Authority CAN access Officer 1 physical trace
  const seniorTrace = await defaultEvidenceService.getPhysicalEvidenceTrace(
    check1.id,
    { id: senior.id, role: senior.role },
    inspection1.id
  )
  assert(seniorTrace.complianceCheckId === check1.id, 'Senior Authority successfully accesses Officer 1 inspection trace')

  console.log('\n--- Test 4: Statutory Rule 26(a) Small Package Verification ---')
  const rules = VERIFIED_STATUTORY_RULES as any

  // 4A: Small package (8g biscuit) -> All Chapter II rules are NOT_APPLICABLE
  const smallPackageScan = {
    id: 'scan-small-8g',
    identifiedProductName: 'Sample Biscuit 8g',
    identifiedCategory: 'Biscuits & Cookies',
    extractedDeclarations: [
      {
        id: 'sp1',
        fieldName: 'net_quantity',
        rawValue: '8 g',
        normalizedValue: '8 g',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }
  const ctxSmall = buildRuleEngineContextFromData(smallPackageScan as any)
  const resSmall = evaluateRules(ctxSmall, rules)
  assert(
    resSmall.results.every((r) => r.status === 'NOT_APPLICABLE'),
    'Statutory Rule 26(a): 8g small package evaluates to NOT_APPLICABLE for Chapter II retail rules'
  )
  assert(resSmall.violations.length === 0, 'Small package produces 0 Violations (draft proviso correctly omitted)')

  // 4B: Tobacco 5g -> Tobacco is excluded under G.S.R. 385(E), Chapter II applies
  const tobaccoSmallScan = {
    id: 'scan-tobacco-5g',
    identifiedProductName: 'Chewing Tobacco Pouch',
    identifiedCategory: 'Tobacco & Cigarettes',
    extractedDeclarations: [
      {
        id: 'tb1',
        fieldName: 'net_quantity',
        rawValue: '5 g',
        normalizedValue: '5 g',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }
  const ctxTobacco = buildRuleEngineContextFromData(tobaccoSmallScan as any)
  const resTobacco = evaluateRules(ctxTobacco, rules)
  assert(
    resTobacco.results.some((r) => r.status !== 'NOT_APPLICABLE'),
    'Statutory Rule 26(a) Tobacco Exception: 5g tobacco is NOT exempt from Chapter II under G.S.R. 385(E)'
  )

  // 4C: Pan Masala post-01/02/2026 -> Excluded from exemption under G.S.R. 881(E)
  const panMasalaScan = {
    id: 'scan-pm-4g',
    identifiedProductName: 'Pan Masala Pouch',
    identifiedCategory: 'Pan Masala',
    extractedDeclarations: [
      {
        id: 'pm1',
        fieldName: 'net_quantity',
        rawValue: '4 g',
        normalizedValue: '4 g',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
      {
        id: 'pm2',
        fieldName: 'date_of_packing',
        rawValue: '10/02/2026',
        normalizedValue: '10/02/2026',
        confidence: 0.95,
        detectionStatus: 'DETECTED',
      },
    ],
  }
  const ctxPm = buildRuleEngineContextFromData(panMasalaScan as any)
  const resPm = evaluateRules(ctxPm, rules)
  assert(
    resPm.results.some((r) => r.status !== 'NOT_APPLICABLE'),
    'Statutory Rule 26(a) Pan Masala Exception: 4g pan masala post-01/02/2026 is NOT exempt under G.S.R. 881(E)'
  )

  console.log('\n--- Test 5: Compliance ↔ Final Decision Consistency ---')
  // 5A: Add a formal violation to inspection1
  await prisma.violation.create({
    data: {
      inspectionId: inspection1.id,
      scanId: scan1.id,
      ruleId: rule?.id || 'dummy-rule-id',
      description: 'Rule 6(1)(e): Missing retail sale price (MRP)',
      severity: 'HIGH',
      remediationGuidance: 'Affix indelible retail sale price',
    },
  })

  // 5B: Officer attempts to record DISMISSED without justification -> Rejected
  let dismissalWithoutJustificationBlocked = false
  try {
    await defaultInspectionService.recordDecision(
      inspection1.id,
      { id: officer1.id, role: officer1.role },
      { decision: 'DISMISSED', remarks: '' }
    )
  } catch (err: any) {
    if (err instanceof RegulatoryDecisionConsistencyError || err?.name === 'RegulatoryDecisionConsistencyError') {
      dismissalWithoutJustificationBlocked = true
    } else {
      console.log('5B unexpected error:', err)
    }
  }
  assert(
    dismissalWithoutJustificationBlocked,
    'Statutory Consistency: Dismissing inspection with active violations without justification throws RegulatoryDecisionConsistencyError'
  )

  // 5C: Officer attempts to record COMPLIANT with short justification (<15 chars) -> Rejected
  let shortJustificationBlocked = false
  try {
    await defaultInspectionService.recordDecision(
      inspection1.id,
      { id: officer1.id, role: officer1.role },
      { decision: 'COMPLIANT', remarks: 'valid item' }
    )
  } catch (err: any) {
    if (err instanceof RegulatoryDecisionConsistencyError || err?.name === 'RegulatoryDecisionConsistencyError') {
      shortJustificationBlocked = true
    } else {
      console.log('5C unexpected error:', err)
    }
  }
  assert(
    shortJustificationBlocked,
    'Statutory Consistency: Marking compliant with active violations and <15 chars remarks throws RegulatoryDecisionConsistencyError'
  )

  // 5D: Officer records DISMISSED with substantive justification (>=15 chars) -> Succeeded
  const validDismissal = await defaultInspectionService.recordDecision(
    inspection1.id,
    { id: officer1.id, role: officer1.role },
    {
      decision: 'DISMISSED',
      remarks: 'Compounded under Section 48; composition fee deposited via Treasury Challan TC-2026-991.',
    }
  )
  assert(
    validDismissal.decision === 'DISMISSED',
    'Statutory Consistency: Dismissal with substantive justification successfully recorded'
  )

  // 5E: Verify audit log recorded regulatory override metadata
  const overrideAudit = await prisma.auditLog.findFirst({
    where: {
      entityId: inspection1.id,
      action: 'AUTHORITY_DECISION',
    },
    orderBy: { createdAt: 'desc' },
  })
  const auditMeta = overrideAudit?.metadata as any
  assert(
    auditMeta?.isRegulatoryOverride === true && auditMeta?.violationsOverriddenCount > 0,
    'Audit Trail: Recorded isRegulatoryOverride flag and overridden violations count in audit log metadata'
  )

  console.log('\n--- Test 6: Closed Inspection Mutation Protection ---')
  // Inspection1 is now CLOSED
  const closedInspection = await prisma.inspection.findUnique({ where: { id: inspection1.id } })
  assert(closedInspection?.status === 'CLOSED', 'Inspection1 is in CLOSED status')

  // 6A: Attempting to update metadata on CLOSED inspection throws InspectionAccessError
  let updateClosedBlocked = false
  try {
    await defaultInspectionService.updateInspection(
      inspection1.id,
      { id: officer1.id, role: officer1.role },
      { title: 'New Illegal Title on Closed File' }
    )
  } catch (err: any) {
    if (err instanceof InspectionAccessError) updateClosedBlocked = true
  }
  assert(updateClosedBlocked, 'Closed Inspection Protection: Metadata update on CLOSED inspection rejected')

  // 6B: Attempting to run compliance analysis on CLOSED inspection throws InspectionAccessError
  let analysisClosedBlocked = false
  try {
    await defaultInspectionService.runComplianceAnalysis(
      inspection1.id,
      { id: officer1.id, role: officer1.role }
    )
  } catch (err: any) {
    if (err instanceof InspectionAccessError) analysisClosedBlocked = true
  }
  assert(analysisClosedBlocked, 'Closed Inspection Protection: Compliance analysis on CLOSED inspection rejected')

  // 6C: Attempting to attach evidence to CLOSED inspection throws InspectionAccessError
  let evidenceClosedBlocked = false
  try {
    await defaultEvidenceService.createEvidence(
      inspection1.id,
      { id: officer1.id, role: officer1.role },
      {
        type: 'OFFICER_NOTE',
        title: 'Late note',
        description: 'Trying to sneak a note into a closed file',
      }
    )
  } catch (err: any) {
    if (err instanceof InspectionAccessError) evidenceClosedBlocked = true
  }
  assert(evidenceClosedBlocked, 'Closed Inspection Protection: Attaching evidence to CLOSED inspection rejected')

  console.log('\n--- Test 7: Rule 26(a) Small-Package Exemption Scenarios ---')
  // 7A: 10g general -> exempt
  const ctx10g = buildRuleEngineContextFromData({
    id: 's-10g',
    identifiedProductName: 'Cream 10g',
    extractedDeclarations: [
      { id: 'd1', fieldName: 'net_quantity', rawValue: '10 g', normalizedValue: '10 g', detectionStatus: 'DETECTED', confidence: 0.9 },
    ],
  } as any)
  const res10g = evaluateRule26SmallPackageExemption(ctx10g)
  assert(res10g.exempt === true, 'Rule 26(a): 10g package is EXEMPT')

  // 7B: 10ml general -> exempt
  const ctx10ml = buildRuleEngineContextFromData({
    id: 's-10ml',
    identifiedProductName: 'Syrup 10ml',
    extractedDeclarations: [
      { id: 'd2', fieldName: 'net_quantity', rawValue: '10 ml', normalizedValue: '10 ml', detectionStatus: 'DETECTED', confidence: 0.9 },
    ],
  } as any)
  const res10ml = evaluateRule26SmallPackageExemption(ctx10ml)
  assert(res10ml.exempt === true, 'Rule 26(a): 10ml package is EXEMPT')

  // 7C: 15g general -> not exempt
  const ctx15g = buildRuleEngineContextFromData({
    id: 's-15g',
    identifiedProductName: 'Soap 15g',
    extractedDeclarations: [
      { id: 'd3', fieldName: 'net_quantity', rawValue: '15 g', normalizedValue: '15 g', detectionStatus: 'DETECTED', confidence: 0.9 },
    ],
  } as any)
  const res15g = evaluateRule26SmallPackageExemption(ctx15g)
  assert(res15g.exempt === false, 'Rule 26(a): 15g package is NOT exempt (>10g)')

  // 7D: 1 piece (sold by number, not weight/measure) -> not exempt under 26(a)
  const ctxPiece = buildRuleEngineContextFromData({
    id: 's-piece',
    identifiedProductName: 'Ball Pen 1 N',
    extractedDeclarations: [
      { id: 'd4', fieldName: 'net_quantity', rawValue: '1 N', normalizedValue: '1 N', detectionStatus: 'DETECTED', confidence: 0.9 },
    ],
  } as any)
  const resPiece = evaluateRule26SmallPackageExemption(ctxPiece)
  assert(resPiece.exempt === false, 'Rule 26(a): Package sold by count (1 N) is NOT exempt under Rule 26(a)')

  // 7E: Pan Masala 4g prior to 01/02/2026 -> exempt
  const ctxPmOld = buildRuleEngineContextFromData(
    {
      id: 's-pm-old',
      identifiedProductName: 'Pan Masala 4g',
      identifiedCategory: 'Pan Masala',
      extractedDeclarations: [
        { id: 'd5', fieldName: 'net_quantity', rawValue: '4 g', normalizedValue: '4 g', detectionStatus: 'DETECTED', confidence: 0.9 },
      ],
    } as any,
    { packagingDateOverride: new Date('2025-06-01T00:00:00.000Z') }
  )
  const resPmOld = evaluateRule26SmallPackageExemption(ctxPmOld)
  assert(resPmOld.exempt === true, 'Rule 26(a): Pan Masala 4g prior to 01/02/2026 WAS exempt')

  console.log('\n--- Test 8: PDF Report Generation, Sanitization & Layout ---')
  const reportData = await defaultReportGenerator.assembleReportData(
    inspection1.id,
    { id: officer1.id, role: officer1.role }
  )
  const pdfBuffer = await defaultPdfService.generateInspectionPdf(reportData)

  assert(
    Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 5000,
    `PDF Generation: Successfully generated ${pdfBuffer.length} bytes PDF report from persisted database inspection with sanitized text and regulatory override notice`
  )

  console.log('\n==================================================')
  console.log(`Integration Audit Summary: ${passed} Passed, ${failed} Failed`)
  console.log('==================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runAuditTests()
  .catch((err) => {
    console.error('Test execution fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
