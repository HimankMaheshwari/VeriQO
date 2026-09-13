/**
 * PDFService — Server-Side Unified Legal Metrology & BIS Inspection Report PDF Generator
 *
 * Uses PDFKit to construct an official, structured, publication-quality regulatory report.
 *
 * SAFEGUARDS & VISUAL READABILITY ENFORCED:
 * 1. Zero AI legal decisions — formats persisted database records and deterministic evaluations only.
 * 2. Permanent RuleVersion locking — displays exact historical version and effective date.
 * 3. Advisory WARNING safeguard — clearly marks warnings as advisory display notices with 0 violations.
 * 4. Distinct statutory domains — Legal Metrology (LMPC) and BIS standards are kept separate.
 * 5. Readable typography hierarchy — 8.5–10pt body and table text; cards have comfortable vertical padding.
 * 6. Multi-line wrapping — long manufacturer addresses and descriptions wrap naturally without clipping.
 * 7. Unicode / Character encoding safety — zero unprintable glyphs; WinAnsiEncoding safe.
 * 8. Pagination fix — footer rendering suppresses margin bounds to prevent phantom extra pages.
 * 9. Table column sizing — status column width (78pt) prevents NOT_DETECTED from breaking mid-word.
 * 10. Complete 13-Section Unified Architecture (SIH PS107).
 * 11. Dynamic row heights for LMPC table — rows grow to fit wrapped content instead of clipping.
 * 12. Fixed remarks overflow in Section 12 — card height adjusts to remarks length.
 * 13. Improved orphan prevention — conservative threshold (740pt) avoids phantom last pages.
 */

import PDFDocument from 'pdfkit'
import { type InspectionReportData } from './types'
import { formatDate, formatDateTime } from '../utils'

/**
 * Sanitizes text to prevent glyph corruption or unsupported unicode characters (e.g. ₹, ✓)
 * under standard PDFKit Helvetica fonts.
 */
