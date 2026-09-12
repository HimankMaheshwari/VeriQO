/**
 * UnifiedReportGenerator — Assembles structured dual-domain inspection data
 * (Legal Metrology + BIS) for official reporting and officer review.
 *
 * ARCHITECTURAL RULE:
 * Protected files (src/lib/inspections/report-generator.ts and pdf-service.ts)
 * remain untouched. This service provides a forward-compatible unified report data
 * model that directly mirrors the existing inspection report contract and can be
 * plugged into the existing PDF service in future phases with zero rewriting.
 */

import crypto from 'crypto'
import type { UnifiedInspectionResult, UnifiedInspectionReportData } from '@/types/bis-inspection'

export interface AssembleUnifiedReportInput {
  unifiedResult: UnifiedInspectionResult
  inspectionRef?: string
  product?: {
    name: string | null
    brand: string | null
    category: string | null
    manufacturer: string | null
  } | null
  officer?: {
    id: string
    name: string
    role: string
  } | null
}

export class UnifiedReportGenerator {
  /**
   * Builds the structured dual-domain report payload with cryptographic SHA-256 seal.
   */
  assembleReportPayload(input: AssembleUnifiedReportInput): UnifiedInspectionReportData {
    const { unifiedResult } = input
    const generatedAt = new Date().toISOString()
    const reportRef = input.inspectionRef || `UNIF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const preliminaryPayload: Omit<UnifiedInspectionReportData, 'securityHash'> = {
      reportRef,
      generatedAt,
      scanId: unifiedResult.scanId,
      product: input.product ?? null,
      lmpc: {
        status: unifiedResult.lmpc.status,
        summary: unifiedResult.lmpc.summary,
        declarationsCount: unifiedResult.lmpc.declarationsCount ?? 0,
        violationsCount: unifiedResult.lmpc.violationsCount ?? 0,
      },
      bis: unifiedResult.bis,
      overall: unifiedResult.overall,
      humanInTheLoop: {
        stage: unifiedResult.humanInTheLoop.stage,
        officerStatus: unifiedResult.humanInTheLoop.officerStatus,
        advisoryNotice: unifiedResult.humanInTheLoop.advisoryNotice,
      },
      isDemoData: unifiedResult.bis.isDemoData,
    }

    const payloadString = JSON.stringify(preliminaryPayload, Object.keys(preliminaryPayload).sort())
    const securityHash = crypto.createHash('sha256').update(payloadString).digest('hex')

    return {
      ...preliminaryPayload,
      securityHash,
    }
  }

  /**
   * Generates a human-readable Dual-Domain statutory inspection report in Markdown.
   */
  renderMarkdownReport(reportData: UnifiedInspectionReportData): string {
    const lines: string[] = []

    lines.push(`# UNIFIED PACKAGING STATUTORY COMPLIANCE REPORT`)
    lines.push(`**Report Reference**: \`${reportData.reportRef}\``)
    lines.push(`**Generated At**: ${reportData.generatedAt}`)
    lines.push(`**Scan Identifier**: \`${reportData.scanId}\``)
    lines.push(`**Cryptographic Security Hash**: \`${reportData.securityHash}\``)
    lines.push(``)

    if (reportData.isDemoData) {
      lines.push(`> [!WARNING]`)
      lines.push(`> **SIMULATED DEMO EVALUATION**: One or more standards, license numbers, or QCO checks in this report are simulated demo/test records for SIH 2026 PS107 evaluation. They do not constitute live official BIS or Legal Metrology registry determinations.`)
      lines.push(``)
    }

    // ── SECTION 1: LEGAL METROLOGY (LMPC) ────────────────────────────────────
    lines.push(`---`)
    lines.push(`## SECTION 1: LEGAL METROLOGY (PACKAGED COMMODITIES) COMPLIANCE`)
    lines.push(`*Governing Framework: Legal Metrology Act, 2009 & Legal Metrology (Packaged Commodities) Rules, 2011*`)
    lines.push(``)
    lines.push(`- **LMPC Status**: **${reportData.lmpc.status}**`)
    lines.push(`- **Summary**: ${reportData.lmpc.summary}`)
    lines.push(`- **Declarations Scanned**: ${reportData.lmpc.declarationsCount}`)
    lines.push(`- **Statutory Violations**: ${reportData.lmpc.violationsCount}`)
    lines.push(``)

    // ── SECTION 2: BIS / INDIAN STANDARDS ────────────────────────────────────
    lines.push(`---`)
    lines.push(`## SECTION 2: BUREAU OF INDIAN STANDARDS (BIS) VERIFICATION`)
    lines.push(`*Governing Framework: Bureau of Indian Standards Act, 2016 & Applicable Quality Control Orders (QCOs)*`)
    lines.push(``)
    lines.push(`- **Overall BIS Status**: **${reportData.bis.status}**`)
    lines.push(``)

    lines.push(`### 2.1 Detected Packaging Identifiers`)
    if (reportData.bis.identifiers.length === 0) {
      lines.push(`*No statutory BIS identifiers detected on packaging surface.*`)
    } else {
      lines.push(`| Identifier Type | State | Detected Value | Normalized Value | Confidence | Source |`)
      lines.push(`| :--- | :---: | :--- | :--- | :---: | :--- |`)
      reportData.bis.identifiers.forEach((id) => {
        lines.push(`| ${id.type} | **${id.state}** | \`${id.detectedValue || 'N/A'}\` | \`${id.normalizedValue || 'N/A'}\` | ${(id.confidence * 100).toFixed(0)}% | ${id.source} |`)
      })
    }
    lines.push(``)

    lines.push(`### 2.2 Quality Control Order (QCO) Applicability`)
    const qco = reportData.bis.qcoChecks[0]
    if (!qco) {
      lines.push(`*No QCO checks recorded.*`)
    } else {
      lines.push(`- **Status**: **${qco.status}**`)
      lines.push(`- **Mandatory Certification Required**: ${qco.isMandatoryCertification ? 'YES' : 'NO'}`)
      if (qco.orderTitle) lines.push(`- **Order Title**: ${qco.orderTitle} (\`${qco.orderNumber || 'N/A'}\`)`)
      if (qco.effectiveDate) lines.push(`- **Effective Date**: ${qco.effectiveDate}`)
      lines.push(`- **Guidance**: ${qco.guidance}`)
    }
    lines.push(``)

    lines.push(`### 2.3 Candidate Indian Standards Associated`)
    if (reportData.bis.candidateStandards.length === 0) {
      lines.push(`*No candidate Indian Standards associated.*`)
    } else {
      reportData.bis.candidateStandards.forEach((cs) => {
        lines.push(`- **${cs.standardNumber}**: ${cs.title} (Relevance: ${(cs.relevance * 100).toFixed(0)}%, State: \`${cs.state}\`)`)
        lines.push(`  *Evidence*: ${cs.supportingEvidence}`)
      })
    }
    lines.push(``)

    lines.push(`### 2.4 License Verifications`)
    if (reportData.bis.verifications.length === 0) {
      lines.push(`*No BIS license verifications executed.*`)
    } else {
      reportData.bis.verifications.forEach((v) => {
        lines.push(`- **${v.identifierType}** (\`${v.identifierValue}\`): **${v.status}**`)
        if (v.details) {
          lines.push(`  - Licensee: ${v.details.licenseeName || 'N/A'}`)
          lines.push(`  - Standard: ${v.details.standardNumber || 'N/A'}`)
          lines.push(`  - Status in Registry: \`${v.details.status}\` (Valid until: ${v.details.validUntil || 'N/A'})`)
        }
      })
    }
    lines.push(``)

    lines.push(`### 2.5 Statutory BIS Findings`)
    if (reportData.bis.findings.length === 0) {
      lines.push(`*No statutory BIS findings generated.*`)
    } else {
      reportData.bis.findings.forEach((f, i) => {
        lines.push(`#### Finding ${i + 1}: ${f.title} [${f.status}]`)
        lines.push(`- **Severity**: \`${f.severity}\` | **Code**: \`${f.code}\``)
        lines.push(`- **Explanation**: ${f.explanation}`)
        lines.push(`- **Statutory Recommendation**: ${f.recommendation}`)
        lines.push(`- **Evidence**: ${f.evidence}`)
        lines.push(``)
      })
    }

    // ── SECTION 3: UNIFIED SUMMARY & HUMAN REVIEW ─────────────────────────────
    lines.push(`---`)
    lines.push(`## SECTION 3: UNIFIED REGULATORY DISPOSITION & OFFICER REVIEW`)
    lines.push(`- **Overall Disposition**: **${reportData.overall.status}**`)
    lines.push(`- **Disposition Summary**: ${reportData.overall.summary}`)
    lines.push(`- **Requires Human Officer Review**: ${reportData.overall.requiresOfficerReview ? 'YES' : 'NO'}`)
    lines.push(`- **Workflow Stage**: \`${reportData.humanInTheLoop.stage}\``)
    lines.push(`- **Officer Status**: \`${reportData.humanInTheLoop.officerStatus}\``)
    lines.push(``)
    lines.push(`> [!NOTE]`)
    lines.push(`> **Statutory Notice**: ${reportData.humanInTheLoop.advisoryNotice}`)

    return lines.join('\n')
  }
}

export const defaultUnifiedReportGenerator = new UnifiedReportGenerator()
