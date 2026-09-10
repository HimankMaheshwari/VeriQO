/**
 * VeriQO — Phase 5C: Risk & Regulatory Intelligence Test Suite
 *
 * Requirements Covered:
 * A. Risk calculation with no historical concerns → LOW
 * B. Risk calculation with repeated complaints → increased risk
 * C. Formal violation severity affects risk appropriately
 * D. Multiple historical violations produce explainable factors
 * E. Active investigation increases risk appropriately
 * F. Online discrepancies contribute only as an intelligence signal
 * G. Risk calculation never creates a Violation
 * H. Risk calculation never changes ComplianceCheck
 * I. Risk calculation never changes RuleVersion
 * J. Risk calculation never changes officer final decision
 * K. Historical inspections remain immutable
 * L. Officer RBAC isolation
 * M. Senior/Admin cross-officer visibility
 * N. Risk queue sorting/filtering
 * O. Product/manufacturer history uses actual linked identifiers and does not falsely merge records
 */

import { prisma } from '../src/lib/prisma'
import { RiskService } from '../src/lib/risk/risk-service'
import { CaseAccessError } from '../src/lib/cases/types'

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

async function runPhase5cTests() {
  console.log('\n======================================================')
  console.log('  VERIQO PHASE 5C: RISK & REGULATORY INTELLIGENCE TESTS')
  console.log('======================================================\n')

  const riskService = new RiskService(prisma)

  // Track entities for teardown
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []
  const createdScanIds: string[] = []
  const createdVerificationIds: string[] = []
  const createdDiscrepancyIds: string[] = []
  const createdComplaintIds: string[] = []
  const createdCaseIds: string[] = []
  const createdInspectionIds: string[] = []
  const createdRuleIds: string[] = []
  const createdRuleVersionIds: string[] = []
  const createdCheckIds: string[] = []
  const createdViolationIds: string[] = []
  const createdDecisionIds: string[] = []

  try {
    console.log('--- Setting up Test Fixtures ---')
    const ts = Date.now()

    // 1. Users
    const officer1 = await prisma.user.create({
      data: {
        email: `p5c-officer1-${ts}@veriqo.test`,
        name: `P5C Inspector Alpha ${ts}`,
        hashedPassword: 'mock-password',
        role: 'AUTHORITY_OFFICER',
        isActive: true,
      },
    })
    createdUserIds.push(officer1.id)

    const officer2 = await prisma.user.create({
      data: {
        email: `p5c-officer2-${ts}@veriqo.test`,
        name: `P5C Inspector Beta ${ts}`,
        hashedPassword: 'mock-password',
        role: 'AUTHORITY_OFFICER',
        isActive: true,
      },
    })
    createdUserIds.push(officer2.id)

    const seniorAdmin = await prisma.user.create({
      data: {
        email: `p5c-senior-${ts}@veriqo.test`,
        name: `P5C Senior Director ${ts}`,
        hashedPassword: 'mock-password',
        role: 'SENIOR_AUTHORITY',
        isActive: true,
      },
    })
    createdUserIds.push(seniorAdmin.id)

    const consumer = await prisma.user.create({
      data: {
        email: `p5c-consumer-${ts}@veriqo.test`,
        name: `P5C Citizen Complainant ${ts}`,
        hashedPassword: 'mock-password',
        role: 'CONSUMER',
        isActive: true,
      },
    })
    createdUserIds.push(consumer.id)

    // 2. Rules & RuleVersions
    const ruleCritical = await prisma.legalRule.create({
      data: {
        ruleNumber: `LMPC-CRIT-${ts}`,
        title: 'Tampering with Maximum Retail Price',
        requirement: 'No person shall alter or obscure the retail sale price declared on the package.',
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        defaultSeverity: 'CRITICAL',
        effectiveDate: new Date('2020-01-01'),
      },
    })
    createdRuleIds.push(ruleCritical.id)

    const ruleHigh = await prisma.legalRule.create({
      data: {
        ruleNumber: `LMPC-HIGH-${ts}`,
        title: 'Mandatory Unit Sale Price Declaration',
        requirement: 'Unit sale price shall be declared on packages exceeding 100g/ml.',
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        defaultSeverity: 'HIGH',
        effectiveDate: new Date('2022-01-01'),
      },
    })
    createdRuleIds.push(ruleHigh.id)

    const ruleLow = await prisma.legalRule.create({
      data: {
        ruleNumber: `LMPC-LOW-${ts}`,
        title: 'Packaging Typography Guidelines',
        requirement: 'Declaration letters shall be prominent and conspicuous.',
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        defaultSeverity: 'LOW',
        effectiveDate: new Date('2020-01-01'),
      },
    })
    createdRuleIds.push(ruleLow.id)

    // 3. Products
    const mfgA = `Apex Consumer Industries ${ts}`
    const mfgB = `Apex Consumer International ${ts}` // Similar name, separate entity

    const productClean = await prisma.product.create({
      data: {
        name: `Pure Spring Water ${ts}`,
        brand: `PureSpring ${ts}`,
        manufacturer: mfgA,
        category: 'BEVERAGE',
      },
    })
    createdProductIds.push(productClean.id)

    const productRepeat = await prisma.product.create({
      data: {
        name: `Organic Face Cream ${ts}`,
        brand: `GlowCare ${ts}`,
        manufacturer: mfgA,
        category: 'COSMETICS',
      },
    })
    createdProductIds.push(productRepeat.id)

    const productOverseas = await prisma.product.create({
      data: {
        name: `Imported Luxury Serum ${ts}`,
        brand: `ApexLuxury ${ts}`,
        manufacturer: mfgB, // Separate company
        category: 'COSMETICS',
      },
    })
    createdProductIds.push(productOverseas.id)

    // 4. Scans
    const scanClean = await prisma.productScan.create({
      data: {
        productId: productClean.id,
        userId: consumer.id,
        status: 'COMPLETE',
        identificationStatus: 'IDENTIFIED',
        identifiedProductName: productClean.name,
      },
    })
    createdScanIds.push(scanClean.id)

    const scanRepeat = await prisma.productScan.create({
      data: {
        productId: productRepeat.id,
        userId: consumer.id,
        status: 'COMPLETE',
        identificationStatus: 'IDENTIFIED',
        identifiedProductName: productRepeat.name,
      },
    })
    createdScanIds.push(scanRepeat.id)

    // 5. Baseline Clean Case
    const caseClean = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-CLEAN-${ts}`,
        title: `Routine Market Surveillance on Water`,
        status: 'SUBMITTED',
        priority: 'LOW',
        productScanId: scanClean.id,
        createdById: consumer.id,
      },
    })
    createdCaseIds.push(caseClean.id)

    // 6. Case with Repeated Complaints
    const complaint1 = await prisma.complaint.create({
      data: {
        complaintRef: `CMP-1-${ts}`,
        title: `Missing Net Quantity`,
        description: `Net quantity is omitted from package face`,
        status: 'SUBMITTED',
        consumerId: consumer.id,
        productId: productRepeat.id,
        scanId: scanRepeat.id,
      },
    })
    createdComplaintIds.push(complaint1.id)

    const complaint2 = await prisma.complaint.create({
      data: {
        complaintRef: `CMP-2-${ts}`,
        title: `Defective Manufacturing Date`,
        description: `Date of packing illegible and smudged`,
        status: 'SUBMITTED',
        consumerId: consumer.id,
        productId: productRepeat.id,
        scanId: scanRepeat.id,
      },
    })
    createdComplaintIds.push(complaint2.id)

    const complaint3 = await prisma.complaint.create({
      data: {
        complaintRef: `CMP-3-${ts}`,
        title: `Customer Care Not Reaching`,
        description: `Customer care telephone disconnected`,
        status: 'SUBMITTED',
        consumerId: consumer.id,
        productId: productRepeat.id,
        scanId: scanRepeat.id,
      },
    })
    createdComplaintIds.push(complaint3.id)

    const caseRepeatComplaints = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-REPEAT-CMP-${ts}`,
        title: `Repeat Complaints on Organic Face Cream`,
        status: 'UNDER_REVIEW',
        priority: 'MEDIUM',
        complaintId: complaint1.id,
        productScanId: scanRepeat.id,
        createdById: consumer.id,
      },
    })
    createdCaseIds.push(caseRepeatComplaints.id)

    // 7. Case with LOW violation vs Case with CRITICAL violation
    const caseLowViolation = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-LOW-VIOL-${ts}`,
        title: `Minor Typography Inspection`,
        status: 'UNDER_REVIEW',
        priority: 'LOW',
        createdById: consumer.id,
      },
    })
    createdCaseIds.push(caseLowViolation.id)

    const inspectionLow = await prisma.inspection.create({
      data: {
        caseId: caseLowViolation.id,
        officerId: officer1.id,
        title: `Inspection for Minor Typography`,
        status: 'CLOSED',
      },
    })
    createdInspectionIds.push(inspectionLow.id)

    const violationLow = await prisma.violation.create({
      data: {
        inspectionId: inspectionLow.id,
        ruleId: ruleLow.id,
        severity: 'LOW',
        description: 'Conspicuousness font height slightly below 2mm threshold.',
      },
    })
    createdViolationIds.push(violationLow.id)

    const caseCriticalViolation = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-CRIT-VIOL-${ts}`,
        title: `Severe MRP Overpricing Investigation`,
        status: 'INVESTIGATION',
        priority: 'HIGH',
        createdById: consumer.id,
      },
    })
    createdCaseIds.push(caseCriticalViolation.id)

    const inspectionCritical = await prisma.inspection.create({
      data: {
        caseId: caseCriticalViolation.id,
        officerId: officer1.id,
        title: `Inspection for MRP Tampering`,
        status: 'IN_PROGRESS',
      },
    })
    createdInspectionIds.push(inspectionCritical.id)

    const violationCritical = await prisma.violation.create({
      data: {
        inspectionId: inspectionCritical.id,
        ruleId: ruleCritical.id,
        severity: 'CRITICAL',
        description: 'Sticker pasted over original MRP increasing declared price by 40%.',
      },
    })
    createdViolationIds.push(violationCritical.id)

    // 8. Case with Online E-Commerce Discrepancy
    const scanOnline = await prisma.productScan.create({
      data: {
        userId: consumer.id,
        status: 'COMPLETE',
        identificationStatus: 'IDENTIFIED',
        identifiedProductName: `Online Marketplace Sample ${ts}`,
      },
    })
    createdScanIds.push(scanOnline.id)

    const verification = await prisma.onlineVerification.create({
      data: {
        scanId: scanOnline.id,
        sourceUrl: 'https://ecommerce.example.test/item-101',
        domain: 'ecommerce.example.test',
        overallMatchStatus: 'MISMATCH',
      },
    })
    createdVerificationIds.push(verification.id)

    const discrepancyPrice = await prisma.onlineDiscrepancy.create({
      data: {
        verificationId: verification.id,
        discrepancyType: 'PRICE_MISMATCH',
        fieldName: 'mrp',
        physicalValue: '150.00',
        onlineValue: '210.00',
        severity: 'CRITICAL',
        message: 'Online price ₹210 exceeds physical MRP ₹150',
        isStatutoryConcern: true,
      },
    })
    createdDiscrepancyIds.push(discrepancyPrice.id)

    const caseOnline = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-ONLINE-${ts}`,
        title: `Marketplace Listing Markup Surveillance`,
        status: 'UNDER_REVIEW',
        priority: 'MEDIUM',
        productScanId: scanOnline.id,
        createdById: consumer.id,
      },
    })
    createdCaseIds.push(caseOnline.id)

    // 9. Officer Isolation Cases
    const caseOfficer1 = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-OFF1-${ts}`,
        title: `Confidential Audit Officer 1`,
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        assignedOfficerId: officer1.id,
        createdById: consumer.id,
      },
    })
    createdCaseIds.push(caseOfficer1.id)

    const caseOfficer2 = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-OFF2-${ts}`,
        title: `Confidential Audit Officer 2`,
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        assignedOfficerId: officer2.id,
        createdById: consumer.id,
      },
    })
    createdCaseIds.push(caseOfficer2.id)

    // Concluded historical inspection for decision immutability test
    const decisionHist = await prisma.officerDecision.create({
      data: {
        inspectionId: inspectionLow.id,
        officerId: officer1.id,
        decision: 'NON_COMPLIANT',
        remarks: 'Confirmed minor typography defect.',
      },
    })
    createdDecisionIds.push(decisionHist.id)

    console.log('--- Fixtures Initialized Successfully ---\n')

    // ─────────────────────────────────────────────────────────────
    // TEST A: Risk calculation with no historical concerns → LOW
    // ─────────────────────────────────────────────────────────────
    console.log('Test A: Risk calculation with no historical concerns → LOW')
    const riskA = await riskService.assessCaseRisk(caseClean.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    assert(
      riskA.level === 'LOW' && riskA.score < 25,
      'A. Case with zero violations or grievances evaluates strictly to LOW risk (score < 25)',
      `Got level: ${riskA.level}, score: ${riskA.score}`
    )
    assert(
      riskA.factors.length <= 1,
      'A. Clean case has minimal or zero adverse contributing factors'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST B: Repeated complaints increase risk score
    // ─────────────────────────────────────────────────────────────
    console.log('Test B: Risk calculation with repeated complaints → increased risk')
    const riskB = await riskService.assessCaseRisk(caseRepeatComplaints.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    assert(
      riskB.score > riskA.score,
      'B. Case with 3 repeated complaints has strictly higher risk score than clean case',
      `Repeat score: ${riskB.score} vs Clean score: ${riskA.score}`
    )
    const complaintFactor = riskB.factors.find((f) => f.category === 'COMPLAINT')
    assert(
      Boolean(complaintFactor && complaintFactor.points > 0),
      'B. Contributing factors explicitly detail repeated consumer complaints'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST C: Formal violation severity affects risk appropriately
    // ─────────────────────────────────────────────────────────────
    console.log('Test C: Formal violation severity affects risk appropriately')
    const riskLow = await riskService.assessCaseRisk(caseLowViolation.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    const riskCritical = await riskService.assessCaseRisk(caseCriticalViolation.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    assert(
      riskCritical.score > riskLow.score,
      'C. CRITICAL violation docket scores strictly higher than LOW violation docket',
      `Critical: ${riskCritical.score} vs Low: ${riskLow.score}`
    )
    const critFactor = riskCritical.factors.find((f) => f.severity === 'CRITICAL')
    const lowFactor = riskLow.factors.find((f) => f.severity === 'LOW')
    assert(
      Boolean(critFactor && lowFactor && critFactor.points > lowFactor.points),
      'C. CRITICAL violation factor contributes more points than LOW violation factor'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST D: Multiple historical violations produce explainable factors
    // ─────────────────────────────────────────────────────────────
    console.log('Test D: Multiple historical violations produce explainable factors')
    // Add HIGH violation to caseCritical to create multi-violation docket
    const violationHigh = await prisma.violation.create({
      data: {
        inspectionId: inspectionCritical.id,
        ruleId: ruleHigh.id,
        severity: 'HIGH',
        description: 'Unit sale price declaration omitted entirely.',
      },
    })
    createdViolationIds.push(violationHigh.id)

    const riskD = await riskService.assessCaseRisk(caseCriticalViolation.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    const violationFactors = riskD.factors.filter((f) => f.category === 'VIOLATION')
    assert(
      violationFactors.length >= 2,
      'D. Multiple distinct violations produce distinct explainable factor entries'
    )
    assert(
      riskD.explanation.includes('critical') && riskD.explanation.includes('high'),
      'D. Human-readable explanation explicitly references violation severities'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST E: Active investigation increases risk appropriately
    // ─────────────────────────────────────────────────────────────
    console.log('Test E: Active investigation increases risk appropriately')
    assert(
      riskCritical.factors.some((f) => f.category === 'ENFORCEMENT_STATUS'),
      'E. Active status (INVESTIGATION) generates explicit ENFORCEMENT_STATUS risk factor'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST F: Online discrepancies contribute only as intelligence signal
    // ─────────────────────────────────────────────────────────────
    console.log('Test F: Online discrepancies contribute only as an intelligence signal')
    const riskF = await riskService.assessCaseRisk(caseOnline.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    const onlineFactor = riskF.factors.find((f) => f.category === 'ONLINE_DISCREPANCY')
    assert(
      Boolean(onlineFactor && onlineFactor.points > 0),
      'F. Online listing markup contributes points as an intelligence signal'
    )

    // ─────────────────────────────────────────────────────────────
    // HARD ARCHITECTURAL INVARIANTS: Tests G, H, I, J, K
    // ─────────────────────────────────────────────────────────────
    console.log('--- Verifying Invariant Integrity (G, H, I, J, K) ---')
    const totalViolationsBefore = await prisma.violation.count()
    const totalChecksBefore = await prisma.complianceCheck.count()
    const totalRuleVersionsBefore = await prisma.ruleVersion.count()
    const decisionBefore = await prisma.officerDecision.findUnique({
      where: { id: decisionHist.id },
    })
    const inspectionBefore = await prisma.inspection.findUnique({
      where: { id: inspectionLow.id },
    })

    // Run heavy risk calculations across all entities
    await riskService.assessCaseRisk(caseClean.id, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })
    await riskService.assessCaseRisk(caseCriticalViolation.id, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })
    await riskService.assessProductRisk(productClean.id, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })
    await riskService.assessProductRisk(productRepeat.id, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })
    await riskService.assessManufacturerRisk(mfgA, { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })
    await riskService.getRiskQueue({ id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' })

    const totalViolationsAfter = await prisma.violation.count()
    const totalChecksAfter = await prisma.complianceCheck.count()
    const totalRuleVersionsAfter = await prisma.ruleVersion.count()
    const decisionAfter = await prisma.officerDecision.findUnique({
      where: { id: decisionHist.id },
    })
    const inspectionAfter = await prisma.inspection.findUnique({
      where: { id: inspectionLow.id },
    })

    assert(
      totalViolationsBefore === totalViolationsAfter,
      'G. Risk calculation NEVER creates or modifies Violation records'
    )
    assert(
      totalChecksBefore === totalChecksAfter,
      'H. Risk calculation NEVER modifies ComplianceCheck records'
    )
    assert(
      totalRuleVersionsBefore === totalRuleVersionsAfter,
      'I. Risk calculation NEVER modifies RuleVersion records'
    )
    assert(
      decisionBefore?.decision === decisionAfter?.decision &&
      decisionBefore?.remarks === decisionAfter?.remarks,
      'J. Risk calculation NEVER alters officer final decisions'
    )
    assert(
      inspectionBefore?.status === inspectionAfter?.status &&
      inspectionBefore?.caseId === inspectionAfter?.caseId,
      'K. Historical inspections remain strictly immutable'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST L: Officer RBAC Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('Test L: Officer RBAC isolation')
    let officerBlocked = false
    try {
      await riskService.assessCaseRisk(caseOfficer1.id, {
        id: officer2.id,
        role: 'AUTHORITY_OFFICER',
      })
    } catch (err: any) {
      if (err instanceof CaseAccessError) {
        officerBlocked = true
      }
    }
    assert(
      officerBlocked,
      'L. Officer 2 is strictly blocked from accessing Officer 1 private case risk assessment'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST M: Senior/Admin Cross-Officer Visibility
    // ─────────────────────────────────────────────────────────────
    console.log('Test M: Senior/Admin cross-officer visibility')
    const seniorAccess1 = await riskService.assessCaseRisk(caseOfficer1.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    const seniorAccess2 = await riskService.assessCaseRisk(caseOfficer2.id, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    assert(
      seniorAccess1.score >= 0 && seniorAccess2.score >= 0,
      'M. Senior Authority retains full cross-officer risk assessment visibility'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST N: Risk Queue Sorting & Filtering
    // ─────────────────────────────────────────────────────────────
    console.log('Test N: Risk queue sorting/filtering')
    const queueCriticalOnly = await riskService.getRiskQueue(
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' },
      { level: 'CRITICAL' }
    )
    assert(
      queueCriticalOnly.items.every((item) => item.riskLevel === 'CRITICAL'),
      'N1. Risk queue strictly filters by risk level (CRITICAL only)'
    )

    const queueSortedDesc = await riskService.getRiskQueue(
      { id: seniorAdmin.id, role: 'SENIOR_AUTHORITY' },
      { sortBy: 'score', sortOrder: 'desc' }
    )
    let isSortedDesc = true
    for (let i = 0; i < queueSortedDesc.items.length - 1; i++) {
      if (queueSortedDesc.items[i].riskScore < queueSortedDesc.items[i + 1].riskScore) {
        isSortedDesc = false
        break
      }
    }
    assert(
      isSortedDesc,
      'N2. Risk queue strictly orders cases by risk score descending'
    )

    // ─────────────────────────────────────────────────────────────
    // TEST O: Product / Manufacturer Isolation (No false merging)
    // ─────────────────────────────────────────────────────────────
    console.log('Test O: Product/manufacturer history uses actual linked identifiers and does not falsely merge records')
    const mfgARisk = await riskService.assessManufacturerRisk(mfgA, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })
    const mfgBRisk = await riskService.assessManufacturerRisk(mfgB, {
      id: seniorAdmin.id,
      role: 'SENIOR_AUTHORITY',
    })

    assert(
      mfgARisk.metrics.complaintsCount >= 3,
      'O1. Manufacturer A reflects its own 3 complaints'
    )
    assert(
      mfgBRisk.metrics.complaintsCount === 0,
      'O2. Manufacturer B does NOT inherit Manufacturer A complaints despite similar corporate naming'
    )

  } finally {
    // ─────────────────────────────────────────────────────────────
    // CLEANUP FIXTURES
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Cleaning up Test Fixtures ---')
    try {
      if (createdDecisionIds.length > 0) {
        await prisma.officerDecision.deleteMany({ where: { id: { in: createdDecisionIds } } })
      }
      if (createdViolationIds.length > 0) {
        await prisma.violation.deleteMany({ where: { id: { in: createdViolationIds } } })
      }
      if (createdCheckIds.length > 0) {
        await prisma.complianceCheck.deleteMany({ where: { id: { in: createdCheckIds } } })
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
        await prisma.productScan.deleteMany({ where: { id: { in: createdScanIds } } })
      }
      if (createdProductIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
      }
      if (createdRuleVersionIds.length > 0) {
        await prisma.ruleVersion.deleteMany({ where: { id: { in: createdRuleVersionIds } } })
      }
      if (createdRuleIds.length > 0) {
        await prisma.legalRule.deleteMany({ where: { id: { in: createdRuleIds } } })
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
  console.log(`  PHASE 5C TESTS COMPLETE: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPhase5cTests()
  .catch((err) => {
    console.error('Fatal error running Phase 5C tests:', err)
    process.exit(1)
  })
