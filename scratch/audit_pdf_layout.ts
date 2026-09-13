import fs from 'fs'
import path from 'path'
import { defaultPdfService } from '../src/lib/inspections/pdf-service'
import { type InspectionReportData } from '../src/lib/inspections/types'

async function generateSamplePdf(name: string, data: InspectionReportData): Promise<number> {
  const buf = await defaultPdfService.generateInspectionPdf(data)
  const outDir = path.join(__dirname, 'pdf_output')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  const outPath = path.join(outDir, `${name}.pdf`)
  fs.writeFileSync(outPath, buf)

  const binary = buf.toString('binary')
  const pageMatches = binary.match(/\/Type\s*\/Page\b/g)
  const pageCount = pageMatches ? pageMatches.length : 0
  console.log(`[PDF] Generated ${name}.pdf: ${buf.length} bytes, ${pageCount} pages -> ${outPath}`)
  return pageCount
}

async function run() {
  // Scenario 1: Vim Dishwash Liquid (Compliant / Voluntary BIS)
  const vimReportData: InspectionReportData = {
    reportRef: 'REP-VIM-TEST-2026',
    generatedAt: new Date('2026-09-13T10:30:00Z'),
    securityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    inspection: {
      id: 'insp-vim-001',
      title: 'Vim Dishwash Packaging Verification',
      status: 'IN_PROGRESS',
      notes: 'Routine market surveillance inspection conducted at retail premises.',
      createdAt: new Date('2026-09-13T09:00:00Z'),
      updatedAt: new Date('2026-09-13T10:30:00Z'),
    },
    officer: {
      id: 'usr-officer-1',
      name: 'R. K. Sharma',
      email: 'rk.sharma@gov.in',
      role: 'AUTHORITY_OFFICER',
    },
    product: {
      id: 'prod-vim-1',
      name: 'Vim Concentrated Gel Dishwash Liquid',
      brand: 'Vim',
      genericName: 'Dishwashing Liquid',
      category: 'Household / Dishwash Gel',
      manufacturer: 'Hindustan Unilever Ltd., B-12 Industrial Area, Haridwar, Uttarakhand - 249403',
      packer: null,
      importer: null,
      countryOfOrigin: 'India',
      barcode: '8901030752109',
    },
    scan: {
      id: 'scan-vim-test-01',
      createdAt: new Date('2026-09-13T09:15:00Z'),
      identificationStatus: 'IDENTIFIED',
      identifiedProductName: 'Vim Concentrated Gel Dishwash Liquid',
      identifiedBrand: 'Vim',
      identifiedCategory: 'Household / Dishwash Gel',
      identifiedManufacturer: 'Hindustan Unilever Ltd',
      images: [
        {
          id: 'img-1',
          originalFilename: 'front_label.jpg',
          storageKey: 'evidence/front_label.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 245102,
          uploadedAt: new Date('2026-09-13T09:15:00Z'),
        },
      ],
    },
    declarations: [
      { id: 'd-1', fieldName: 'product_name', rawValue: 'Vim Concentrated Gel Dishwash Liquid', normalizedValue: 'Vim Dishwash', confidence: 0.98, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-2', fieldName: 'manufacturer', rawValue: 'Hindustan Unilever Ltd., B-12 Industrial Area, Haridwar', normalizedValue: 'Hindustan Unilever Ltd', confidence: 0.95, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-3', fieldName: 'mrp', rawValue: 'Rs. 115.00 (Incl. of all taxes)', normalizedValue: '115.00', confidence: 0.94, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-4', fieldName: 'net_quantity', rawValue: '500 ml', normalizedValue: '500 ml', confidence: 0.96, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-5', fieldName: 'country_of_origin', rawValue: 'Made in India', normalizedValue: 'India', confidence: 0.92, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-6', fieldName: 'customer_care', rawValue: 'Toll-free 1800-10-22-221', normalizedValue: '18001022221', confidence: 0.90, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-7', fieldName: 'date_of_manufacture', rawValue: '08/2026', normalizedValue: '2026-08-01', confidence: 0.88, detectionStatus: 'DETECTED', sourceText: null },
      { id: 'd-8', fieldName: 'packer', rawValue: null, normalizedValue: null, confidence: null, detectionStatus: 'NOT_DETECTED', sourceText: null },
      { id: 'd-9', fieldName: 'importer', rawValue: null, normalizedValue: null, confidence: null, detectionStatus: 'NOT_DETECTED', sourceText: null },
    ],
    complianceChecks: [
      {
        id: 'chk-1',
        ruleNumber: 'Rule 6(1)(a)',
        ruleTitle: 'Name and address of the manufacturer',
        ruleRequirement: 'Name and complete address of manufacturer/packer must be clearly stated on packaging.',
        ruleVersionNumber: 1,
        status: 'PASS',
        evaluationSummary: 'Manufacturer Hindustan Unilever Ltd clearly detected with complete address.',
        sourceReference: 'LMPC Act 2009 Sec 18',
        checkedAt: new Date('2026-09-13T09:20:00Z'),
      },
      {
        id: 'chk-2',
        ruleNumber: 'Rule 6(1)(e)',
        ruleTitle: 'Maximum Retail Price (MRP)',
        ruleRequirement: 'MRP inclusive of all taxes must be declared.',
        ruleVersionNumber: 1,
        status: 'PASS',
        evaluationSummary: 'MRP Rs. 115.00 compliant with all taxes declaration format.',
        sourceReference: 'Rule 6(1)(e)',
        checkedAt: new Date('2026-09-13T09:20:00Z'),
      },
      {
        id: 'chk-3',
        ruleNumber: 'Rule 6(1)(f)',
        ruleTitle: 'Net quantity declaration',
        ruleRequirement: 'Net quantity in standard SI units must be declared.',
        ruleVersionNumber: 1,
        status: 'PASS',
        evaluationSummary: 'Net quantity declared as 500 ml using standard units.',
        sourceReference: 'Rule 6(1)(f)',
        checkedAt: new Date('2026-09-13T09:20:00Z'),
      },
    ],
    violations: [],
    evidenceItems: [
      {
        id: 'ev-1',
        type: 'PHOTOGRAPH',
        title: 'Front packaging label photograph',
        source: 'Officer Mobile Inspection',
        description: 'Physical packaging verified in store. All required Legal Metrology declarations present.',
        confidence: 1.0,
        createdByName: 'R. K. Sharma',
        createdAt: new Date('2026-09-13T09:22:00Z'),
        complianceCheckId: null,
        violationId: null,
      },
    ],
    decision: {
      id: 'dec-1',
      decision: 'COMPLIANT',
      remarks: 'No statutory violations found on physical commodity. Voluntary BIS domain.',
      decidedAt: new Date('2026-09-13T10:00:00Z'),
      officerName: 'R. K. Sharma',
    },
    bis: {
      status: 'NEEDS_REVIEW',
      overallStatus: 'PENDING REVIEW',
      candidateStandards: [
        {
          id: 'cand-1',
          standardNumber: 'NOT_DETERMINED',
          title: 'No Applicable Indian Standard Identified',
          category: 'Household / Detergents',
          relevance: 0,
          state: 'NEEDS_REVIEW',
          matchReason: 'No applicable mandatory BIS standard identified from current knowledge base.',
        },
      ],
      qcoChecks: [
        {
          id: 'qco-1',
          orderNumber: 'NO APPLICABLE QCO IDENTIFIED',
          orderTitle: 'No Mandatory Quality Control Order Applicable',
          isMandatoryCertification: false,
          effectiveDate: null,
          status: 'NOT_APPLICABLE',
          guidance: 'No active mandatory Quality Control Order (QCO) identified for this commodity.',
        },
      ],
      identifiers: [],
      findings: [
        {
          id: 'f-1',
          code: 'BIS_NO_MANDATORY_QCO',
          title: 'No Mandatory Quality Control Order Applicable',
          severity: 'INFO',
          category: 'QCO',
          explanation: 'No applicable mandatory BIS standard or QCO was identified from currently available knowledge base.',
          recommendation: 'Surveillance officer may conclude evaluation under Legal Metrology domain.',
        },
      ],
    },
  }

  const p1 = await generateSamplePdf('vim_dishwash_report', vimReportData)
  console.log(`Vim page count: ${p1}`)
}

run().catch(console.error)