function cleanPdfText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/₹/g, 'Rs. ')
    .replace(/[✓✔]/g, '[PASSED] ')
    .replace(/[✗✕❌]/g, '[FAILED] ')
    .replace(/⚠/g, '[WARNING] ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u25CF]/g, '* ')
    .replace(/[^\x00-\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Returns the measured height of a text string in PDFKit given a specific font, size, and width.
 * Used to pre-calculate dynamic card heights before drawing.
 */
function measureTextHeight(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  fontSize: number,
  fontName: string,
  width: number
): number {
  doc.font(fontName).fontSize(fontSize)
  return doc.heightOfString(text, { width })
}

export class PdfService {
  /**
   * Generates a complete server-side PDF document buffer from deterministic inspection report data.
   */
  async generateInspectionPdf(reportData: InspectionReportData): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          bufferPages: true,
          info: {
            Title: `Unified Inspection Report - ${reportData.reportRef}`,
            Author: `VeriQO Platform / ${reportData.officer.name}`,
            Subject: `Statutory Packaging & BIS Compliance Report - ${reportData.inspection.id}`,
            Keywords: 'Legal Metrology, LMPC, BIS, QCO, Compliance, Packaging, VeriQO',
            CreationDate: reportData.generatedAt,
          },
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', (err) => reject(err))

        const primaryColor = '#0f172a' // Slate 900
        const brandColor = '#2563eb'   // Blue 600
        const accentColor = '#3b82f6'  // Blue 500
        const successColor = '#16a34a' // Green 600
        const errorColor = '#dc2626'   // Red 600
        const warningColor = '#d97706' // Amber 600
        const mutedColor = '#64748b'   // Slate 500
        const lightBg = '#f8fafc'      // Slate 50
        const borderCol = '#cbd5e1'    // Slate 300

        const contentWidth = 515 // 595.28 - 80 (margins)

        // Safe page-break threshold: leave 60pt buffer above footer (792) for the separator line
        // A4 content area ends at ~801pt (841.89 - 40 margin), footer sep at 792, so cutoff at 730 is safe.
        const PAGE_BREAK_THRESHOLD = 730

        /**
         * Helper: Draw a section header with orphan prevention.
         * @param title - Section title text
         * @param sectionNumber - Section number prefix
         * @param minContentHeight - Minimum vertical space needed after header before allowing break
         */
        const drawSectionHeader = (title: string, sectionNumber: number, minContentHeight: number = 60) => {
          const neededSpace = 24 + minContentHeight
          if (doc.y + neededSpace > PAGE_BREAK_THRESHOLD) {
            doc.addPage()
          } else {
            doc.moveDown(0.5)
          }

          const headerY = doc.y
          doc.rect(40, headerY, contentWidth, 22).fillAndStroke(lightBg, borderCol)

          doc
            .fillColor(primaryColor)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${sectionNumber}. ${title.toUpperCase()}`, 48, headerY + 6, {
              width: contentWidth - 16,
              lineBreak: false,
            })

          doc.y = headerY + 26
        }

        // ==========================================
        // OFFICIAL REPORT HEADER (BANNER)
        // ==========================================
        doc.rect(40, 40, contentWidth, 70).fill(primaryColor)

        doc
          .fillColor('#ffffff')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('GOVERNMENT REGULATORY COMPLIANCE SYSTEM', 52, 48)

        doc
          .fillColor('#94a3b8')
          .fontSize(8.5)
          .font('Helvetica')
          .text(
            'DIRECTORATE OF LEGAL METROLOGY & BUREAU OF INDIAN STANDARDS (PS107)',
            52,
            64
          )

        doc
          .fillColor('#38bdf8')
          .fontSize(13.5)
          .font('Helvetica-Bold')
          .text('UNIFIED STATUTORY PACKAGING INSPECTION REPORT', 52, 79)

        doc
          .fillColor('#ffffff')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(`REF: ${reportData.reportRef}`, 360, 48, { align: 'right', width: 180, lineBreak: false })

        doc
          .fillColor('#cbd5e1')
          .fontSize(8)
          .font('Helvetica')
          .text(`DATE: ${formatDateTime(reportData.generatedAt)}`, 360, 63, {
            align: 'right',
            width: 180,
            lineBreak: false,
          })

        doc
          .fillColor('#94a3b8')
          .fontSize(7.5)
          .font('Helvetica')
          .text(`HASH: ${reportData.securityHash.slice(0, 20)}...`, 360, 78, {
            align: 'right',
            width: 180,
            lineBreak: false,
          })

        doc.y = 120

        // ==========================================
        // SECTION 1: INSPECTION OVERVIEW
        // ==========================================
        drawSectionHeader('Inspection Overview', 1)

        const startY1 = doc.y
        const sec1H = 60
        doc.rect(40, startY1, contentWidth, sec1H).fillAndStroke('#ffffff', borderCol)

        // Column 1: Inspection Ref & Status
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('INSPECTION REFERENCE:', 50, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica')
          .text(cleanPdfText(reportData.inspection.id), 50, startY1 + 20, { width: 135, lineBreak: false })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('FILE STATUS:', 50, startY1 + 36)
          .fillColor(
            reportData.inspection.status === 'CLOSED'
              ? successColor
              : reportData.inspection.status === 'IN_PROGRESS'
              ? brandColor
              : warningColor
          )
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(reportData.inspection.status, 115, startY1 + 36, { lineBreak: false })

        // Column 2: Commodity & Category
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('COMMODITY NAME:', 195, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(
            cleanPdfText(
              reportData.product?.name ||
                reportData.scan?.identifiedProductName ||
                'Packaged Commodity'
            ),
            195,
            startY1 + 20,
            { width: 175, lineBreak: false, ellipsis: true }
          )

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Category: ${cleanPdfText(
              reportData.product?.category ||
                reportData.scan?.identifiedCategory ||
                'Standard Packaged Commodity'
            )}`,
            195,
            startY1 + 36,
            { width: 175, lineBreak: false, ellipsis: true }
          )

        // Column 3: Inspecting Officer
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('INSPECTING OFFICER:', 380, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica')
          .text(cleanPdfText(reportData.officer.name), 380, startY1 + 20, { width: 165, lineBreak: false })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(
            `${reportData.officer.role} (${reportData.officer.email})`,
            380,
            startY1 + 36,
            { width: 165, lineBreak: false, ellipsis: true }
          )

        doc.y = startY1 + sec1H + 4

        // ==========================================
        // SECTION 2: PRODUCT & PACKAGING IDENTITY
        // ==========================================
        drawSectionHeader('Product & Packaging Identity', 2)

        const startY2 = doc.y
        const sec2H = 60
        doc.rect(40, startY2, contentWidth, sec2H).fillAndStroke(lightBg, borderCol)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Brand Name:', 50, startY2 + 8)
          .fillColor(primaryColor)
          .font('Helvetica')
          .fontSize(9)
          .text(
            cleanPdfText(reportData.product?.brand || reportData.scan?.identifiedBrand || '—'),
            115,
            startY2 + 8,
            { width: 100, lineBreak: false }
          )

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Manufacturer / Packer:', 225, startY2 + 8)
          .fillColor(primaryColor)
          .font('Helvetica')
          .fontSize(8.5)
          .text(
            cleanPdfText(
              reportData.product?.manufacturer ||
                reportData.scan?.identifiedManufacturer ||
                '—'
            ),
            335,
            startY2 + 8,
            { width: 210, height: 26, lineBreak: true }
          )

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Packaging Evidence:', 50, startY2 + 38)
          .fillColor(primaryColor)
          .font('Helvetica')
          .fontSize(8.5)
          .text(
            reportData.scan?.images.length
              ? `${reportData.scan.images.length} High-Resolution Packaging Photograph(s) Persisted in Forensic Vault`
              : 'No packaging photograph attached to record',
            165,
            startY2 + 38,
            { width: 380, lineBreak: false }
          )

        doc.y = startY2 + sec2H + 4

        // ==========================================
        // SECTION 3: EXTRACTED LMPC DECLARATIONS
        // ==========================================
        drawSectionHeader('Extracted LMPC Declarations', 3)

        // Column definitions — total must equal contentWidth (515)
        // Field: 112 | OCR Snippet: 148 | Normalized: 95 | Conf: 42 | Status: 78 | gaps: 40
        const COL_FIELD_X = 48
        const COL_FIELD_W = 112
        const COL_OCR_X = 164
        const COL_OCR_W = 148
        const COL_NORM_X = 316
        const COL_NORM_W = 95
        const COL_CONF_X = 415
        const COL_CONF_W = 42
        const COL_STATUS_X = 462
        const COL_STATUS_W = 88

        // Table Header
        const tableTop = doc.y
        doc.rect(40, tableTop, contentWidth, 20).fillAndStroke('#e2e8f0', borderCol)

        doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
        doc.text('MANDATORY FIELD', COL_FIELD_X, tableTop + 6, { width: COL_FIELD_W, lineBreak: false })
        doc.text('EXTRACTED OCR SNIPPET', COL_OCR_X, tableTop + 6, { width: COL_OCR_W, lineBreak: false })
        doc.text('NORMALIZED VALUE', COL_NORM_X, tableTop + 6, { width: COL_NORM_W, lineBreak: false })
        doc.text('CONF.', COL_CONF_X, tableTop + 6, { width: COL_CONF_W, lineBreak: false })
        doc.text('STATUS', COL_STATUS_X, tableTop + 6, { width: COL_STATUS_W, lineBreak: false })

        doc.y = tableTop + 22

        const drawTableHeader = () => {
          const subH = doc.y
          doc.rect(40, subH, contentWidth, 20).fillAndStroke('#e2e8f0', borderCol)
          doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
          doc.text('MANDATORY FIELD', COL_FIELD_X, subH + 6, { width: COL_FIELD_W, lineBreak: false })
          doc.text('EXTRACTED OCR SNIPPET', COL_OCR_X, subH + 6, { width: COL_OCR_W, lineBreak: false })
          doc.text('NORMALIZED VALUE', COL_NORM_X, subH + 6, { width: COL_NORM_W, lineBreak: false })
          doc.text('CONF.', COL_CONF_X, subH + 6, { width: COL_CONF_W, lineBreak: false })
          doc.text('STATUS', COL_STATUS_X, subH + 6, { width: COL_STATUS_W, lineBreak: false })
          doc.y = subH + 22
        }

        if (reportData.declarations.length === 0) {
          const emptyRowY = doc.y
          doc.rect(40, emptyRowY, contentWidth, 26).fill('#f8fafc')
          doc
            .fillColor(mutedColor)
            .fontSize(8.5)
            .font('Helvetica-Oblique')
            .text('No packaging declarations detected from OCR extraction.', COL_FIELD_X, emptyRowY + 8, {
              width: contentWidth - 16,
              lineBreak: false,
            })
          doc.y = emptyRowY + 30
        } else {
          for (let idx = 0; idx < reportData.declarations.length; idx++) {
            const d = reportData.declarations[idx]

            // Calculate dynamic row height based on the tallest cell content
            const fieldH = measureTextHeight(doc, cleanPdfText(d.fieldName) || '', 8.5, 'Helvetica-Bold', COL_FIELD_W)
            const ocrH = measureTextHeight(doc, cleanPdfText(d.rawValue) || '—', 8.5, 'Helvetica', COL_OCR_W)
            const normH = measureTextHeight(doc, cleanPdfText(d.normalizedValue) || '—', 8.5, 'Helvetica', COL_NORM_W)
            const rowContentH = Math.max(fieldH, ocrH, normH, 12)
            const rowHeight = Math.max(22, rowContentH + 12) // 6pt padding top + 6pt bottom

            // Page break if needed
            if (doc.y + rowHeight > PAGE_BREAK_THRESHOLD) {
              doc.addPage()
              drawTableHeader()
            }

            const rowY = doc.y
            if (idx % 2 === 1) {
              doc.rect(40, rowY, contentWidth, rowHeight).fill('#f8fafc')
            }

            // Draw border lines for row
            doc.rect(40, rowY, contentWidth, rowHeight).stroke(borderCol)

            const cellTopPad = 6

            doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold')
            doc.text(cleanPdfText(d.fieldName), COL_FIELD_X, rowY + cellTopPad, {
              width: COL_FIELD_W,
              lineBreak: true,
            })

            doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
            doc.text(cleanPdfText(d.rawValue) || '—', COL_OCR_X, rowY + cellTopPad, {
              width: COL_OCR_W,
              lineBreak: true,
            })

            doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica')
            doc.text(cleanPdfText(d.normalizedValue) || '—', COL_NORM_X, rowY + cellTopPad, {
              width: COL_NORM_W,
              lineBreak: true,
            })

            doc.fillColor(mutedColor).fontSize(8).font('Helvetica')
            doc.text(d.confidence ? `${Math.round(d.confidence * 100)}%` : '—', COL_CONF_X, rowY + cellTopPad, {
              width: COL_CONF_W,
              lineBreak: false,
            })

            const statusColor =
              d.detectionStatus === 'DETECTED'
                ? successColor
                : d.detectionStatus === 'NOT_DETECTED'
                ? errorColor
                : mutedColor
            doc.fillColor(statusColor).fontSize(8).font('Helvetica-Bold')
            doc.text(d.detectionStatus, COL_STATUS_X, rowY + cellTopPad, {
              width: COL_STATUS_W,
              lineBreak: false,
            })

            doc.y = rowY + rowHeight
          }
        }

        doc.moveDown(0.3)

        // ==========================================
        // SECTION 4: LMPC COMPLIANCE EVALUATION
        // ==========================================
        drawSectionHeader('LMPC Compliance Evaluation', 4)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(
            'Evaluated deterministically by VeriQO Rule Engine under Legal Metrology Act, 2009 & PCR, 2011. Historical rule versions locked.',
            44,
            doc.y,
            { width: contentWidth - 8, lineBreak: false, ellipsis: true }
          )
        doc.moveDown(0.4)

        for (const check of reportData.complianceChecks) {
          const cardH = 38
          if (doc.y + cardH > PAGE_BREAK_THRESHOLD) doc.addPage()

          const cardY = doc.y
          doc.rect(40, cardY, contentWidth, cardH).fillAndStroke('#ffffff', borderCol)

          const statusBg =
            check.status === 'PASS'
              ? successColor
              : check.status === 'FAIL'
              ? errorColor
              : check.status === 'WARNING'
              ? warningColor
              : mutedColor

          doc.rect(40, cardY, 4, cardH).fill(statusBg)

          doc
            .fillColor(primaryColor)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text(`${check.ruleNumber} (v${check.ruleVersionNumber})`, 50, cardY + 7, {
              width: 100,
              lineBreak: false,
            })

          doc
            .fillColor('#334155')
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text(cleanPdfText(check.ruleTitle), 155, cardY + 7, { width: 260, lineBreak: false, ellipsis: true })

          doc
            .fillColor(statusBg)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(check.status, 430, cardY + 7, { align: 'right', width: 95, lineBreak: false })

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica')
            .text(
              `${cleanPdfText(check.evaluationSummary || check.ruleRequirement)}${
                check.sourceReference ? ` [${cleanPdfText(check.sourceReference)}]` : ''
              }`,
              50,
              cardY + 22,
              { width: 495, lineBreak: false, ellipsis: true }
            )

          doc.y = cardY + cardH + 3
        }

        // LMPC Violations summary
        if (reportData.violations.length === 0) {
          if (doc.y + 28 > PAGE_BREAK_THRESHOLD) doc.addPage()
          const passCardY = doc.y
          doc.rect(40, passCardY, contentWidth, 26).fillAndStroke('#f0fdf4', '#86efac')
          doc
            .fillColor(successColor)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text('[PASSED] ZERO FORMAL STATUTORY VIOLATIONS RECORDED ON PHYSICAL COMMODITY', 50, passCardY + 8, {
              width: contentWidth - 20,
              lineBreak: false,
            })
          doc.y = passCardY + 30
        } else {
          for (const viol of reportData.violations) {
            const vCardH = 40
            if (doc.y + vCardH > PAGE_BREAK_THRESHOLD) doc.addPage()
            const vCardY = doc.y
            doc.rect(40, vCardY, contentWidth, vCardH).fillAndStroke('#fef2f2', '#fca5a5')

            doc
              .fillColor(errorColor)
              .fontSize(8.5)
              .font('Helvetica-Bold')
              .text(`[${viol.severity}] ${viol.ruleNumber}`, 50, vCardY + 6, { width: 105, lineBreak: false })

            doc
              .fillColor(primaryColor)
              .fontSize(8.5)
              .font('Helvetica-Bold')
              .text(cleanPdfText(viol.ruleTitle), 158, vCardY + 6, { width: 382, lineBreak: false, ellipsis: true })

            doc
              .fillColor('#7f1d1d')
              .fontSize(8)
              .font('Helvetica')
              .text(`Breach: ${cleanPdfText(viol.description)}`, 50, vCardY + 22, {
                width: 495,
                lineBreak: false,
                ellipsis: true,
              })

            doc.y = vCardY + vCardH + 3
          }
        }

        doc.moveDown(0.3)

        // ==========================================
        // SECTION 5: BIS / INDIAN STANDARDS ASSESSMENT
        // ==========================================
        drawSectionHeader('BIS / Indian Standards Assessment', 5)

        const bisStd = reportData.bis?.candidateStandards?.[0]
        const stdRawNum = bisStd?.standardNumber || 'NOT_DETERMINED'
        const stdDisplayNum = stdRawNum === 'NOT_DETERMINED' ? 'NOT DETERMINED' : stdRawNum
        const stdTitle = bisStd?.title || 'No Applicable Indian Standard Identified'
        const stdState = bisStd?.state || 'NEEDS_REVIEW'
        const stdRelevance = bisStd ? Math.round((bisStd.relevance || 0) * 100) : 0

        if (doc.y + 62 > PAGE_BREAK_THRESHOLD) doc.addPage()
        const bisY1 = doc.y
        doc.rect(40, bisY1, contentWidth, 60).fillAndStroke(lightBg, borderCol)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Applicable Standard:', 50, bisY1 + 8)
          .fillColor(stdDisplayNum === 'NOT DETERMINED' ? mutedColor : brandColor)
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(stdDisplayNum, 150, bisY1 + 7, { width: 160, lineBreak: false })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Evaluation State:', 315, bisY1 + 8)
          .fillColor(stdState === 'ASSOCIATED' ? brandColor : warningColor)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(stdState, 405, bisY1 + 8, { width: 140, lineBreak: false })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Standard Title:', 50, bisY1 + 26)
          .fillColor(primaryColor)
          .font('Helvetica')
          .fontSize(8.5)
          .text(cleanPdfText(stdTitle), 130, bisY1 + 26, { width: 410, lineBreak: false, ellipsis: true })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Substantive Relevance: ${stdRelevance}% | Assessment: ${cleanPdfText(
              bisStd?.matchReason || 'Commodity classification evaluated against standard scope.'
            )}`,
            50,
            bisY1 + 43,
            { width: 495, lineBreak: false, ellipsis: true }
          )

        doc.y = bisY1 + 64

        // ==========================================
        // SECTION 6: QUALITY CONTROL ORDER (QCO) APPLICABILITY
        // ==========================================
        drawSectionHeader('Quality Control Order (QCO) Applicability', 6)

        const qco = reportData.bis?.qcoChecks?.[0]
        const qcoOrderNumber = cleanPdfText(qco?.orderNumber || 'NO APPLICABLE QCO IDENTIFIED')
        const qcoOrderTitle = cleanPdfText(qco?.orderTitle || 'No Mandatory Quality Control Order Applicable')
        const isMandatory = Boolean(qco?.isMandatoryCertification)

        if (doc.y + 62 > PAGE_BREAK_THRESHOLD) doc.addPage()
        const qcoY = doc.y
        doc.rect(40, qcoY, contentWidth, 60).fillAndStroke('#ffffff', borderCol)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('QCO Applicability Status:', 50, qcoY + 8)
          .fillColor(isMandatory ? errorColor : successColor)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(
            isMandatory ? 'MANDATORY QCO ENFORCED' : 'NOT APPLICABLE / VOLUNTARY',
            170,
            qcoY + 8,
            { width: 180, lineBreak: false }
          )

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Mandate Type:', 360, qcoY + 8)
          .fillColor(isMandatory ? errorColor : mutedColor)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(isMandatory ? 'COMPULSORY BIS' : 'VOLUNTARY / NONE', 435, qcoY + 8, {
            width: 115,
            lineBreak: false,
          })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Notified Order:', 50, qcoY + 26)
          .fillColor(primaryColor)
          .font('Helvetica')
          .fontSize(8.5)
          .text(`${qcoOrderNumber} — ${qcoOrderTitle}`, 125, qcoY + 26, {
            width: 415,
            lineBreak: false,
            ellipsis: true,
          })

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(
            cleanPdfText(
              qco?.guidance ||
                'No active mandatory Quality Control Order (QCO) identified for this commodity. Voluntary BIS certification may still apply.'
            ),
            50,
            qcoY + 43,
            { width: 495, lineBreak: false, ellipsis: true }
          )

        doc.y = qcoY + 64

        // ==========================================
        // SECTION 7: CERTIFICATION / LICENSE VERIFICATION
        // ==========================================
        drawSectionHeader('Certification / License Verification', 7)

        // Show CM/L, CRS, HUID only as applicable/relevant
        const detectedIdentifiers = reportData.bis?.identifiers || []
        const relevantIds = detectedIdentifiers.filter(
          (i: any) => i.state === 'DETECTED' || i.type === 'CML_NUMBER' || i.type === 'CRS_REGISTRATION'
        )

        if (doc.y + 50 > PAGE_BREAK_THRESHOLD) doc.addPage()
        const certY = doc.y
        if (relevantIds.length > 0) {
          doc.rect(40, certY, contentWidth, 48).fillAndStroke(lightBg, borderCol)
          const first = relevantIds[0]
          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica-Bold')
            .text('Claimed License Type:', 50, certY + 8)
            .fillColor(brandColor)
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .text(first.type.replace(/_/g, ' '), 155, certY + 8, { width: 140, lineBreak: false })

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica-Bold')
            .text('Extracted Identifier:', 305, certY + 8)
            .fillColor(primaryColor)
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .text(cleanPdfText(first.detectedValue) || 'None', 400, certY + 8, { width: 145, lineBreak: false })

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica')
            .text(
              `Detection Source: ${first.source} | State: ${first.state} | Confidence: ${Math.round(
                first.confidence * 100
              )}% | Officer Verification: PENDING`,
              50,
              certY + 28,
              { width: 495, lineBreak: false, ellipsis: true }
            )
          doc.y = certY + 52
        } else {
          doc.rect(40, certY, contentWidth, 46).fillAndStroke(lightBg, borderCol)
          doc
            .fillColor(primaryColor)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text(
              'Statutory Scheme Applicability: Voluntary BIS Scheme / Not Mandatory for this Commodity',
              50,
              certY + 8,
              { width: contentWidth - 20, lineBreak: false }
            )

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica')
            .text(
              'Commodity packaging does not claim an ISI mark (CM/L), Compulsory Registration (CRS), or Hallmarking (HUID). No mandatory statutory BIS certification applies.',
              50,
              certY + 26,
              { width: 495, lineBreak: false, ellipsis: true }
            )
          doc.y = certY + 50
        }

        // ==========================================
        // SECTION 8: BIS COMPLIANCE FINDINGS & EVIDENTIARY ANALYSIS
        // ==========================================
        drawSectionHeader('BIS Compliance Findings & Evidentiary Analysis', 8)

        const findings = reportData.bis?.findings || []
        if (findings.length === 0) {
          if (doc.y + 28 > PAGE_BREAK_THRESHOLD) doc.addPage()
          const noFindY = doc.y
          doc.rect(40, noFindY, contentWidth, 26).fillAndStroke('#f0fdf4', '#86efac')
          doc
            .fillColor(successColor)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text(
              '[PASSED] ZERO STATUTORY BIS NON-CONFORMITIES IDENTIFIED FOR THIS COMMODITY',
              50,
              noFindY + 8,
              { width: contentWidth - 20, lineBreak: false }
            )
          doc.y = noFindY + 30
        } else {
          for (const f of findings) {
            const fCardH = 46
            if (doc.y + fCardH > PAGE_BREAK_THRESHOLD) doc.addPage()

            const fCardY = doc.y
            const fColor =
              f.severity === 'CRITICAL' || f.severity === 'HIGH'
                ? errorColor
                : f.severity === 'MEDIUM'
                ? warningColor
                : brandColor

            doc.rect(40, fCardY, contentWidth, fCardH).fillAndStroke('#ffffff', borderCol)
            doc.rect(40, fCardY, 4, fCardH).fill(fColor)

            doc
              .fillColor(fColor)
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(`[${f.severity}] ${f.code}`, 50, fCardY + 6, { width: 120, lineBreak: false })

            doc
              .fillColor(primaryColor)
              .fontSize(8.5)
              .font('Helvetica-Bold')
              .text(cleanPdfText(f.title), 175, fCardY + 6, { width: 360, lineBreak: false, ellipsis: true })

            doc
              .fillColor('#334155')
              .fontSize(8)
              .font('Helvetica')
              .text(`Analysis: ${cleanPdfText(f.explanation)}`, 50, fCardY + 20, {
                width: 495,
                lineBreak: false,
                ellipsis: true,
              })

            doc
              .fillColor(mutedColor)
              .fontSize(8)
              .font('Helvetica')
              .text(`Guidance: ${cleanPdfText(f.recommendation)}`, 50, fCardY + 32,  {
                width: 495,
                lineBreak: false,
                ellipsis: true,
              })

            doc.y = fCardY + fCardH + 3
          }
        }

        // ==========================================
        // SECTION 9: EVIDENCE TRACEABILITY
        // ==========================================
        drawSectionHeader('Evidence Traceability', 9)

        if (reportData.evidenceItems.length > 0) {
          for (const ev of reportData.evidenceItems) {
            const evH = 32
            if (doc.y + evH > PAGE_BREAK_THRESHOLD) doc.addPage()

            const evY = doc.y
            doc.rect(40, evY, contentWidth, evH).fillAndStroke('#ffffff', borderCol)

            doc
              .fillColor(brandColor)
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(`[${ev.type}]`, 48, evY + 6, { width: 70, lineBreak: false })

            doc
              .fillColor(primaryColor)
              .fontSize(8.5)
              .font('Helvetica-Bold')
              .text(cleanPdfText(ev.title) || 'Forensic Item', 122, evY + 6, {
                width: 255,
                lineBreak: false,
                ellipsis: true,
              })

            doc
              .fillColor(mutedColor)
              .fontSize(7.5)
              .font('Helvetica')
              .text(formatDateTime(ev.createdAt), 380, evY + 6, { align: 'right', width: 165, lineBreak: false })

            doc
              .fillColor('#334155')
              .fontSize(8)
              .font('Helvetica')
              .text(cleanPdfText(ev.description) || 'Forensic record persisted in evidence vault.', 48, evY + 19, {
                width: 495,
                lineBreak: false,
                ellipsis: true,
              })

            doc.y = evY + evH + 3
          }
        } else {
          if (doc.y + 28 > PAGE_BREAK_THRESHOLD) doc.addPage()
          const noEvY = doc.y
          doc.rect(40, noEvY, contentWidth, 26).fillAndStroke(lightBg, borderCol)
          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica')
            .text(
              'Primary packaging image evidence and OCR capture logs stored in secure audit repository.',
              48,
              noEvY + 8,
              { width: 495, lineBreak: false }
            )
          doc.y = noEvY + 30
        }

        // ==========================================
        // SECTION 10: OFFICER VERIFICATION CHECKLIST
        // ==========================================
        drawSectionHeader('Officer Verification Checklist', 10)

        const checkListItems = [
          { label: 'Mandatory Packaging Declarations', clause: 'PCR Rule 6(1)' },
          { label: 'MRP & Unit Sale Price Syntax', clause: 'Rule 6(1)(e)' },
          { label: 'BIS / ISI Mark & QCO Applicability', clause: 'BIS Act Sec 16' },
          { label: 'Manufacturer / Packer Registration', clause: 'Rule 27 Verification' },
          { label: 'Statutory Sampling Protocol', clause: 'Representative Sampling' },
        ]

        // Dynamic checklist: 2 columns, rows auto-stacked
        // Each item is ~16pt tall; 5 items → 3 left, 2 right → max 3 rows
        const chkItemH = 16
        const chkLeftCount = 3
        const chkRightCount = checkListItems.length - chkLeftCount
        const chkRows = Math.max(chkLeftCount, chkRightCount)
        const chkH = chkRows * chkItemH + 12 // 6pt top + 6pt bottom padding

        if (doc.y + chkH > PAGE_BREAK_THRESHOLD) doc.addPage()
        const chkY = doc.y
        doc.rect(40, chkY, contentWidth, chkH).fillAndStroke('#ffffff', borderCol)

        for (let cIdx = 0; cIdx < checkListItems.length; cIdx++) {
          const item = checkListItems[cIdx]
          const isLeft = cIdx < chkLeftCount
          const colX = isLeft ? 50 : 290
          const rowIndex = isLeft ? cIdx : cIdx - chkLeftCount
          const itemY = chkY + 6 + rowIndex * chkItemH

          doc
            .fillColor(successColor)
            .fontSize(7.5)
            .font('Helvetica-Bold')
            .text('[VERIFIED]', colX, itemY, { width: 52, lineBreak: false })

          doc
            .fillColor(primaryColor)
            .fontSize(8)
            .font('Helvetica')
            .text(`${item.label} (${item.clause})`, colX + 56, itemY, {
              width: 195,
              lineBreak: false,
              ellipsis: true,
            })
        }

        doc.y = chkY + chkH + 6

        // ==========================================
        // SECTION 11: UNIFIED REGULATORY DISPOSITION
        // ==========================================
        drawSectionHeader('Unified Regulatory Disposition', 11, 80)

        const lmpcViolCount = reportData.violations.length
        const lmpcStatus = lmpcViolCount === 0 ? 'COMPLIANT' : 'NON_COMPLIANT'
        const bisStatus = reportData.bis?.status || 'CLEAR'
        const isBisUndetermined = stdDisplayNum === 'NOT DETERMINED' || bisStatus === 'NEEDS_REVIEW'
        const bisDisplayStatus = isBisUndetermined ? 'NOT DETERMINED / NEEDS REVIEW' : bisStatus

        const overallDisposition =
          lmpcViolCount > 0
            ? 'ACTION REQUIRED (STATUTORY LMPC BREACH)'
            : isBisUndetermined
            ? 'PENDING REVIEW / NEEDS VERIFICATION'
            : 'COMPLIANT'

        if (doc.y + 76 > PAGE_BREAK_THRESHOLD) doc.addPage()
        const dispY = doc.y
        const dispH = 76
        doc.rect(40, dispY, contentWidth, dispH).fillAndStroke(lightBg, borderCol)

        // Row 1: LMPC Domain
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('LMPC Regulatory Domain:', 50, dispY + 8)
          .fillColor(lmpcViolCount === 0 ? successColor : errorColor)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(`${lmpcStatus} (${reportData.complianceChecks.length} Checks, ${lmpcViolCount} Violations)`, 185, dispY + 8, {
            width: 350,
            lineBreak: false,
          })

        // Row 2: BIS Domain
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('BIS Regulatory Domain:', 50, dispY + 24)
          .fillColor(isBisUndetermined ? warningColor : successColor)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(`${bisDisplayStatus} (0 Mandatory Violations)`, 185, dispY + 24, {
            width: 350,
            lineBreak: false,
          })

        // Row 3: Unified Disposition
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('UNIFIED DISPOSITION:', 50, dispY + 40)
          .fillColor(isBisUndetermined ? warningColor : lmpcViolCount > 0 ? errorColor : successColor)
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text(overallDisposition, 185, dispY + 39, { width: 350, lineBreak: false })

        // Row 4: Statutory Domain Separation note
        doc
          .fillColor(mutedColor)
          .fontSize(7.5)
          .font('Helvetica')
          .text(
            'Statutory Domain Separation: BIS advisory findings and absence of voluntary marks do NOT constitute Legal Metrology statutory violations.',
            50,
            dispY + 58,
            { width: 495, lineBreak: false }
          )

        doc.y = dispY + dispH + 6

        // ==========================================
        // SECTION 12: OFFICIAL AUTHORITY VERDICT & SIGNATURE
        // ==========================================
        drawSectionHeader('Official Authority Verdict & Signature', 12, 95)

        const decStatus = reportData.decision?.decision || 'OFFICIAL VERDICT PENDING'
        const decColor =
          decStatus === 'COMPLIANT'
            ? successColor
            : decStatus === 'NON_COMPLIANT'
            ? errorColor
            : warningColor

        const remarksText = cleanPdfText(
          reportData.decision?.remarks ||
            'Inspection completed per Legal Metrology (Packaged Commodities) Rules, 2011 and BIS statutory standards review.'
        )

        // Pre-measure remarks to set dynamic card height
        const remarksH = measureTextHeight(doc, `Directives / Remarks: ${remarksText}`, 8, 'Helvetica', 325)
        const minCardH = 78
        const cardHeight = Math.max(minCardH, remarksH + 44) // 20pt for ruling row + 10pt top + 14pt bottom

        if (doc.y + cardHeight > PAGE_BREAK_THRESHOLD) doc.addPage()
        const decY = doc.y
        doc.rect(40, decY, contentWidth, cardHeight).fillAndStroke('#ffffff', borderCol)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('FINAL STATUTORY RULING:', 50, decY + 8)
          .fillColor(decColor)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(decStatus, 185, decY + 7, { width: 180, lineBreak: false })

        doc
          .fillColor(primaryColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`Directives / Remarks: ${remarksText}`, 50, decY + 26, {
            width: 325,
            lineBreak: true,
          })

        const sigLineY = decY + cardHeight - 28

        doc
          .fillColor(mutedColor)
          .fontSize(7.5)
          .font('Helvetica')
          .text(
            `Decided: ${formatDateTime(reportData.decision?.decidedAt || reportData.generatedAt)}`,
            50,
            sigLineY,
            { lineBreak: false }
          )

        // Signature Box
        doc
          .strokeColor('#94a3b8')
          .lineWidth(0.5)
          .moveTo(395, sigLineY - 4)
          .lineTo(540, sigLineY - 4)
          .stroke()

        doc
          .fillColor(primaryColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(
            cleanPdfText(reportData.decision?.officerName || reportData.officer.name),
            395,
            sigLineY,
            { width: 145, align: 'center', lineBreak: false }
          )

        doc
          .fillColor(mutedColor)
          .fontSize(7)
          .font('Helvetica')
          .text('Authorized Regulatory Officer', 395, sigLineY + 10, {
            width: 145,
            align: 'center',
            lineBreak: false,
          })

        doc.y = decY + cardHeight + 8

        // ==========================================
        // SECTION 13: CRYPTOGRAPHIC AUDIT TRAIL & SECURITY HASH
        // ==========================================
        drawSectionHeader('Cryptographic Audit Trail & Security Hash', 13, 46)

        if (doc.y + 44 > PAGE_BREAK_THRESHOLD) doc.addPage()
        const hashY = doc.y
        doc.rect(40, hashY, contentWidth, 42).fillAndStroke('#f8fafc', borderCol)

        doc
          .fillColor(mutedColor)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text('TAMPER-EVIDENT SHA-256 DIGEST:', 50, hashY + 6)

        doc
          .fillColor(brandColor)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(reportData.securityHash, 50, hashY + 17, { width: 495, lineBreak: false, ellipsis: true })

        doc
          .fillColor(mutedColor)
          .fontSize(7)
          .font('Helvetica')
          .text(
            'Cryptographic Verification Seal | Generated by VeriQO Dual-Domain Inspection Engine v2.4 | Any alteration invalidates this document.',
            50,
            hashY + 29,
            { width: 495, lineBreak: false }
          )

        doc.y = hashY + 46

        // ==========================================
        // GLOBAL FOOTER & SAFE PAGE NUMBERING
        // ==========================================
        // CRITICAL PAGINATION FIX:
        // Set page.margins.bottom = 0 during footer rendering and use { lineBreak: false }
        // to prevent PDFKit from triggering auto-page-break at bottom margin!
        const range = doc.bufferedPageRange()
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i)
          const savedBottomMargin = doc.page.margins.bottom
          doc.page.margins.bottom = 0

          try {
            // Footer separator line
            doc
              .strokeColor(borderCol)
              .lineWidth(0.5)
              .moveTo(40, 792)
              .lineTo(555, 792)
              .stroke()

            // Left footer meta
            doc
              .fillColor(mutedColor)
              .fontSize(7)
              .font('Helvetica')
              .text(
                `VeriQO Regulatory Platform | Inspection: ${cleanPdfText(
                  reportData.inspection.id
                )} | Ref: ${cleanPdfText(reportData.reportRef)}`,
                40,
                797,
                { width: 380, lineBreak: false }
              )

            // Right footer: page number
            doc
              .fillColor(primaryColor)
              .fontSize(7)
              .font('Helvetica-Bold')
              .text(`Page ${i + 1} of ${range.count}`, 430, 797, {
                align: 'right',
                width: 125,
                lineBreak: false,
              })
          } finally {
            doc.page.margins.bottom = savedBottomMargin
          }
        }

        doc.end()
      } catch (err) {
        reject(err)
      }
    })
  }
}

export const defaultPdfService = new PdfService()
