/**
 * ConsumerPdfService — Server-Side Consumer-Safe PDF Generator
 *
 * Constructs publication-grade, official Legal Metrology result documents for citizens.
 *
 * MANDATORY PRIVACY & STATUTORY INVARIANTS:
 * 1. Zero officer personal contact information (email, phone, private IDs redacted).
 * 2. Zero internal notes (OFFICER_NOTE, OFFICER_OBSERVATION 100% stripped).
 * 3. Zero internal risk scores, intelligence, or administrative metadata.
 * 4. FIELD_MEASUREMENT excluded unless formally part of the verified statutory violation.
 * 5. Historical RuleVersion locked and displayed deterministically.
 * 6. Neutral statutory summaries only — no preliminary or prejudicial statements.
 * 7. Cryptographic SHA-256 integrity hash stamped on every document.
 */

import PDFDocument from 'pdfkit'
import { formatDate, formatDateTime } from '../utils'

export interface ConsumerComplianceReportData {
  documentRef: string
  complaintRef: string
  caseNumber: string
  issuedAt: Date
  securityHash: string
  product: {
    name: string
    brand: string | null
    category: string | null
    manufacturer: string | null
    packer: string | null
    importer: string | null
    countryOfOrigin: string | null
  }
  declarations: Array<{
    fieldName: string
    label: string
    declaredValue: string
    detectionStatus: string
  }>
  complianceChecks: Array<{
    ruleNumber: string
    ruleTitle: string
    ruleVersionNumber: number
    status: 'PASS' | 'FAIL' | 'WARNING' | 'REQUIRES_REVIEW' | 'NOT_APPLICABLE'
    isAdvisoryOnly: boolean
    summary: string
    sourceReference: string | null
  }>
  violations: Array<{
    ruleNumber: string
    severity: string
    description: string
    remediationGuidance: string | null
  }>
  decision: {
    ruling: 'COMPLIANT' | 'NON_COMPLIANT' | 'DISMISSED' | 'FURTHER_INVESTIGATION'
    summaryText: string
    decidedAt: Date
  }
}

export interface ConsumerRegulatoryOrderData {
  orderRef: string
  complaintRef: string
  caseNumber: string
  issuedAt: Date
  securityHash: string
  complainantSubject: string
  product: {
    name: string
    brand: string | null
    manufacturer: string | null
    category: string | null
  }
  determination: {
    ruling: 'COMPLIANT' | 'NON_COMPLIANT' | 'DISMISSED' | 'FURTHER_INVESTIGATION'
    rulingTitle: string
    statutorySummary: string
    decidedAt: Date
    effectiveDate: Date
  }
  statutoryDirectives: string[]
  legalAuthority: {
    actTitle: string
    rulesTitle: string
    competentAuthority: string
  }
}

/**
 * Cleans text to prevent glyph corruption under standard PDFKit Helvetica fonts.
 */
function cleanPdfText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/₹/g, 'Rs. ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .trim()
}

export class ConsumerPdfService {
  /**
   * Generates a consumer-safe Packaging Compliance Report PDF buffer.
   */
  async generateConsumerCompliancePdf(data: ConsumerComplianceReportData): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          bufferPages: true,
          compress: false,
          info: {
            Title: `Legal Metrology Compliance Report - ${data.documentRef}`,
            Author: 'Directorate of Legal Metrology, Government of India',
            Subject: `Consumer Packaging Compliance Report - ${data.complaintRef}`,
            Keywords: 'Legal Metrology, LMPC, Compliance, Consumer Report, VeriQO',
            CreationDate: data.issuedAt,
          },
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', (err) => reject(err))

        const primaryColor = '#0f172a' // Slate 900
        const brandColor = '#2563eb' // Blue 600
        const successColor = '#16a34a' // Green 600
        const errorColor = '#dc2626' // Red 600
        const warningColor = '#d97706' // Amber 600
        const mutedColor = '#64748b' // Slate 500
        const lightBg = '#f8fafc' // Slate 50
        const borderCol = '#cbd5e1' // Slate 300
        const contentWidth = 515 // 595.28 - 80

