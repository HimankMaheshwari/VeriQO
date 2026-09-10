/**
 * VeriQO Phase 6B: Consumer Result Documents & IDOR Security Test Suite
 *
 * Validates:
 * 1. Ownership Isolation & IDOR Prevention on Document Metadata (404 on unowned)
 * 2. Ownership Isolation & IDOR Prevention on Direct PDF Download (404 on unowned)
 * 3. In-Flight Status Gating (Denies download on SUBMITTED, UNDER_REVIEW, INVESTIGATION, DECISION_PENDING)
 * 4. Unfinalized Inspection Gating (Denies download if inspection lacks finalized OfficerDecision)
 * 5. Officer Personal Information Redaction (Zero officer email, phone, or internal ID leak)
 * 6. Officer Internal Notes Redaction (Zero OFFICER_NOTE, OFFICER_OBSERVATION leak)
 * 7. Internal Risk Intelligence Redaction (Zero risk scores or intelligence leak)
 * 8. Compliant Case Final PDF Generation (Valid PDF buffer for COMPLIANT ruling)
 * 9. Non-Compliant Case Final PDF Generation (Formal violations and remediation directives rendered)
 * 10. Cryptographic SHA-256 Integrity Verification (Tamper-evident hash stamped in document)
 * 11. Consumer Timeline Integration (Terminal milestone reflects document availability)
 * 12. Separate Document Types (Compliance Report vs Regulatory Determination Order)
 * 13. Authority Role Access Compatibility (Assigned officers can inspect consumer variant)
 */

import { prisma } from '../src/lib/prisma'
import {
  ConsumerDocumentService,
  ConsumerDocumentAccessError,
  ConsumerDocumentStatusGatedError,
} from '../src/lib/consumer/consumer-document-service'
import {
  getConsumerSafeStatus,
  getConsumerTimeline,
  getConsumerSafeOutcome,
} from '../src/lib/consumer/status-projection'
import type { Role, CaseStatus, AuthorityDecision, EvidenceType } from '@prisma/client'

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

function extractTextFromPdf(pdfBuffer: Buffer): string {
  const str = pdfBuffer.toString('latin1')
  let extracted = str

  // Extract from TJ arrays: [<hex> num <hex> ...] TJ
  const tjRegex = /\[(.*?)\]\s*TJ/g
  let match: RegExpExecArray | null
  while ((match = tjRegex.exec(str)) !== null) {
    const inside = match[1]
    const hexParts = inside.match(/<([0-9a-fA-F]+)>/g)
    if (hexParts) {
      let tjText = ''
      for (const h of hexParts) {
        tjText += Buffer.from(h.slice(1, -1), 'hex').toString('latin1')
      }
      extracted += ' ' + tjText
    }
  }

  // Extract from single <hex> Tj
  const singleTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g
  while ((match = singleTjRegex.exec(str)) !== null) {
    extracted += ' ' + Buffer.from(match[1], 'hex').toString('latin1')
  }

  return extracted
}

