/**
 * BisFindingsEngine — Synthesizes deterministic statutory compliance findings
 * from detected identifiers, candidate standards, QCO checks, and license verifications.
 *
 * CRITICAL STATUTORY SAFEGUARDS:
 * 1. Conservative evaluation: UNKNOWN evidence NEVER automatically produces POTENTIAL_NON_COMPLIANCE.
 * 2. Mandatory QCO violations require verifiable lack of operative certification.
 * 3. Provenance propagation: isDemoRecord reflects the underlying evidence data sources.
 * 4. Human-in-the-loop: Findings are advisory evidence for the human inspecting officer.
 */

import type {
  BisDetectedIdentifier,
  CandidateStandardAssociation,
  QcoApplicabilityResult,
  BisVerificationSummary,
  BisFinding,
  BisFindingStatus,
} from '@/types/bis-inspection'

export interface FindingsEngineInput {
  identifiers: BisDetectedIdentifier[]
  candidateStandards: CandidateStandardAssociation[]
  qcoChecks: QcoApplicabilityResult[]
  verifications: BisVerificationSummary[]
}

export class BisFindingsEngine {
  /**
   * Generates evidence-backed BIS compliance findings and determines overall BIS inspection status.
   */
  generateFindings(input: FindingsEngineInput): { findings: BisFinding[]; overallStatus: BisFindingStatus } {
    const findings: BisFinding[] = []

    const qco = input.qcoChecks?.[0] || (input as any).qcoResult || null
    const topStandard = input.candidateStandards[0] || null
    const cmlId = input.identifiers.find((i) => i.type === 'CML_NUMBER')
    const crsId = input.identifiers.find((i) => i.type === 'CRS_REGISTRATION')
    const isiMarkId = input.identifiers.find((i) => i.type === 'ISI_MARK')
    const cmlVerification = input.verifications.find((v) => v.identifierType === 'CML_NUMBER')
    const crsVerification = input.verifications.find((v) => v.identifierType === 'CRS_REGISTRATION')

    const isAnyDemo =
      (qco?.isDemoRecord ?? false) ||
      (topStandard?.isDemoRecord ?? false) ||
      input.verifications.some((v) => v.isDemoRecord) ||
      input.identifiers.some((i) => i.isDemoRecord)

    // ── SCENARIO 1: MANDATORY QCO IN FORCE ─────────────────────────────────────
    if (qco && qco.status === 'APPLICABLE' && qco.isMandatoryCertification === true) {
      const standardRef = qco.applicableStandards[0] || topStandard?.standardNumber || null

      if (!cmlId || cmlId.state === 'NOT_DETECTED') {
        // Mandatory QCO applies, but no CML license number is present on packaging
        findings.push({
          domain: 'BIS',
          status: 'POTENTIAL_NON_COMPLIANCE',
          severity: 'HIGH',
          code: 'BIS_QCO_MISSING_CERTIFICATION',
          title: 'Missing Mandatory BIS Certification for QCO Commodity',
          explanation: `This product category falls under mandatory BIS certification pursuant to ${qco.orderTitle || 'Quality Control Order'} (${qco.orderNumber || 'Statutory Order'}). The packaging does not exhibit a valid Bureau of Indian Standards CM/L certification number.`,
          recommendation: `Verify whether the manufacturer holds an operative BIS license for ${standardRef || 'the applicable Indian Standard'}. Under Section 16/17 of the BIS Act, 2016, mandatory QCO goods cannot be sold or distributed in India without the Standard Mark.`,
          evidence: `QCO in force: "${qco.orderTitle}". No CM/L license detected in packaging OCR.`,
          standardReference: standardRef,
          qcoReference: qco.orderNumber || qco.orderTitle,
          verificationResult: 'NOT_DETECTED',
          isDemoRecord: isAnyDemo,
        })
      } else if (cmlId.state === 'UNCERTAIN') {
        findings.push({
          domain: 'BIS',
          status: 'NEEDS_REVIEW',
          severity: 'MEDIUM',
          code: 'BIS_AMBIGUOUS_CML_DECLARATION',
          title: 'Ambiguous or Partial BIS License Marking',
          explanation: `A partial or ambiguous BIS CM/L reference was detected on the packaging ("${cmlId.detectedValue}"), but could not be parsed into a canonical 7-digit license code.`,
          recommendation: 'Inspect physical packaging to read the complete 7-digit CM/L number and verify on the BIS Care portal.',
          evidence: cmlId.evidenceReference || 'Partial CML text detected',
          standardReference: standardRef,
          qcoReference: qco.orderNumber || qco.orderTitle,
          verificationResult: 'UNCERTAIN',
          isDemoRecord: isAnyDemo,
        })
      } else if (cmlVerification) {
        // CML is detected and has been checked against the registry
        if (cmlVerification.status === 'VERIFIED') {
          findings.push({
            domain: 'BIS',
            status: 'CLEAR',
            severity: 'INFO',
            code: 'BIS_OPERATIVE_LICENSE_VERIFIED',
            title: 'Operative BIS Certification License Verified',
            explanation: `License ${cmlVerification.identifierValue} is registered and OPERATIVE for ${cmlVerification.details?.licenseeName || 'the manufacturer'} under ${cmlVerification.details?.standardNumber || standardRef || 'Indian Standards'}.`,
            recommendation: 'Ensure packaging marking strictly adheres to BIS marking fee guidelines and display parameters.',
            evidence: `Verified license: ${cmlVerification.identifierValue}. Status: OPERATIVE. Valid until: ${cmlVerification.details?.validUntil || 'N/A'}.`,
            standardReference: cmlVerification.details?.standardNumber || standardRef,
            qcoReference: qco.orderNumber || qco.orderTitle,
            verificationResult: 'OPERATIVE',
            isDemoRecord: cmlVerification.isDemoRecord,
          })
        } else {
          // Invalid, Expired, Suspended, or Cancelled
          const licStatus = cmlVerification.details?.status || 'INVALID'
          findings.push({
            domain: 'BIS',
            status: 'POTENTIAL_NON_COMPLIANCE',
            severity: 'CRITICAL',
            code: 'BIS_NON_OPERATIVE_LICENSE',
            title: `Non-Operative or Expired BIS License (${licStatus})`,
            explanation: `The declared license ${cmlVerification.identifierValue} is recorded as ${licStatus} in the BIS repository. Using a non-operative license on mandatory QCO commodities is an offense under the BIS Act, 2016.`,
            recommendation: 'Conduct formal inquiry with the licensee and issue notice for clarification regarding license validity.',
            evidence: `License ${cmlVerification.identifierValue} status: ${licStatus}. ${cmlVerification.details?.message || ''}`,
            standardReference: standardRef,
            qcoReference: qco.orderNumber || qco.orderTitle,
            verificationResult: licStatus,
            isDemoRecord: cmlVerification.isDemoRecord,
          })
        }
      }
    }

    // ── SCENARIO 2: QCO NOT YET EFFECTIVE ──────────────────────────────────────
    else if (qco && qco.status === 'NOT_YET_EFFECTIVE') {
      findings.push({
        domain: 'BIS',
        status: 'CLEAR',
        severity: 'LOW',
        code: 'BIS_QCO_FUTURE_EFFECTIVE_DATE',
        title: 'QCO Notified But Not Yet Effective',
        explanation: `${qco.orderTitle || 'The applicable QCO'} has been officially notified with an effective date of ${qco.effectiveDate || 'future date'}. Compliance is currently voluntary until the enforcement deadline.`,
        recommendation: 'Inform the manufacturer/packer of the upcoming mandatory compliance deadline.',
        evidence: `Notification: ${qco.orderTitle}. Effective date: ${qco.effectiveDate}.`,
        standardReference: qco.applicableStandards[0] || null,
        qcoReference: qco.orderNumber || qco.orderTitle,
        verificationResult: 'NOT_YET_EFFECTIVE',
        isDemoRecord: isAnyDemo,
      })
    }

    // ── SCENARIO 3: NO MANDATORY QCO (VOLUNTARY STANDARDS / OTHER COMMODITIES) ──
    else {
      if (cmlVerification) {
        if (cmlVerification.status === 'VERIFIED') {
          findings.push({
            domain: 'BIS',
            status: 'CLEAR',
            severity: 'INFO',
            code: 'BIS_VOLUNTARY_CERTIFICATION_VERIFIED',
            title: 'Voluntary BIS Certification Verified',
            explanation: `Manufacturer has obtained voluntary BIS ISI certification under license ${cmlVerification.identifierValue}. License is operative.`,
            recommendation: 'No action required.',
            evidence: `License ${cmlVerification.identifierValue} is OPERATIVE.`,
            standardReference: cmlVerification.details?.standardNumber || null,
            verificationResult: 'OPERATIVE',
            isDemoRecord: cmlVerification.isDemoRecord,
          })
        } else {
          findings.push({
            domain: 'BIS',
            status: 'POTENTIAL_NON_COMPLIANCE',
            severity: 'HIGH',
            code: 'BIS_UNAUTHORIZED_MARK_USE',
            title: 'Unauthorized Standard Mark Claim',
            explanation: `Packaging displays BIS CM/L license ${cmlVerification.identifierValue}, but verification indicates status ${cmlVerification.details?.status || 'INVALID'}. False use of the Standard Mark violates Section 14/15 of the BIS Act, 2016.`,
            recommendation: 'Issue notice regarding alleged misrepresentation of BIS certification.',
            evidence: `Declared: ${cmlVerification.identifierValue}. Verified status: ${cmlVerification.details?.status || 'INVALID'}.`,
            standardReference: null,
            verificationResult: cmlVerification.details?.status || 'INVALID',
            isDemoRecord: cmlVerification.isDemoRecord,
          })
        }
      } else if (crsVerification) {
        if (crsVerification.status === 'VERIFIED') {
          findings.push({
            domain: 'BIS',
            status: 'CLEAR',
            severity: 'INFO',
            code: 'BIS_CRS_REGISTRATION_VERIFIED',
            title: 'BIS Compulsory Registration (CRS) Verified',
            explanation: `Electronics CRS registration ${crsVerification.identifierValue} is verified and OPERATIVE.`,
            recommendation: 'Confirm brand name consistency with registration schedule.',
            evidence: `CRS registration: ${crsVerification.identifierValue}. Status: OPERATIVE.`,
            standardReference: null,
            verificationResult: 'OPERATIVE',
            isDemoRecord: crsVerification.isDemoRecord,
          })
        } else {
          findings.push({
            domain: 'BIS',
            status: 'POTENTIAL_NON_COMPLIANCE',
            severity: 'HIGH',
            code: 'BIS_CRS_INVALID_REGISTRATION',
            title: 'Non-Operative CRS Registration Number',
            explanation: `The declared CRS registration ${crsVerification.identifierValue} could not be validated or is inactive.`,
            recommendation: 'Verify registration details on the CRS portal.',
            evidence: `CRS number: ${crsVerification.identifierValue}. Status: ${crsVerification.details?.status || 'INVALID'}.`,
            standardReference: null,
            verificationResult: crsVerification.details?.status || 'INVALID',
            isDemoRecord: crsVerification.isDemoRecord,
          })
        }
      } else if (topStandard && (topStandard.state === 'NEEDS_REVIEW' || topStandard.standardNumber === 'NOT_DETERMINED')) {
        const isNotDetermined = topStandard.standardNumber === 'NOT_DETERMINED'
        findings.push({
          domain: 'BIS',
          status: 'NEEDS_REVIEW',
          severity: isNotDetermined ? 'INFO' : 'LOW',
          code: isNotDetermined ? 'BIS_NO_MANDATORY_QCO' : 'BIS_UNVERIFIED_STANDARD_CLAIM',
          title: isNotDetermined ? 'No Mandatory Quality Control Order Applicable' : 'Unverified Indian Standard Reference',
          explanation: isNotDetermined
            ? 'Commodity does not fall under an active mandatory Quality Control Order (QCO). Indian Standard is not determined; voluntary certification may apply. Officer verification pending.'
            : `Packaging cites "${topStandard.standardNumber}", which could not be matched with active catalog records.`,
          recommendation: isNotDetermined
            ? 'No mandatory BIS certification required. Voluntary BIS ISI mark may be sought by manufacturer. Pending officer verification.'
            : 'Officer to manually verify if standard has been revised or withdrawn.',
          evidence: topStandard.supportingEvidence || 'Commodity classification evaluated; no mandatory QCO schedule matched.',
          standardReference: isNotDetermined ? null : topStandard.standardNumber,
          verificationResult: isNotDetermined ? 'NOT_DETERMINED' : 'NEEDS_REVIEW',
          isDemoRecord: isAnyDemo,
        })
      } else {
        // No QCO and no BIS claims made
        findings.push({
          domain: 'BIS',
          status: 'CLEAR',
          severity: 'INFO',
          code: 'BIS_NOT_MANDATED_NO_CLAIMS',
          title: 'No Mandatory BIS Scheme Applicable',
          explanation: 'Product does not fall under an active mandatory Quality Control Order, and no voluntary BIS marks were claimed.',
          recommendation: 'Legal Metrology compliance remains the primary governing packaging framework.',
          evidence: 'No mandatory QCO detected; no BIS license declarations detected.',
          standardReference: null,
          verificationResult: 'NOT_APPLICABLE',
          isDemoRecord: isAnyDemo,
        })
      }
    }

    // ── DERIVE OVERALL BIS STATUS ──────────────────────────────────────────────
    let overallStatus: BisFindingStatus = 'CLEAR'
    if (findings.some((f) => f.status === 'POTENTIAL_NON_COMPLIANCE')) {
      overallStatus = 'POTENTIAL_NON_COMPLIANCE'
    } else if (findings.some((f) => f.status === 'NEEDS_REVIEW')) {
      overallStatus = 'NEEDS_REVIEW'
    } else if (findings.every((f) => f.status === 'NOT_APPLICABLE')) {
      overallStatus = 'NOT_APPLICABLE'
    }

    return { findings, overallStatus }
  }
}

export const defaultBisFindingsEngine = new BisFindingsEngine()