        // Helper: Section Header
        const drawSectionHeader = (title: string, secNumber: number) => {
          doc.moveDown(0.8)
          if (doc.y > 700) doc.addPage()

          doc.rect(40, doc.y, contentWidth, 22).fillAndStroke(lightBg, borderCol)

          doc
            .fillColor(primaryColor)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${secNumber}. ${title.toUpperCase()}`, 48, doc.y + 6, { width: contentWidth - 16 })

          doc.moveDown(0.8)
        }

        // ==========================================
        // 1. OFFICIAL CONSUMER REPORT HEADER
        // ==========================================
        doc.rect(40, 40, contentWidth, 68).fill(primaryColor)

        doc
          .fillColor('#ffffff')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('GOVERNMENT OF INDIA • DIRECTORATE OF LEGAL METROLOGY', 52, 48)

        doc
          .fillColor('#94a3b8')
          .fontSize(9)
          .font('Helvetica')
          .text('CONSUMER PROTECTION & PACKAGED COMMODITIES STATUTORY AUDIT', 52, 64)

        doc
          .fillColor('#38bdf8')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('STATUTORY PACKAGING COMPLIANCE REPORT', 52, 78)

        // Metadata Header Box (Right aligned)
        doc
          .fillColor('#ffffff')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(`REPORT REF: ${data.documentRef}`, 330, 48, { align: 'right', width: 210 })

        doc
          .fillColor('#cbd5e1')
          .fontSize(8)
          .font('Helvetica')
          .text(`DATE ISSUED: ${formatDate(data.issuedAt)}`, 330, 62, { align: 'right', width: 210 })

        doc
          .fillColor('#94a3b8')
          .fontSize(7)
          .font('Helvetica')
          .text(`SHA-256: ${data.securityHash.slice(0, 24)}...`, 330, 76, { align: 'right', width: 210 })

        doc.y = 118
        doc.moveDown(0.5)

        let sectionIndex = 1

        // ==========================================
        // 2. FILING REFERENCES & COMMODITY SUMMARY
        // ==========================================
        drawSectionHeader('Filing References & Commodity Subject', sectionIndex++)

        const startY1 = doc.y
        doc.rect(40, startY1, contentWidth, 54).fillAndStroke('#ffffff', borderCol)

        // Col 1: Complaint & Docket
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('COMPLAINT REFERENCE:', 50, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`#${data.complaintRef}`, 50, startY1 + 18)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('REGULATORY DOCKET:', 50, startY1 + 32)
          .fillColor(brandColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(data.caseNumber, 50, startY1 + 42)

        // Col 2: Product Name & Category
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('COMMODITY NAME:', 200, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(cleanPdfText(data.product.name), 200, startY1 + 18, { width: 160 })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`Category: ${cleanPdfText(data.product.category || 'Packaged Commodity')}`, 200, startY1 + 32)

        // Col 3: Brand & Manufacturer
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('BRAND / MANUFACTURER:', 380, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica')
          .text(cleanPdfText(data.product.brand || '—'), 380, startY1 + 18, { width: 160 })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(cleanPdfText(data.product.manufacturer || '—'), 380, startY1 + 32, { width: 160 })

        doc.y = startY1 + 62

        // ==========================================
        // 3. STATUTORY PACKAGING DECLARATIONS TABLE
        // ==========================================
        drawSectionHeader('Mandatory Statutory Declarations (Physical Packaging)', sectionIndex++)

        const tableTop = doc.y
        doc.rect(40, tableTop, contentWidth, 18).fillAndStroke('#e2e8f0', borderCol)

        doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
        doc.text('MANDATORY DECLARATION', 48, tableTop + 5, { width: 150 })
        doc.text('DECLARED PACKAGING VALUE', 205, tableTop + 5, { width: 220 })
        doc.text('VERIFICATION STATUS', 435, tableTop + 5, { width: 110, align: 'right' })

        doc.y = tableTop + 20

        if (data.declarations.length === 0) {
          doc.fillColor(mutedColor).fontSize(8).font('Helvetica-Oblique').text('No packaging declarations evaluated.', 50, doc.y + 4)
          doc.moveDown(1)
        } else {
          for (const d of data.declarations) {
            if (doc.y > 720) {
              doc.addPage()
              doc.rect(40, doc.y, contentWidth, 18).fillAndStroke('#e2e8f0', borderCol)
              doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
              doc.text('MANDATORY DECLARATION', 48, doc.y + 5, { width: 150 })
              doc.text('DECLARED PACKAGING VALUE', 205, doc.y + 5, { width: 220 })
              doc.text('VERIFICATION STATUS', 435, doc.y + 5, { width: 110, align: 'right' })
              doc.y += 20
            }

            const rowY = doc.y
            const isAlt = data.declarations.indexOf(d) % 2 === 1
            if (isAlt) {
              doc.rect(40, rowY, contentWidth, 18).fill('#f8fafc')
            }

            doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
            doc.text(cleanPdfText(d.label || d.fieldName), 48, rowY + 4, { width: 150 })

            doc.fillColor('#334155').fontSize(8).font('Helvetica')
            doc.text(cleanPdfText(d.declaredValue) || '—', 205, rowY + 4, { width: 220, lineBreak: false })

            const isPresent = d.detectionStatus === 'DETECTED'
            const statusColor = isPresent ? successColor : errorColor
            const statusText = isPresent ? 'DECLARED' : 'NOT DETECTED'

            doc.fillColor(statusColor).fontSize(8).font('Helvetica-Bold')
            doc.text(statusText, 435, rowY + 4, { width: 110, align: 'right' })

            doc.y = rowY + 18
          }
        }

        doc.moveDown(0.5)

        // ==========================================
        // 4. STATUTORY COMPLIANCE EVALUATION (RULES)
        // ==========================================
        drawSectionHeader('Legal Metrology Compliance Evaluation (Statutory Rules)', sectionIndex++)

        doc
          .fillColor(mutedColor)
          .fontSize(7.5)
          .font('Helvetica')
          .text(
            'Evaluated deterministically under the Legal Metrology (Packaged Commodities) Rules, 2011. Historical rule versions locked.',
            44,
            doc.y
          )
        doc.moveDown(0.5)

        for (const check of data.complianceChecks) {
          if (doc.y > 700) doc.addPage()

          const cardY = doc.y
          doc.rect(40, cardY, contentWidth, 32).fillAndStroke('#ffffff', borderCol)

          const statusBg =
            check.status === 'PASS'
              ? successColor
              : check.status === 'FAIL'
              ? errorColor
              : check.status === 'WARNING'
              ? warningColor
              : mutedColor

          // Status bar on left edge
          doc.rect(40, cardY, 4, 32).fill(statusBg)

          // Rule & Historical Version
          doc
            .fillColor(primaryColor)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text(`${check.ruleNumber} (v${check.ruleVersionNumber})`, 50, cardY + 5)

          doc
            .fillColor('#334155')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(cleanPdfText(check.ruleTitle), 160, cardY + 5, { width: 270, lineBreak: false })

          // Status Badge
          doc
            .fillColor(statusBg)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text(check.status, 440, cardY + 5, { align: 'right', width: 105 })

          // Statutory citation & Summary
          doc
            .fillColor(mutedColor)
            .fontSize(7.5)
            .font('Helvetica')
            .text(
              `${cleanPdfText(check.summary)}${check.sourceReference ? ` [${check.sourceReference}]` : ''}`,
              50,
              cardY + 18,
              { width: 495, lineBreak: false }
            )

          doc.y = cardY + 36
        }

        doc.moveDown(0.5)

        // ==========================================
        // 5. STATUTORY VIOLATIONS (IF ANY)
        // ==========================================
        drawSectionHeader('Statutory Violations & Corrective Directives', sectionIndex++)

        if (data.violations.length === 0) {
          doc
            .fillColor(successColor)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text('✓ ZERO FORMAL STATUTORY VIOLATIONS RECORDED ON PHYSICAL PACKAGING', 50, doc.y)
          doc.moveDown(0.5)
        } else {
          for (const viol of data.violations) {
            if (doc.y > 690) doc.addPage()

            const vCardY = doc.y
            doc.rect(40, vCardY, contentWidth, 36).fillAndStroke('rgba(239, 68, 68, 0.04)', errorColor)

            doc
              .fillColor(errorColor)
              .fontSize(8.5)
              .font('Helvetica-Bold')
              .text(`[${viol.severity}] ${viol.ruleNumber}`, 50, vCardY + 6)

            doc
              .fillColor(primaryColor)
              .fontSize(8)
              .font('Helvetica')
              .text(cleanPdfText(viol.description), 160, vCardY + 6, { width: 385 })

            if (viol.remediationGuidance) {
              doc
                .fillColor(mutedColor)
                .fontSize(7.5)
                .font('Helvetica-Oblique')
                .text(`Statutory Remediation: ${cleanPdfText(viol.remediationGuidance)}`, 50, vCardY + 20, { width: 495 })
            }

            doc.y = vCardY + 40
          }
        }

        doc.moveDown(0.5)

        // ==========================================
        // 6. OFFICIAL AUTHORITY VERDICT
        // ==========================================
        drawSectionHeader('Official Regulatory Determination', sectionIndex++)

        if (doc.y > 640) doc.addPage()

        const decY = doc.y
        doc.rect(40, decY, contentWidth, 68).fillAndStroke(lightBg, borderCol)

        const decColor =
          data.decision.ruling === 'COMPLIANT'
            ? successColor
            : data.decision.ruling === 'NON_COMPLIANT'
            ? errorColor
            : warningColor

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('FINAL AUTHORITY DETERMINATION:', 50, decY + 8)

        doc
          .fillColor(decColor)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(data.decision.ruling, 230, decY + 7)

        doc
          .fillColor(primaryColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`Official Summary: ${cleanPdfText(data.decision.summaryText)}`, 50, decY + 22, {
            width: 320,
            lineBreak: true,
          })

        doc
          .fillColor(mutedColor)
          .fontSize(7.5)
          .font('Helvetica')
          .text(`Concluded On: ${formatDateTime(data.decision.decidedAt)}`, 50, decY + 52)

        // Official Seal & Department Signature Block (Redacted from individual officer contact)
        doc
          .strokeColor('#94a3b8')
          .lineWidth(0.5)
          .moveTo(385, decY + 44)
          .lineTo(540, decY + 44)
          .stroke()

        doc
          .fillColor(primaryColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Authorized Inspecting Officer', 385, decY + 47, { width: 155, align: 'center' })

        doc
          .fillColor(mutedColor)
          .fontSize(7)
          .font('Helvetica')
          .text('Directorate of Legal Metrology', 385, decY + 57, { width: 155, align: 'center' })

        doc.y = decY + 76

        // ==========================================
        // 7. FOOTER ACROSS ALL PAGES
        // ==========================================
        const range = doc.bufferedPageRange()
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i)

          doc.strokeColor(borderCol).lineWidth(0.5).moveTo(40, 792).lineTo(555, 792).stroke()

          doc
            .fillColor(mutedColor)
            .fontSize(7)
            .font('Helvetica')
            .text(
              `Government of India • Directorate of Legal Metrology • Complaint Ref: #${data.complaintRef} • Case: ${data.caseNumber}`,
              40,
              797,
              { width: 380 }
            )

          doc
            .fillColor(primaryColor)
            .fontSize(7)
            .font('Helvetica-Bold')
            .text(`Page ${i + 1} of ${range.count}`, 430, 797, { align: 'right', width: 125 })
        }

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Generates an official Regulatory Determination Order / Certificate PDF.
   */
  async generateRegulatoryOrderPdf(data: ConsumerRegulatoryOrderData): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          bufferPages: true,
          compress: false,
          info: {
            Title: `Regulatory Determination Order - ${data.orderRef}`,
            Author: 'Directorate of Legal Metrology, Government of India',
            Subject: `Official Regulatory Order - Case ${data.caseNumber}`,
            Keywords: 'Legal Metrology, Regulatory Order, Consumer Complaint, VeriQO',
            CreationDate: data.issuedAt,
          },
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', (err) => reject(err))

        const primaryColor = '#0f172a'
        const brandColor = '#1e3a8a' // Deep Navy
        const successColor = '#16a34a'
        const errorColor = '#dc2626'
        const warningColor = '#d97706'
        const mutedColor = '#64748b'
        const borderCol = '#cbd5e1'
        const contentWidth = 515

        // ==========================================
        // 1. FORMAL ORDER CREST & BANNER
        // ==========================================
        // Double border for formal certificate order look
        doc.rect(40, 40, contentWidth, 750).strokeColor('#94a3b8').lineWidth(1.5).stroke()
        doc.rect(44, 44, contentWidth - 8, 742).strokeColor('#cbd5e1').lineWidth(0.5).stroke()

        // Top Order Header
        doc.y = 60
        doc
          .fillColor(brandColor)
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('DIRECTORATE OF LEGAL METROLOGY', 50, doc.y, { align: 'center', width: contentWidth - 20 })

        doc
          .fillColor('#475569')
          .fontSize(9)
          .font('Helvetica')
          .text('DEPARTMENT OF CONSUMER AFFAIRS • GOVERNMENT OF INDIA', 50, doc.y + 2, { align: 'center', width: contentWidth - 20 })

        doc
          .fillColor(primaryColor)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('FORMAL REGULATORY DETERMINATION ORDER', 50, doc.y + 10, { align: 'center', width: contentWidth - 20 })

        doc.moveDown(1)

        // Metadata box
        const metaY = doc.y
        doc.rect(60, metaY, contentWidth - 40, 44).fillAndStroke('#f8fafc', borderCol)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('ORDER REFERENCE:', 70, metaY + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(data.orderRef, 175, metaY + 8)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('REGULATORY DOCKET:', 70, metaY + 22)
          .fillColor(brandColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(data.caseNumber, 175, metaY + 22)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('COMPLAINT REF:', 340, metaY + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`#${data.complaintRef}`, 425, metaY + 8)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('DATE OF ORDER:', 340, metaY + 22)
          .fillColor(primaryColor)
          .fontSize(8.5)
          .font('Helvetica')
          .text(formatDate(data.determination.decidedAt), 425, metaY + 22)

        doc.y = metaY + 54

        // ==========================================
        // 2. SUBJECT & JURISDICTION
        // ==========================================
        doc
          .fillColor(brandColor)
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text('1. IN THE MATTER OF:', 60, doc.y)

        doc.moveDown(0.3)
        const subBoxY = doc.y
        doc.rect(60, subBoxY, contentWidth - 40, 36).fillAndStroke('#ffffff', borderCol)

        doc
          .fillColor(primaryColor)
          .fontSize(8.5)
          .font('Helvetica')
          .text(`Consumer Complaint Subject: "${cleanPdfText(data.complainantSubject)}"`, 70, subBoxY + 7, {
            width: contentWidth - 60,
          })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Packaged Commodity: ${cleanPdfText(data.product.name)} (Brand: ${cleanPdfText(data.product.brand || '—')}, Category: ${cleanPdfText(data.product.category || 'Standard')})`,
            70,
            subBoxY + 20,
            { width: contentWidth - 60 }
          )

        doc.y = subBoxY + 46

        // ==========================================
        // 3. STATUTORY EXAMINATION & FINDINGS
        // ==========================================
        doc
          .fillColor(brandColor)
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text('2. STATUTORY EXAMINATION & STATUTORY FINDINGS:', 60, doc.y)

        doc.moveDown(0.3)
        const findBoxY = doc.y
        doc.rect(60, findBoxY, contentWidth - 40, 52).fillAndStroke('#ffffff', borderCol)

        doc
          .fillColor('#334155')
          .fontSize(8.5)
          .font('Helvetica')
          .text(
            `The physical package declarations and statutory compliance were examined deterministically under the provisions of the ${data.legalAuthority.actTitle} and the ${data.legalAuthority.rulesTitle}.`,
            70,
            findBoxY + 8,
            { width: contentWidth - 60, lineBreak: true }
          )

        doc
          .fillColor(primaryColor)
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text(`Finding Summary: ${cleanPdfText(data.determination.statutorySummary)}`, 70, findBoxY + 26, {
            width: contentWidth - 60,
            lineBreak: true,
          })

        doc.y = findBoxY + 62

        // ==========================================
        // 4. REGULATORY DETERMINATION & RULING
        // ==========================================
        doc
          .fillColor(brandColor)
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text('3. REGULATORY DETERMINATION & ORDER:', 60, doc.y)

        doc.moveDown(0.3)
        const orderCardY = doc.y
        const rulingColor =
          data.determination.ruling === 'COMPLIANT'
            ? successColor
            : data.determination.ruling === 'NON_COMPLIANT'
            ? errorColor
            : warningColor

        doc.rect(60, orderCardY, contentWidth - 40, 54).fillAndStroke('#f8fafc', rulingColor)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('AUTHORITATIVE RULING:', 70, orderCardY + 8)

        doc
          .fillColor(rulingColor)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(data.determination.rulingTitle.toUpperCase(), 70, orderCardY + 20)

        doc
          .fillColor(primaryColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`Statutory Case Status: Concluded and Formally Closed on ${formatDate(data.determination.decidedAt)}.`, 70, orderCardY + 36)

        doc.y = orderCardY + 64

        // Directives list
        if (data.statutoryDirectives && data.statutoryDirectives.length > 0) {
          doc
            .fillColor(brandColor)
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .text('4. DIRECTIVES & ENFORCEMENT RECORD:', 60, doc.y)

          doc.moveDown(0.3)
          for (const dir of data.statutoryDirectives) {
            doc
              .fillColor(primaryColor)
              .fontSize(8)
              .font('Helvetica')
              .text(`• ${cleanPdfText(dir)}`, 70, doc.y, { width: contentWidth - 60 })
            doc.moveDown(0.3)
          }
          doc.moveDown(0.5)
        }

        // ==========================================
        // 5. OFFICIAL SIGNATURE & SEAL
        // ==========================================
        const sigY = 640
        doc.rect(60, sigY, contentWidth - 40, 95).fillAndStroke('#ffffff', borderCol)

        doc
          .fillColor(mutedColor)
          .fontSize(7.5)
          .font('Helvetica')
          .text(
            'This is a digitally certified official determination order issued pursuant to the Legal Metrology Act, 2009. The authenticity and integrity of this document is sealed by the cryptographic SHA-256 verification hash below.',
            70,
            sigY + 8,
            { width: contentWidth - 60 }
          )

        doc
          .fillColor(brandColor)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(`DOCUMENT SHA-256 VERIFICATION HASH: ${data.securityHash}`, 70, sigY + 28, { width: contentWidth - 60 })

        // Right side: Official Seal Block
        doc
          .strokeColor('#94a3b8')
          .lineWidth(0.5)
          .moveTo(340, sigY + 70)
          .lineTo(515, sigY + 70)
          .stroke()

        doc
          .fillColor(primaryColor)
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text('Directorate of Legal Metrology', 340, sigY + 74, { width: 175, align: 'center' })

        doc
          .fillColor(mutedColor)
          .fontSize(7)
          .font('Helvetica')
          .text('Department of Consumer Affairs, Govt. of India', 340, sigY + 84, { width: 175, align: 'center' })

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }
}

export const defaultConsumerPdfService = new ConsumerPdfService()