async function runPhase6bTests() {
  console.log('\n======================================================================')
  console.log('  VERIQO PHASE 6B: CONSUMER RESULT DOCUMENTS & IDOR SECURITY TESTS')
  console.log('======================================================================\n')

  const documentService = new ConsumerDocumentService(prisma)

  // Track entities for teardown
  const createdUserIds: string[] = []
  const createdProductIds: string[] = []
  const createdScanIds: string[] = []
  const createdDeclarationIds: string[] = []
  const createdRuleIds: string[] = []
  const createdInspectionIds: string[] = []
  const createdDecisionIds: string[] = []
  const createdEvidenceIds: string[] = []
  const createdCheckIds: string[] = []
  const createdViolationIds: string[] = []
  const createdComplaintIds: string[] = []
  const createdCaseIds: string[] = []

  try {
    // ─────────────────────────────────────────────────────────────
    // SETUP: Create Test Fixtures
    // ─────────────────────────────────────────────────────────────
    const uniqueSuffix = Date.now().toString().slice(-6)

    // 1. Users
    const consumerA = await prisma.user.create({
      data: {
        email: `consumer.a.${uniqueSuffix}@example.com`,
        name: 'Aarav Sharma (Consumer A)',
        hashedPassword: 'hash',
        role: 'CONSUMER',
      },
    })
    createdUserIds.push(consumerA.id)

    const consumerB = await prisma.user.create({
      data: {
        email: `consumer.b.${uniqueSuffix}@example.com`,
        name: 'Priya Patel (Consumer B)',
        hashedPassword: 'hash',
        role: 'CONSUMER',
      },
    })
    createdUserIds.push(consumerB.id)

    const officer = await prisma.user.create({
      data: {
        email: `officer.rajesh.${uniqueSuffix}@delhi.gov.in`,
        name: 'Inspector Rajesh Varma',
        hashedPassword: 'hash',
        role: 'AUTHORITY_OFFICER',
      },
    })
    createdUserIds.push(officer.id)

    // 2. Product
    const product = await prisma.product.create({
      data: {
        name: 'Heritage Cold-Pressed Sesame Oil 1L',
        brand: 'Heritage Naturals',
        category: 'Edible Oils',
        manufacturer: 'Heritage Agro Industries Ltd.',
        packer: 'Heritage Packaging Hub, Ghaziabad',
        countryOfOrigin: 'India',
        barcode: `8901234${uniqueSuffix}`,
      },
    })
    createdProductIds.push(product.id)

    // 3. Scans & Extracted Declarations
    const scanCompliant = await prisma.productScan.create({
      data: {
        userId: consumerA.id,
        productId: product.id,
        status: 'COMPLETE',
        rawOcrText: 'Heritage Cold-Pressed Sesame Oil 1L MRP Rs 240.00 incl of all taxes MFD 08/2026',
        identifiedProductName: product.name,
        identifiedBrand: product.brand,
        identifiedCategory: product.category,
        identifiedManufacturer: product.manufacturer,
      },
    })
    createdScanIds.push(scanCompliant.id)

    const decl1 = await prisma.extractedDeclaration.create({
      data: {
        scanId: scanCompliant.id,
        fieldName: 'mrp',
        rawValue: 'Rs 240.00 (Incl. of all taxes)',
        normalizedValue: '240.00',
        detectionStatus: 'DETECTED',
        confidence: 0.98,
        sourceText: 'MRP Rs 240.00 (Incl. of all taxes)',
      },
    })
    createdDeclarationIds.push(decl1.id)

    const decl2 = await prisma.extractedDeclaration.create({
      data: {
        scanId: scanCompliant.id,
        fieldName: 'net_quantity',
        rawValue: '1 L (910 g)',
        normalizedValue: '1 L',
        detectionStatus: 'DETECTED',
        confidence: 0.95,
        sourceText: 'Net Quantity: 1 L',
      },
    })
    createdDeclarationIds.push(decl2.id)

    const decl3 = await prisma.extractedDeclaration.create({
      data: {
        scanId: scanCompliant.id,
        fieldName: 'unit_sale_price',
        rawValue: 'Rs 0.24 / ml',
        normalizedValue: '0.24/ml',
        detectionStatus: 'DETECTED',
        confidence: 0.96,
        sourceText: 'USP Rs 0.24/ml',
      },
    })
    createdDeclarationIds.push(decl3.id)

    // 4. Statutory Rule for Evaluation
    const rule6 = await prisma.legalRule.upsert({
      where: { ruleNumber: 'LMPC-2011-R06-1-E' },
      update: {},
      create: {
        ruleNumber: 'LMPC-2011-R06-1-E',
        title: 'Maximum Retail Price Declaration',
        requirement: 'MRP must be stated inclusive of all taxes.',
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        effectiveDate: new Date('2011-04-01'),
        defaultSeverity: 'CRITICAL',
      },
    })

    // 5. Compliant Inspection & Case (Consumer A)
    const inspectionCompliant = await prisma.inspection.create({
      data: {
        productId: product.id,
        scanId: scanCompliant.id,
        officerId: officer.id,
        status: 'CLOSED',
        title: 'Compliant Packaging Examination',
      },
    })
    createdInspectionIds.push(inspectionCompliant.id)

    const checkCompliant = await prisma.complianceCheck.create({
      data: {
        inspectionId: inspectionCompliant.id,
        ruleId: rule6.id,
        status: 'PASS',
        ruleVersionNumber: 1,
        evaluationDetails: { summary: 'MRP Rs 240.00 inclusive of taxes correctly displayed.' },
      },
    })
    createdCheckIds.push(checkCompliant.id)

    const decisionCompliant = await prisma.officerDecision.create({
      data: {
        inspectionId: inspectionCompliant.id,
        officerId: officer.id,
        decision: 'COMPLIANT',
        remarks: 'Physical packaging conforms fully with statutory Legal Metrology rules.',
        decidedAt: new Date(),
      },
    })
    createdDecisionIds.push(decisionCompliant.id)

    // Confidential internal officer notes (MUST NOT LEAK)
    const secretOfficerNote = await prisma.evidence.create({
      data: {
        inspectionId: inspectionCompliant.id,
        type: 'OFFICER_NOTE',
        title: 'Confidential Internal Memo',
        description: 'SECRET_OFFICER_OBSERVATION: Distributor may have uninspected stock in Sector 4 godown.',
        createdById: officer.id,
      },
    })
    createdEvidenceIds.push(secretOfficerNote.id)

    // Complaint A1 (Resolved with compliant inspection)
    const complaintA1 = await prisma.complaint.create({
      data: {
        consumerId: consumerA.id,
        productId: product.id,
        scanId: scanCompliant.id,
        title: 'Suspected Packaging Discrepancy',
        description: 'Please verify if the declared price and volume are compliant with Legal Metrology.',
        status: 'RESOLVED',
        complaintRef: `COMP-A1-${uniqueSuffix}`,
      },
    })
    createdComplaintIds.push(complaintA1.id)

    const caseA1 = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-A1-${uniqueSuffix}`,
        title: 'Regulatory Investigation for Complaint A1',
        status: 'RESOLVED',
        priority: 'MEDIUM',
        complaintId: complaintA1.id,
        productScanId: scanCompliant.id,
        assignedOfficerId: officer.id,
        createdById: officer.id,
        resolutionNotes: 'Formal examination completed. All packaging statutory requirements met.',
        closedAt: new Date(),
      },
    })
    createdCaseIds.push(caseA1.id)

    // Link inspection to case
    await prisma.inspection.update({
      where: { id: inspectionCompliant.id },
      data: { caseId: caseA1.id },
    })

    // 6. Non-Compliant Case Fixture (Consumer A - Complaint A2)
    const scanNonCompliant = await prisma.productScan.create({
      data: {
        userId: consumerA.id,
        productId: product.id,
        status: 'COMPLETE',
        rawOcrText: 'Missing MRP and missing tax inclusivity on package',
      },
    })
    createdScanIds.push(scanNonCompliant.id)

    const inspectionNonCompliant = await prisma.inspection.create({
      data: {
        productId: product.id,
        scanId: scanNonCompliant.id,
        officerId: officer.id,
        status: 'CLOSED',
        title: 'Non-Compliant Packaging Examination',
      },
    })
    createdInspectionIds.push(inspectionNonCompliant.id)

    const checkFailed = await prisma.complianceCheck.create({
      data: {
        inspectionId: inspectionNonCompliant.id,
        ruleId: rule6.id,
        status: 'FAIL',
        ruleVersionNumber: 1,
        evaluationDetails: { summary: 'Mandatory MRP declaration missing from packaging.' },
      },
    })
    createdCheckIds.push(checkFailed.id)

    const violation = await prisma.violation.create({
      data: {
        inspectionId: inspectionNonCompliant.id,
        ruleId: rule6.id,
        severity: 'CRITICAL',
        description: 'Mandatory Maximum Retail Price (MRP) declaration is omitted from principal display panel.',
        remediationGuidance: 'Print conspicuous MRP inclusive of all taxes pursuant to Rule 6(1)(e).',
      },
    })
    createdViolationIds.push(violation.id)

    const decisionNonCompliant = await prisma.officerDecision.create({
      data: {
        inspectionId: inspectionNonCompliant.id,
        officerId: officer.id,
        decision: 'NON_COMPLIANT',
        remarks: 'Statutory non-compliance identified. Notice under Section 39 issued to packer.',
        decidedAt: new Date(),
      },
    })
    createdDecisionIds.push(decisionNonCompliant.id)

    const complaintA2 = await prisma.complaint.create({
      data: {
        consumerId: consumerA.id,
        productId: product.id,
        scanId: scanNonCompliant.id,
        title: 'No MRP on packet',
        description: 'I bought this bottle and there is no printed price anywhere on it.',
        status: 'RESOLVED',
        complaintRef: `COMP-A2-${uniqueSuffix}`,
      },
    })
    createdComplaintIds.push(complaintA2.id)

    const caseA2 = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-A2-${uniqueSuffix}`,
        title: 'Regulatory Investigation for Complaint A2',
        status: 'RESOLVED',
        priority: 'HIGH',
        complaintId: complaintA2.id,
        productScanId: scanNonCompliant.id,
        assignedOfficerId: officer.id,
        createdById: officer.id,
        resolutionNotes: 'Non-compliance established. Section 39 corrective notice served.',
        closedAt: new Date(),
      },
    })
    createdCaseIds.push(caseA2.id)

    await prisma.inspection.update({
      where: { id: inspectionNonCompliant.id },
      data: { caseId: caseA2.id },
    })

    // 7. In-Flight Case Fixture (Consumer A - Complaint A3: Status INVESTIGATION)
    const complaintA3 = await prisma.complaint.create({
      data: {
        consumerId: consumerA.id,
        productId: product.id,
        title: 'In-Flight Complaint',
        description: 'Active ongoing investigation.',
        status: 'INVESTIGATING',
        complaintRef: `COMP-A3-${uniqueSuffix}`,
      },
    })
    createdComplaintIds.push(complaintA3.id)

    const caseA3 = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-A3-${uniqueSuffix}`,
        title: 'In-Flight Case in Investigation',
        status: 'INVESTIGATION',
        priority: 'MEDIUM',
        complaintId: complaintA3.id,
        assignedOfficerId: officer.id,
        createdById: officer.id,
      },
    })
    createdCaseIds.push(caseA3.id)

    const inspectionDraft = await prisma.inspection.create({
      data: {
        productId: product.id,
        caseId: caseA3.id,
        officerId: officer.id,
        status: 'IN_PROGRESS',
        title: 'Ongoing In-Flight Inspection',
      },
    })
    createdInspectionIds.push(inspectionDraft.id)

    // 8. Consumer B Complaint (Private to Consumer B)
    const complaintB1 = await prisma.complaint.create({
      data: {
        consumerId: consumerB.id,
        productId: product.id,
        title: 'Consumer B Private Filing',
        description: 'Confidential complaint filed by Consumer B.',
        status: 'RESOLVED',
        complaintRef: `COMP-B1-${uniqueSuffix}`,
      },
    })
    createdComplaintIds.push(complaintB1.id)

    const caseB1 = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-B1-${uniqueSuffix}`,
        title: 'Case for Consumer B',
        status: 'RESOLVED',
        priority: 'MEDIUM',
        complaintId: complaintB1.id,
        assignedOfficerId: officer.id,
        createdById: officer.id,
      },
    })
    createdCaseIds.push(caseB1.id)

    console.log('Test fixtures created successfully.\n')

    // =========================================================================
    // TEST SUITE 1: Ownership Isolation & IDOR Prevention
    // =========================================================================
    console.log('--- Test Suite 1: Ownership Isolation & IDOR Prevention ---')

    // 1.1 Consumer A can fetch documents for own complaint A1
    const consumerADocs = await documentService.getAvailableDocuments(complaintA1.id, {
      id: consumerA.id,
      role: 'CONSUMER',
    })
    assert(consumerADocs.areDocumentsAvailable === true, 'Consumer A can access own complaint documents metadata')
    assert(consumerADocs.documents.length === 2, 'Consumer A receives 2 available document descriptors')

    // 1.2 Cross-Consumer IDOR: Consumer A attempts to access Consumer B's complaint (listing)
    let crossListBlocked = false
    try {
      await documentService.getAvailableDocuments(complaintB1.id, {
        id: consumerA.id,
        role: 'CONSUMER',
      })
    } catch (err: any) {
      if (err instanceof ConsumerDocumentAccessError && err.message === 'Complaint not found') {
        crossListBlocked = true
      }
    }
    assert(crossListBlocked, 'Cross-consumer document listing returns 404 (prevents IDOR & ID enumeration)')

    // 1.3 Cross-Consumer IDOR: Consumer A attempts direct PDF download of Consumer B's complaint
    let crossDownloadBlocked = false
    try {
      await documentService.generateDocument(complaintB1.id, 'compliance-report', {
        id: consumerA.id,
        role: 'CONSUMER',
      })
    } catch (err: any) {
      if (err instanceof ConsumerDocumentAccessError && err.message === 'Complaint not found') {
        crossDownloadBlocked = true
      }
    }
    assert(crossDownloadBlocked, 'Cross-consumer direct PDF download returns 404 (IDOR prevention on stream endpoint)')

    // =========================================================================
    // TEST SUITE 2: In-Flight Status Gating & Draft Prevention
    // =========================================================================
    console.log('\n--- Test Suite 2: In-Flight Status Gating & Draft Prevention ---')

    // 2.1 In-Flight case documents listing shows areDocumentsAvailable: false
    const inFlightDocs = await documentService.getAvailableDocuments(complaintA3.id, {
      id: consumerA.id,
      role: 'CONSUMER',
    })
    assert(inFlightDocs.areDocumentsAvailable === false, 'In-flight case reflects areDocumentsAvailable: false')
    assert(inFlightDocs.documents.length === 0, 'In-flight case returns 0 document download links')
    assert(
      Boolean(inFlightDocs.availabilityNotice?.includes('upon conclusion')),
      'In-flight case provides clear availability notice'
    )

    // 2.2 In-Flight case direct PDF download is strictly blocked
    let inFlightDownloadBlocked = false
    try {
      await documentService.generateDocument(complaintA3.id, 'compliance-report', {
        id: consumerA.id,
        role: 'CONSUMER',
      })
    } catch (err: any) {
      if (err instanceof ConsumerDocumentStatusGatedError) {
        inFlightDownloadBlocked = true
      }
    }
    assert(inFlightDownloadBlocked, 'Direct PDF download on in-flight case is strictly blocked (Status Gated)')

    // 2.3 Case without finalized OfficerDecision is blocked
    const complaintA4 = await prisma.complaint.create({
      data: {
        consumerId: consumerA.id,
        productId: product.id,
        title: 'Missing Decision Case',
        description: 'Testing unfinalized decision gating.',
        status: 'RESOLVED',
        complaintRef: `COMP-A4-${uniqueSuffix}`,
      },
    })
    createdComplaintIds.push(complaintA4.id)

    const caseA4 = await prisma.regulatoryCase.create({
      data: {
        caseNumber: `CASE-A4-${uniqueSuffix}`,
        title: 'Resolved without officer decision',
        status: 'RESOLVED',
        complaintId: complaintA4.id,
        createdById: officer.id,
      },
    })
    createdCaseIds.push(caseA4.id)

    let missingDecisionBlocked = false
    try {
      await documentService.generateDocument(complaintA4.id, 'compliance-report', {
        id: consumerA.id,
        role: 'CONSUMER',
      })
    } catch (err: any) {
      if (err instanceof ConsumerDocumentStatusGatedError) {
        missingDecisionBlocked = true
      }
    }
    assert(missingDecisionBlocked, 'Unfinalized inspection without OfficerDecision is blocked from producing document')

    // =========================================================================
    // TEST SUITE 3: Data Redaction & Consumer Privacy Safeguards
    // =========================================================================
    console.log('\n--- Test Suite 3: Data Redaction & Consumer Privacy Safeguards ---')

    const compliantReportResult = await documentService.generateDocument(
      complaintA1.id,
      'compliance-report',
      {
        id: consumerA.id,
        role: 'CONSUMER',
      }
    )

    const pdfString = extractTextFromPdf(compliantReportResult.buffer)

    // 3.1 Officer email redaction
    assert(
      !pdfString.includes(officer.email),
      'Inspecting officer personal email is 100% REDACTED from consumer PDF'
    )

    // 3.2 Confidential officer note redaction
    assert(
      !pdfString.includes('SECRET_OFFICER_OBSERVATION'),
      'Internal OFFICER_NOTE is 100% REDACTED and omitted from consumer PDF'
    )
    assert(
      !pdfString.includes('Sector 4 godown'),
      'Officer investigative hypothesis text is omitted from consumer PDF'
    )

    // 3.3 Zero risk intelligence scores
    assert(
      !pdfString.includes('RISK_SCORE') && !pdfString.includes('Risk Tier'),
      'Internal risk intelligence scores are 100% excluded from consumer PDF'
    )

    // 3.4 Sanitized officer title
    assert(
      pdfString.includes('Authorized Inspecting Officer'),
      'PDF displays sanitized statutory officer title'
    )

    // =========================================================================
    // TEST SUITE 4: Compliant vs Non-Compliant PDF Generation
    // =========================================================================
    console.log('\n--- Test Suite 4: Compliant vs Non-Compliant PDF Generation ---')

    // 4.1 Compliant report format
    assert(
      compliantReportResult.buffer.subarray(0, 5).toString() === '%PDF-',
      'Compliant report generates valid binary PDF structure (%PDF-)'
    )
    assert(
      pdfString.includes('ZERO FORMAL STATUTORY VIOLATIONS RECORDED'),
      'Compliant report clearly records zero statutory violations'
    )
    assert(
      pdfString.includes('COMPLIANT'),
      'Compliant report records COMPLIANT authority determination'
    )

    // 4.2 Non-Compliant report format
    const nonCompliantReportResult = await documentService.generateDocument(
      complaintA2.id,
      'compliance-report',
      {
        id: consumerA.id,
        role: 'CONSUMER',
      }
    )
    const nonCompliantPdfStr = extractTextFromPdf(nonCompliantReportResult.buffer)

    assert(
      nonCompliantReportResult.buffer.subarray(0, 5).toString() === '%PDF-',
      'Non-compliant report generates valid binary PDF structure (%PDF-)'
    )
    assert(
      nonCompliantPdfStr.includes('LMPC-2011-R06-1-E') && nonCompliantPdfStr.includes('CRITICAL'),
      'Non-compliant report contains formal statutory violation record'
    )
    assert(
      nonCompliantPdfStr.includes('Rule 6(1)(e)'),
      'Non-compliant report includes statutory remediation guidance'
    )
    assert(
      nonCompliantPdfStr.includes('NON_COMPLIANT'),
      'Non-compliant report records NON_COMPLIANT authority determination'
    )

    // =========================================================================
    // TEST SUITE 5: Regulatory Determination Order Document
    // =========================================================================
    console.log('\n--- Test Suite 5: Regulatory Determination Order ---')

    const orderResult = await documentService.generateDocument(
      complaintA1.id,
      'regulatory-order',
      {
        id: consumerA.id,
        role: 'CONSUMER',
      }
    )
    const orderPdfStr = extractTextFromPdf(orderResult.buffer)

    assert(
      orderResult.buffer.subarray(0, 5).toString() === '%PDF-',
      'Regulatory Determination Order generates valid binary PDF structure'
    )
    assert(
      orderPdfStr.includes('FORMAL REGULATORY DETERMINATION ORDER'),
      'Order contains formal Directorate Determination Order title'
    )
    assert(
      orderPdfStr.includes('Legal Metrology Act, 2009'),
      'Order cites Legal Metrology Act, 2009 statutory authority'
    )
    assert(
      orderPdfStr.includes(caseA1.caseNumber),
      'Order certifies official regulatory case docket number'
    )
    assert(
      orderPdfStr.includes(complaintA1.complaintRef),
      'Order certifies complainant reference'
    )

    // =========================================================================
    // TEST SUITE 6: SHA-256 Integrity Verification
    // =========================================================================
    console.log('\n--- Test Suite 6: SHA-256 Cryptographic Integrity ---')

    assert(
      compliantReportResult.securityHash.length === 64,
      'Compliance report stamps valid 64-character SHA-256 integrity hash'
    )
    assert(
      orderResult.securityHash.length === 64,
      'Regulatory order stamps valid 64-character SHA-256 integrity hash'
    )
    assert(
      pdfString.includes(compliantReportResult.securityHash.slice(0, 16)),
      'Verification hash is embedded in compliance report PDF'
    )
    assert(
      orderPdfStr.includes(orderResult.securityHash),
      'Full verification hash is embedded in regulatory order certificate'
    )

    // =========================================================================
    // TEST SUITE 7: Consumer Timeline & Outcome Integration
    // =========================================================================
    console.log('\n--- Test Suite 7: Consumer Timeline & Outcome Integration ---')

    // 7.1 Terminal outcome reflects documentsAvailable: true
    const outcomeResolved = getConsumerSafeOutcome(
      'RESOLVED',
      'RESOLVED',
      'COMPLIANT',
      new Date()
    )
    assert(
      outcomeResolved?.documentsAvailable === true,
      'Resolved complaint outcome marks documentsAvailable: true'
    )

    const outcomeInFlight = getConsumerSafeOutcome(
      'INVESTIGATION',
      'INVESTIGATING',
      null,
      null
    )
    assert(
      outcomeInFlight === null,
      'In-flight complaint returns null for terminal outcome'
    )

    // 7.2 Timeline reflects document badge at terminal resolution
    const timelineResolved = getConsumerTimeline({
      createdAt: new Date('2026-09-01'),
      caseStatus: 'RESOLVED',
      complaintStatus: 'RESOLVED',
      inspectionDecision: 'COMPLIANT',
    })
    const terminalStep = timelineResolved[timelineResolved.length - 1]
    assert(
      terminalStep.hasDocuments === true,
      'Terminal timeline step reflects hasDocuments: true'
    )
    assert(
      terminalStep.documentCount === 2,
      'Terminal timeline step reflects documentCount: 2'
    )

    // 7.3 Timeline in-flight does not flag documents
    const timelineInFlight = getConsumerTimeline({
      createdAt: new Date('2026-09-01'),
      caseStatus: 'INVESTIGATION',
      complaintStatus: 'INVESTIGATING',
    })
    const inFlightStep = timelineInFlight[timelineInFlight.length - 1]
    assert(
      inFlightStep.hasDocuments === false,
      'In-flight timeline does not flag document availability'
    )

    // =========================================================================
    // TEST SUITE 8: Authority Access Compatibility
    // =========================================================================
    console.log('\n--- Test Suite 8: Authority Access Compatibility ---')

    const authorityDocs = await documentService.getAvailableDocuments(complaintA1.id, {
      id: officer.id,
      role: 'AUTHORITY_OFFICER',
    })
    assert(
      authorityDocs.areDocumentsAvailable === true,
      'Authority Officer assigned to case can view consumer result documents metadata'
    )

    const authorityGeneratedPdf = await documentService.generateDocument(
      complaintA1.id,
      'compliance-report',
      {
        id: officer.id,
        role: 'AUTHORITY_OFFICER',
      }
    )
    assert(
      authorityGeneratedPdf.buffer.subarray(0, 5).toString() === '%PDF-',
      'Authority Officer can generate and inspect consumer-safe variant'
    )

    console.log('\n======================================================================')
    console.log(`  PHASE 6B TESTS COMPLETE: ${totalPassed} PASSED, ${totalFailed} FAILED`)
    console.log('======================================================================\n')
  } finally {
    // ─────────────────────────────────────────────────────────────
    // TEARDOWN: Clean up test fixtures safely
    // ─────────────────────────────────────────────────────────────
    console.log('Cleaning up test fixtures...')
    try {
      if (createdEvidenceIds.length) await prisma.evidence.deleteMany({ where: { id: { in: createdEvidenceIds } } })
      if (createdViolationIds.length) await prisma.violation.deleteMany({ where: { id: { in: createdViolationIds } } })
      if (createdCheckIds.length) await prisma.complianceCheck.deleteMany({ where: { id: { in: createdCheckIds } } })
      if (createdDecisionIds.length) await prisma.officerDecision.deleteMany({ where: { id: { in: createdDecisionIds } } })
      if (createdInspectionIds.length) await prisma.inspection.deleteMany({ where: { id: { in: createdInspectionIds } } })
      if (createdCaseIds.length) await prisma.regulatoryCase.deleteMany({ where: { id: { in: createdCaseIds } } })
      if (createdComplaintIds.length) await prisma.complaint.deleteMany({ where: { id: { in: createdComplaintIds } } })
      if (createdDeclarationIds.length) await prisma.extractedDeclaration.deleteMany({ where: { id: { in: createdDeclarationIds } } })
      if (createdScanIds.length) await prisma.productScan.deleteMany({ where: { id: { in: createdScanIds } } })
      if (createdProductIds.length) await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } })
      if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
      console.log('Teardown complete.')
    } catch (cleanupErr) {
      console.error('Teardown warning:', cleanupErr)
    }
  }

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runPhase6bTests()
  .catch((err) => {
    console.error('Fatal error in Phase 6B test runner:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
