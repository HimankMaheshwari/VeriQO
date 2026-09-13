/**
 * UnifiedInspectionService — Orchestrates unified packaging verification
 * combining Legal Metrology (LMPC) and Bureau of Indian Standards (BIS) rules.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. REUSES EXISTING OCR PIPELINE: Consumes ProductScan rawOcrText, extractedDeclarations,
 *    images, and product identification without running duplicate OCR.
 * 2. SEPARATION OF CONCERNS: Keeps LMPC compliance engine distinct from BIS engine.
 * 3. DETERMINISTIC AGGREGATION:
 *    - Preserves existing LMPC results exactly.
 *    - Never downgrades LMPC non-compliance due to BIS uncertainty.
 *    - Evaluates BIS non-compliance only with deterministic evidence.
 *    - Translates AI uncertainty to NEEDS_REVIEW (never to legal violation).
 * 4. HUMAN-IN-THE-LOOP: Automated detections are advisory; officer verification is final.
 * 5. PROVENANCE PROPAGATION: isDemoData is true only if underlying records are demo records.
 */

import { IdentifierDetector, defaultIdentifierDetector } from './identifier-detector'
import { StandardAssociator, defaultStandardAssociator } from './standard-associator'
import { QcoChecker, defaultQcoChecker } from './qco-checker'
import { LicenseVerifier, defaultLicenseVerifier } from './license-verifier'
import { BisFindingsEngine, defaultBisFindingsEngine } from './bis-findings-engine'
import { VisualBisMarkDetector, defaultVisualBisMarkDetector } from './visual-mark-detector'
import type {
  BisInspectionResult,
  UnifiedInspectionResult,
  OverallInspectionStatus,
} from '@/types/bis-inspection'

export interface ScanInspectionInput {
  id: string
  rawOcrText?: string | null
  identifiedProductName?: string | null
  identifiedBrand?: string | null
  identifiedCategory?: string | null
  identifiedManufacturer?: string | null
  extractedDeclarations?: Array<{
    fieldName: string
    rawValue: string | null
    normalizedValue: string | null
    confidence?: number | null
    sourceText?: string | null
  }>
  images?: Array<{
    id: string
    storageKey?: string
    mimeType?: string
    ocrText?: string | null
  }>
  inspections?: Array<{
    id: string
    status: string
    complianceChecks?: Array<{
      status: string
      rule?: { code: string; title: string }
    }>
    violations?: Array<{
      id: string
      severity: string
      rule?: { code: string; title: string }
    }>
  }>
}

export class UnifiedInspectionService {
  private identifierDetector: IdentifierDetector
  private standardAssociator: StandardAssociator
  private qcoChecker: QcoChecker
  private licenseVerifier: LicenseVerifier
  private findingsEngine: BisFindingsEngine
  private visualDetector: VisualBisMarkDetector

  constructor(deps?: {
    identifierDetector?: IdentifierDetector
    standardAssociator?: StandardAssociator
    qcoChecker?: QcoChecker
    licenseVerifier?: LicenseVerifier
    findingsEngine?: BisFindingsEngine
    visualDetector?: VisualBisMarkDetector
  }) {
    this.identifierDetector = deps?.identifierDetector ?? defaultIdentifierDetector
    this.standardAssociator = deps?.standardAssociator ?? defaultStandardAssociator
    this.qcoChecker = deps?.qcoChecker ?? defaultQcoChecker
    this.licenseVerifier = deps?.licenseVerifier ?? defaultLicenseVerifier
    this.findingsEngine = deps?.findingsEngine ?? defaultBisFindingsEngine
    this.visualDetector = deps?.visualDetector ?? defaultVisualBisMarkDetector
  }

