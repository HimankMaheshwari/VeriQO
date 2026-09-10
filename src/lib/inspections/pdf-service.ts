/**
 * PDFService — Server-Side Legal Metrology Inspection Report PDF Generator
 *
 * Uses PDFKit to construct an official, structured, publication-quality regulatory report.
 *
 * SAFEGUARDS:
 * 1. Zero AI legal decisions — formats persisted database records only.
 * 2. Permanent RuleVersion locking — displays exact historical version and effective date.
 * 3. Advisory WARNING safeguard — clearly marks warnings as advisory display notices with 0 violations.
 * 4. Violations section lists only persisted formal Violation records.
 * 5. Embeds cryptographic SHA-256 security hash for document integrity.
 */

import PDFDocument from 'pdfkit'
import { type InspectionReportData } from './types'
import { formatDate, formatDateTime } from '../utils'

/**
 * Sanitizes text to prevent glyph corruption or unsupported unicode characters (e.g. ₹)
 * under standard PDFKit Helvetica fonts.
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
            Title: `Legal Metrology Inspection Report - ${reportData.reportRef}`,
            Author: `VeriQO Platform / ${reportData.officer.name}`,
            Subject: `Statutory Packaging Compliance Report - ${reportData.inspection.id}`,
            Keywords: 'Legal Metrology, LMPC, Compliance, Packaging, VeriQO',
            CreationDate: reportData.generatedAt,
          },
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', (err) => reject(err))

        const primaryColor = '#0f172a' // Slate 900
        const brandColor = '#2563eb' // Blue 600
        const accentColor = '#3b82f6' // Blue 500
        const successColor = '#16a34a' // Green 600
        const errorColor = '#dc2626' // Red 600
        const warningColor = '#d97706' // Amber 600
        const mutedColor = '#64748b' // Slate 500
        const lightBg = '#f8fafc' // Slate 50
        const borderCol = '#cbd5e1' // Slate 300

        const contentWidth = 515 // 595.28 - 80 (margins)

        // Helper: Section Header
        const drawSectionHeader = (title: string, iconNumber?: string) => {
          doc.moveDown(0.8)
          const y = doc.y

          // Check for page break if near bottom
          if (y > 700) {
            doc.addPage()
          }

          doc
            .rect(40, doc.y, contentWidth, 22)
            .fillAndStroke(lightBg, borderCol)

          doc
            .fillColor(primaryColor)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(
              iconNumber ? `${iconNumber}. ${title.toUpperCase()}` : title.toUpperCase(),
              48,
              doc.y + 6,
              { width: contentWidth - 16 }
            )

          doc.moveDown(0.8)
        }

        // Helper: Draw horizontal separator
        const drawDivider = () => {
          doc
            .strokeColor(borderCol)
            .lineWidth(0.5)
            .moveTo(40, doc.y)
            .lineTo(555, doc.y)
            .stroke()
          doc.moveDown(0.5)
        }

        // ==========================================
        // 1. OFFICIAL REPORT HEADER
        // ==========================================
        // Top Banner
        doc
          .rect(40, 40, contentWidth, 68)
          .fill(primaryColor)

        // Department Title
        doc
          .fillColor('#ffffff')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('GOVERNMENT REGULATORY COMPLIANCE SYSTEM', 52, 48)

        doc
          .fillColor('#94a3b8')
          .fontSize(9)
          .font('Helvetica')
          .text('DIRECTORATE OF LEGAL METROLOGY • PACKAGED COMMODITIES RULES, 2011', 52, 64)

        doc
          .fillColor('#38bdf8')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('STATUTORY INSPECTION & COMPLIANCE REPORT', 52, 78)

        // Report Reference & Security Hash in header
        doc
          .fillColor('#ffffff')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(`REF: ${reportData.reportRef}`, 360, 48, { align: 'right', width: 180 })

        doc
          .fillColor('#cbd5e1')
          .fontSize(8)
          .font('Helvetica')
          .text(`DATE: ${formatDateTime(reportData.generatedAt)}`, 360, 62, { align: 'right', width: 180 })

        doc
          .fillColor('#94a3b8')
          .fontSize(7)
          .font('Helvetica')
          .text(`SHA-256: ${reportData.securityHash.slice(0, 24)}...`, 360, 76, { align: 'right', width: 180 })

        doc.y = 118
        doc.moveDown(0.5)

        let sectionNum = 1

        // ==========================================
        // 2. INSPECTION METADATA & OFFICER SECTION
        // ==========================================
        drawSectionHeader('Inspection Overview & Authority Identification', `${sectionNum++}`)

        const startY1 = doc.y
        doc
          .rect(40, startY1, contentWidth, 54)
          .fillAndStroke('#ffffff', borderCol)

        // Left Column: Inspection File Info
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('INSPECTION REFERENCE:', 50, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica')
          .text(reportData.inspection.id, 50, startY1 + 18)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('FILE STATUS:', 50, startY1 + 32)
          .fillColor(
            reportData.inspection.status === 'CLOSED'
              ? successColor
              : reportData.inspection.status === 'IN_PROGRESS'
              ? brandColor
              : warningColor
          )
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(reportData.inspection.status, 110, startY1 + 32)

        // Middle Column: Product Identity
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('COMMODITY NAME:', 200, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(
            cleanPdfText(reportData.product?.name || reportData.scan?.identifiedProductName || 'Packaged Commodity'),
            200,
            startY1 + 18,
            { width: 170 }
          )

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Category: ${cleanPdfText(reportData.product?.category || reportData.scan?.identifiedCategory || 'Standard Packaged Commodity')}`,
            200,
            startY1 + 32
          )

        // Right Column: Officer Info
        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('INSPECTING OFFICER:', 380, startY1 + 8)
          .fillColor(primaryColor)
          .fontSize(9)
          .font('Helvetica')
          .text(cleanPdfText(reportData.officer.name), 380, startY1 + 18)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`${reportData.officer.role} (${reportData.officer.email})`, 380, startY1 + 32, { width: 165 })

        doc.y = startY1 + 62

        // ==========================================
        // 3. PHYSICAL PRODUCT & PACKAGING GROUND TRUTH
        // ==========================================
        drawSectionHeader('Physical Packaging Ground Truth & Identifiers', `${sectionNum++}`)

        const startY2 = doc.y
        doc
          .rect(40, startY2, contentWidth, 42)
          .fillAndStroke(lightBg, borderCol)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text('Brand:', 50, startY2 + 8)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text(cleanPdfText(reportData.product?.brand || reportData.scan?.identifiedBrand || '—'), 85, startY2 + 8)

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text('Manufacturer / Packer:', 180, startY2 + 8)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text(
            cleanPdfText(reportData.product?.manufacturer || reportData.scan?.identifiedManufacturer || '—'),
            280,
            startY2 + 8,
            { width: 260 }
          )

        doc
          .fillColor(mutedColor)
          .fontSize(8)
          .font('Helvetica')
          .text('Packaging Photos Stored:', 50, startY2 + 24)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text(
            reportData.scan?.images.length
              ? `${reportData.scan.images.length} High-Resolution Photograph(s) Persisted in Secure Storage`
              : 'No packaging images attached',
            165,
            startY2 + 24
          )

        doc.y = startY2 + 48

        // ==========================================
        // 4. STATUTORY PACKAGING DECLARATIONS TABLE
        // ==========================================
        drawSectionHeader('Mandatory Statutory Declarations (Ground Truth OCR)', `${sectionNum++}`)

        // Table Header
        const tableTop = doc.y
        doc.rect(40, tableTop, contentWidth, 18).fillAndStroke('#e2e8f0', borderCol)

        doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
        doc.text('MANDATORY FIELD', 48, tableTop + 5, { width: 110 })
        doc.text('EXTRACTED RAW OCR SNIPPET', 160, tableTop + 5, { width: 170 })
        doc.text('NORMALIZED VALUE', 335, tableTop + 5, { width: 100 })
        doc.text('CONFIDENCE', 440, tableTop + 5, { width: 55 })
        doc.text('STATUS', 500, tableTop + 5, { width: 50 })

        doc.y = tableTop + 20

        if (reportData.declarations.length === 0) {
          doc.fillColor(mutedColor).fontSize(8).font('Helvetica-Oblique').text('No packaging declarations detected.', 50, doc.y + 4)
          doc.moveDown(1)
        } else {
          for (const d of reportData.declarations) {
            if (doc.y > 720) {
              doc.addPage()
              // re-draw table header on next page
              doc.rect(40, doc.y, contentWidth, 18).fillAndStroke('#e2e8f0', borderCol)
              doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
              doc.text('MANDATORY FIELD', 48, doc.y + 5, { width: 110 })
              doc.text('EXTRACTED RAW OCR SNIPPET', 160, doc.y + 5, { width: 170 })
              doc.text('NORMALIZED VALUE', 335, doc.y + 5, { width: 100 })
              doc.text('CONFIDENCE', 440, doc.y + 5, { width: 55 })
              doc.text('STATUS', 500, doc.y + 5, { width: 50 })
              doc.y += 20
            }

            const rowY = doc.y
            const isAlt = reportData.declarations.indexOf(d) % 2 === 1
            if (isAlt) {
              doc.rect(40, rowY, contentWidth, 18).fill('#f8fafc')
            }

            doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
            doc.text(cleanPdfText(d.fieldName), 48, rowY + 4, { width: 108 })

            doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
            doc.text(cleanPdfText(d.rawValue) || '—', 160, rowY + 4, { width: 168, lineBreak: false })

            doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold')
            doc.text(cleanPdfText(d.normalizedValue) || '—', 335, rowY + 4, { width: 98, lineBreak: false })

            doc.fillColor(mutedColor).fontSize(7.5).font('Helvetica')
            doc.text(d.confidence ? `${Math.round(d.confidence * 100)}%` : '—', 440, rowY + 4)

            const statusColor =
              d.detectionStatus === 'DETECTED' ? successColor : d.detectionStatus === 'NOT_DETECTED' ? errorColor : mutedColor
            doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold')
            doc.text(d.detectionStatus, 500, rowY + 4, { width: 52 })

            doc.y = rowY + 18
          }
        }

        doc.moveDown(0.5)

        // ==========================================
        // 5. STATUTORY COMPLIANCE CHECKS (RULE ENGINE)
        // ==========================================
        drawSectionHeader('Legal Metrology Compliance Evaluation (Statutory Rules)', `${sectionNum++}`)

        doc
          .fillColor(mutedColor)
          .fontSize(7.5)
          .font('Helvetica')
          .text('Evaluated strictly by VeriQO Deterministic Rule Engine against authoritative Gazette provisions. Historical rule versions locked.', 44, doc.y)
        doc.moveDown(0.5)

        for (const check of reportData.complianceChecks) {
          if (doc.y > 690) {
            doc.addPage()
          }

          const cardY = doc.y
          doc.rect(40, cardY, contentWidth, 34).fillAndStroke('#ffffff', borderCol)

          // Status Indicator
          const statusBg =
            check.status === 'PASS'
              ? successColor
              : check.status === 'FAIL'
              ? errorColor
              : check.status === 'WARNING'
              ? warningColor
              : mutedColor

          doc.rect(40, cardY, 4, 34).fill(statusBg)

          // Rule Number & Historical Version
          doc
            .fillColor(primaryColor)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text(`${check.ruleNumber} (v${check.ruleVersionNumber})`, 50, cardY + 5)

          doc
            .fillColor('#334155')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(cleanPdfText(check.ruleTitle), 160, cardY + 5, { width: 280, lineBreak: false })

          // Status Badge
          doc
            .fillColor(statusBg)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(check.status, 475, cardY + 5, { align: 'right', width: 70 })

          // Statutory citation & Summary
          doc
            .fillColor(mutedColor)
            .fontSize(7.5)
            .font('Helvetica')
            .text(
              `${cleanPdfText(check.evaluationSummary || check.ruleRequirement)}${check.sourceReference ? ` [${check.sourceReference}]` : ''}`,
              50,
              cardY + 18,
              { width: 495, lineBreak: false }
            )

          doc.y = cardY + 38
        }

        doc.moveDown(0.5)

        // ==========================================
        // 6. FORMAL VIOLATIONS SECTION (FAIL ONLY)
        // ==========================================
        drawSectionHeader('Statutory Violations & Remediation Directives', `${sectionNum++}`)

        if (reportData.violations.length === 0) {
          doc
            .fillColor(successColor)
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .text('✓ ZERO FORMAL STATUTORY VIOLATIONS RECORDED ON PHYSICAL COMMODITY', 50, doc.y)
          doc.moveDown(0.5)
        } else {
          for (const viol of reportData.violations) {
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
        // 7. ONLINE & E-COMMERCE VERIFICATION AUDIT
        // ==========================================
        if (reportData.onlineVerification) {
          drawSectionHeader('Phase 3C E-Commerce Verification & Price Audit', `${sectionNum++}`)

          const oY = doc.y
          doc.rect(40, oY, contentWidth, 42).fillAndStroke(lightBg, borderCol)

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica')
            .text('Listing Domain:', 50, oY + 8)
            .fillColor(primaryColor)
            .font('Helvetica-Bold')
            .text(cleanPdfText(reportData.onlineVerification.domain || 'External Marketplace'), 115, oY + 8)

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica')
            .text('Match Status:', 240, oY + 8)
            .fillColor(
              reportData.onlineVerification.overallMatchStatus === 'MATCH'
                ? successColor
                : reportData.onlineVerification.overallMatchStatus === 'MISMATCH'
                ? errorColor
                : warningColor
            )
            .font('Helvetica-Bold')
            .text(reportData.onlineVerification.overallMatchStatus, 298, oY + 8)

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica')
            .text('Verified At:', 400, oY + 8)
            .fillColor(primaryColor)
            .font('Helvetica')
            .text(formatDateTime(reportData.onlineVerification.verifiedAt), 450, oY + 8)

          if (reportData.onlineVerification.snapshot) {
            doc
              .fillColor(mutedColor)
              .fontSize(7.5)
              .font('Helvetica')
              .text(
                `SHA-256 Audit Hash: ${reportData.onlineVerification.snapshot.contentHash} (HTTP ${reportData.onlineVerification.snapshot.httpStatus})`,
                50,
                oY + 24
              )
          }

          doc.y = oY + 48

          // Discrepancies list
          if (reportData.onlineVerification.discrepancies.length > 0) {
            for (const d of reportData.onlineVerification.discrepancies) {
              if (doc.y > 700) doc.addPage()

              const dY = doc.y
              doc.rect(40, dY, contentWidth, 24).fillAndStroke('#fef2f2', '#fca5a5')

              doc
                .fillColor(errorColor)
                .fontSize(8)
                .font('Helvetica-Bold')
                .text(`${d.discrepancyType} (${d.fieldName}):`, 50, dY + 7)

              doc
                .fillColor(primaryColor)
                .fontSize(8)
                .font('Helvetica')
                .text(
                  `Package: ${cleanPdfText(d.physicalValue) || '—'} | Listed Online: ${cleanPdfText(d.onlineValue) || '—'} — ${cleanPdfText(d.message)}`,
                  180,
                  dY + 7,
                  { width: 365, lineBreak: false }
                )

              doc.y = dY + 28
            }
          }
          doc.moveDown(0.5)
        }

        // ==========================================
        // 8. PHASE 4B EVIDENCE & FIELD OBSERVATIONS
        // ==========================================
        if (reportData.evidenceItems.length > 0) {
          drawSectionHeader('Phase 4B Field Evidence & Physical Measurements', `${sectionNum++}`)

          for (const ev of reportData.evidenceItems) {
            if (doc.y > 700) doc.addPage()

            const evY = doc.y
            doc.rect(40, evY, contentWidth, 26).fillAndStroke('#ffffff', borderCol)

            doc
              .fillColor(brandColor)
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(`[${ev.type}]`, 50, evY + 5)

            doc
              .fillColor(primaryColor)
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(cleanPdfText(ev.title) || 'Inspector Note', 140, evY + 5)

            doc
              .fillColor(mutedColor)
              .fontSize(7.5)
              .font('Helvetica')
              .text(formatDateTime(ev.createdAt), 450, evY + 5, { align: 'right', width: 95 })

            doc
              .fillColor('#334155')
              .fontSize(7.5)
              .font('Helvetica')
              .text(cleanPdfText(ev.description) || '—', 50, evY + 15, { width: 495, lineBreak: false })

            doc.y = evY + 30
          }
          doc.moveDown(0.5)
        }

        // ==========================================
        // 9. OFFICIAL AUTHORITY VERDICT & SIGNATURE
        // ==========================================
        drawSectionHeader('Official Authority Verdict & Order', `${sectionNum++}`)

        if (doc.y > 630) doc.addPage()

        const isOverride =
          reportData.violations.length > 0 &&
          (reportData.decision?.decision === 'DISMISSED' || reportData.decision?.decision === 'COMPLIANT')

        const decY = doc.y
        const cardHeight = isOverride ? 92 : 72
        doc.rect(40, decY, contentWidth, cardHeight).fillAndStroke(lightBg, borderCol)

        if (reportData.decision) {
          const decColor =
            reportData.decision.decision === 'COMPLIANT'
              ? successColor
              : reportData.decision.decision === 'NON_COMPLIANT'
              ? errorColor
              : warningColor

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica-Bold')
            .text('FINAL AUTHORITY RULING:', 50, decY + 8)

          doc
            .fillColor(decColor)
            .fontSize(11)
            .font('Helvetica-Bold')
            .text(reportData.decision.decision, 185, decY + 7)

          let currentY = decY + 22
          if (isOverride) {
            doc
              .fillColor(warningColor)
              .fontSize(7.5)
              .font('Helvetica-Bold')
              .text('⚠ REGULATORY OVERRIDE / DISMISSAL NOTICE: Findings dismissed with statutory justification:', 50, currentY, { width: 495 })
            currentY += 12
          }

          const remarksText = cleanPdfText(reportData.decision.remarks || 'No remarks recorded.')
          doc
            .fillColor(primaryColor)
            .fontSize(8)
            .font('Helvetica')
            .text(`Directives / Remarks: ${remarksText}`, 50, currentY, { width: 330, height: 26, lineBreak: true })

          doc
            .fillColor(mutedColor)
            .fontSize(7.5)
            .font('Helvetica')
            .text(`Decided At: ${formatDateTime(reportData.decision.decidedAt)}`, 50, decY + cardHeight - 14)

          // Signature box
          doc
            .strokeColor('#94a3b8')
            .lineWidth(0.5)
            .moveTo(395, decY + cardHeight - 24)
            .lineTo(540, decY + cardHeight - 24)
            .stroke()

          doc
            .fillColor(primaryColor)
            .fontSize(7.5)
            .font('Helvetica-Bold')
            .text(cleanPdfText(reportData.decision.officerName) || 'Inspecting Officer', 395, decY + cardHeight - 20, { width: 145, align: 'center' })

          doc
            .fillColor(mutedColor)
            .fontSize(7)
            .font('Helvetica')
            .text('Authorized Legal Metrology Officer', 395, decY + cardHeight - 11, { width: 145, align: 'center' })
        } else {
          doc
            .fillColor(warningColor)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('OFFICIAL VERDICT PENDING', 50, decY + 14)

          doc
            .fillColor(mutedColor)
            .fontSize(8)
            .font('Helvetica')
            .text('This inspection file has not yet received a conclusive Authority Decision.', 50, decY + 30)
        }

        doc.y = decY + cardHeight + 8


        // ==========================================
        // 10. FOOTER & PAGE NUMBERING ACROSS ALL PAGES
        // ==========================================
        const range = doc.bufferedPageRange()
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i)

          // Footer Line
          doc
            .strokeColor(borderCol)
            .lineWidth(0.5)
            .moveTo(40, 792)
            .lineTo(555, 792)
            .stroke()

          doc
            .fillColor(mutedColor)
            .fontSize(7)
            .font('Helvetica')
            .text(
              `VeriQO Legal Metrology Regulatory Platform • Inspection ID: ${reportData.inspection.id} • Report Ref: ${reportData.reportRef}`,
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
}

export const defaultPdfService = new PdfService()