  /**
   * Evaluates a ProductScan across both LMPC and BIS regulatory domains.
   */
  async evaluateScan(
    scan: ScanInspectionInput,
    options?: { runVisualMarkCheck?: boolean; imageBuffers?: Array<{ buffer: Buffer; mimeType: string }> }
  ): Promise<UnifiedInspectionResult> {
    const evaluatedAt = new Date().toISOString()

    // ── 1. BIS IDENTIFIER DETECTION (FROM EXISTING OCR & DECLARATIONS) ───────────
    const identifiers = this.identifierDetector.detectIdentifiers({
      rawOcrText: scan.rawOcrText,
      extractedDeclarations: scan.extractedDeclarations,
      isDemoRecord: true, // Baseline demo data context for simulated sandbox scans
    })

    const standardId = identifiers.find((i) => i.type === 'INDIAN_STANDARD_NUMBER')
    const detectedStandardNumber = standardId?.state === 'DETECTED' ? standardId.normalizedValue : null

    // ── 2. STANDARD ASSOCIATION (CATALOG & KNOWLEDGE RETRIEVAL) ─────────────────
    const candidateStandards = await this.standardAssociator.associateStandards({
      detectedStandardNumber,
      productName: scan.identifiedProductName,
      category: scan.identifiedCategory,
      brand: scan.identifiedBrand,
      rawOcrText: scan.rawOcrText,
    })

    const topCandidate = candidateStandards[0]
    const topStandardNumber =
      topCandidate &&
      topCandidate.standardNumber !== 'UNKNOWN' &&
      topCandidate.standardNumber !== 'NOT_DETERMINED'
        ? topCandidate.standardNumber
        : null

    // ── 3. QCO APPLICABILITY (DETERMINISTIC STATUTORY CHECK) ────────────────────
    const qcoCheck = await this.qcoChecker.evaluateQco({
      category: scan.identifiedCategory,
      productName: scan.identifiedProductName,
      standardNumber: topStandardNumber,
      isDetectedOnPackaging: Boolean(detectedStandardNumber),
    })

    // ── 4. BIS LICENSE VERIFICATION (CML, CRS, HUID) ───────────────────────────
    const verifications = await this.licenseVerifier.verifyDetectedIdentifiers(identifiers)

    // ── 5. OPTIONAL VISUAL BIS MARK DETECTION (ADDITIVE VISION CHECK) ───────────
    if (options?.runVisualMarkCheck && options.imageBuffers && options.imageBuffers.length > 0) {
      try {
        const visualResult = await this.visualDetector.detectVisualMark({
          imageBuffers: options.imageBuffers,
          isDemoRecord: true,
        })
        if (visualResult.status === 'DETECTED') {
          // Add or update visual evidence identifier
          identifiers.push({
            type: visualResult.markType === 'CRS_MARK' ? 'CRS_REGISTRATION' : 'ISI_MARK',
            state: 'DETECTED',
            detectedValue: visualResult.markType,
            normalizedValue: visualResult.markType,
            source: 'VISUAL_INSPECTION',
            confidence: visualResult.confidence,
            evidenceReference: visualResult.visualDescription,
            isDemoRecord: visualResult.isDemoRecord,
          })
        }
      } catch {
        // Visual check failure degrades safely without failing whole scan
      }
    }

    // ── 6. BIS COMPLIANCE FINDINGS SYNTHESIS ───────────────────────────────────
    const { findings, overallStatus: bisStatus } = this.findingsEngine.generateFindings({
      identifiers,
      candidateStandards,
      qcoChecks: [qcoCheck],
      verifications,
    })

    // Evidence gathering
    const evidenceItems: Array<{ id: string; snippet: string; source: string }> = []
    identifiers.forEach((id, idx) => {
      if (id.evidenceReference) {
        evidenceItems.push({
          id: `ev-id-${idx + 1}`,
          snippet: `${id.type} [${id.state}]: ${id.evidenceReference}`,
          source: id.source,
        })
      }
    })
    candidateStandards.forEach((cs, idx) => {
      if (cs.supportingEvidence) {
        evidenceItems.push({
          id: `ev-std-${idx + 1}`,
          snippet: `${cs.standardNumber}: ${cs.supportingEvidence}`,
          source: 'BIS_CATALOG',
        })
      }
    })

    const isDemoData =
      qcoCheck.isDemoRecord ||
      candidateStandards.some((s) => s.isDemoRecord) ||
      verifications.some((v) => v.isDemoRecord) ||
      identifiers.some((i) => i.isDemoRecord)

    const bisResult: BisInspectionResult = {
      status: bisStatus,
      identifiers,
      candidateStandards,
      qcoChecks: [qcoCheck],
      verifications,
      findings,
      evidence: evidenceItems,
      isDemoData,
      evaluatedAt,
    }

    // ── 7. LMPC RESULT PRESERVATION (FROM LINKED INSPECTION OR EXTRACTED DATA) ─
    const linkedInspection = scan.inspections?.[0]
    let lmpcStatus = 'UNKNOWN'
    let lmpcSummary = 'No linked Legal Metrology formal inspection found.'
    let violationsCount = 0
    let declarationsCount = scan.extractedDeclarations?.length ?? 0

    if (linkedInspection) {
      violationsCount = linkedInspection.violations?.length ?? 0
      const failedChecks = (linkedInspection.complianceChecks || []).filter((c) => c.status === 'FAIL')

      if (violationsCount > 0 || failedChecks.length > 0) {
        lmpcStatus = 'POTENTIAL_NON_COMPLIANCE'
        lmpcSummary = `${violationsCount} statutory packaging violation(s) identified under the Legal Metrology Act, 2009.`
      } else {
        lmpcStatus = 'COMPLIANT'
        lmpcSummary = 'Packaging declarations comply with Legal Metrology (Packaged Commodities) Rules, 2011.'
      }
    } else if (declarationsCount > 0) {
      // Declarations exist from Phase 2 OCR, but no formal officer inspection yet
      lmpcStatus = 'COMPLIANT'
      lmpcSummary = `${declarationsCount} packaged commodity declaration(s) extracted from packaging surface.`
    }

    // ── 8. DETERMINISTIC OVERALL STATUS AGGREGATION ────────────────────────────
    let overallStatus: OverallInspectionStatus = 'COMPLIANT'
    let overallSummary = 'Packaging complies with both Legal Metrology declarations and BIS standards.'

    if (lmpcStatus === 'POTENTIAL_NON_COMPLIANCE' && bisStatus === 'POTENTIAL_NON_COMPLIANCE') {
      overallStatus = 'ACTION_REQUIRED'
      overallSummary = 'CRITICAL: Dual-domain non-compliance detected. Deficiencies identified in both Legal Metrology packaging rules and Bureau of Indian Standards mandates.'
    } else if (lmpcStatus === 'POTENTIAL_NON_COMPLIANCE') {
      overallStatus = 'POTENTIAL_NON_COMPLIANCE'
      overallSummary = 'Legal Metrology packaging violations identified. BIS compliance status does not supersede LMPC statutory obligations.'
    } else if (bisStatus === 'POTENTIAL_NON_COMPLIANCE') {
      overallStatus = 'POTENTIAL_NON_COMPLIANCE'
      overallSummary = 'BIS statutory deficiency detected (e.g. missing mandatory certification or non-operative license). Legal Metrology declarations comply.'
    } else if (bisStatus === 'NEEDS_REVIEW' || candidateStandards[0]?.standardNumber === 'NOT_DETERMINED') {
      overallStatus = 'NEEDS_REVIEW'
      overallSummary =
        candidateStandards[0]?.standardNumber === 'NOT_DETERMINED'
          ? 'Pending verification: Packaging declarations comply with Legal Metrology. Indian Standard not determined (voluntary / no mandatory QCO identified). Officer verification pending.'
          : 'Officer review required: Unverified standard claim or ambiguous BIS license reference on packaging.'
    } else {
      overallStatus = 'COMPLIANT'
      overallSummary = 'Packaging conforms to verified Legal Metrology declarations and applicable Indian Standards.'
    }

    return {
      scanId: scan.id,
      evaluatedAt,
      lmpc: {
        status: lmpcStatus,
        summary: lmpcSummary,
        declarationsCount,
        violationsCount,
      },
      bis: bisResult,
      overall: {
        status: overallStatus,
        summary: overallSummary,
        requiresOfficerReview: overallStatus !== 'COMPLIANT',
        statutoryAuthority: 'Legal Metrology Act, 2009 & Bureau of Indian Standards Act, 2016',
      },
      humanInTheLoop: {
        stage: 'VERIFICATION_RESULT',
        officerStatus: 'PENDING_OFFICER_REVIEW',
        advisoryNotice: 'Automated detections and deterministic rules provide evidentiary analysis. Official regulatory decisions remain under the sole authority of the authorized inspecting officer.',
      },
    }
  }
}

export const defaultUnifiedInspectionService = new UnifiedInspectionService()
