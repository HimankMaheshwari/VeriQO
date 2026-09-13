/**
 * Authority Verification Service (SIH PS107)
 *
 * Isolated frontend service boundary for Officer QCO verification, evidence traceability,
 * and Legal Metrology ↔ BIS Standards correlation.
 *
 * NOTE FOR BACKEND/AI DEVELOPERS (Himank / Parth):
 * This service implements the AuthorityVerificationService contract.
 * When official QCO database endpoints or automated cross-reference APIs are ready,
 * replace this frontend service with API fetch calls without modifying UI components.
 */

import {
  type AuthorityVerificationService,
  type QcoReferenceInfo,
  type VerificationEvidenceItem,
  type OfficerVerificationRecord,
} from '@/types/verification'

export class MockAuthorityVerificationService implements AuthorityVerificationService {
  public getQcoReferenceForProduct(
    productName: string,
    category?: string | null
  ): QcoReferenceInfo {
    const p = productName.toLowerCase()
    const c = (category || '').toLowerCase()

    if (p.includes('water') || c.includes('food') || c.includes('beverage')) {
      return {
        standardNumber: 'IS 14543:2016',
        standardTitle: 'Packaged Drinking Water (Other Than Packaged Natural Mineral Water)',
        qcoNotificationNumber: 'S.O. 3932(E)',
        issuingMinistry: 'Ministry of Consumer Affairs & FSSAI',
        verificationStatus: 'Mandatory BIS Scheme I (ISI Mark) Under Central QCO',
        isMandatory: true,
      }
    }

    if (p.includes('led') || p.includes('bulb') || p.includes('lamp') || c.includes('electronics')) {
      return {
        standardNumber: 'IS 16102 (Part 1):2012',
        standardTitle: 'Self-Ballasted LED Lamps for General Lighting Services',
        qcoNotificationNumber: 'S.O. 2357(E)',
        issuingMinistry: 'Ministry of Electronics and Information Technology (MeitY)',
        verificationStatus: 'Compulsory Registration Scheme (CRS Scheme II)',
        isMandatory: true,
      }
    }

    if (p.includes('gold') || p.includes('jewel') || c.includes('jewellery') || c.includes('precious')) {
      return {
        standardNumber: 'IS 1417:2016',
        standardTitle: 'Gold and Gold Alloys, Jewellery/Artefacts — Fineness and Marking',
        qcoNotificationNumber: 'S.O. 50(E)',
        issuingMinistry: 'Ministry of Consumer Affairs, Food and Public Distribution',
        verificationStatus: 'Mandatory 3-Mark Hallmarking with 6-digit HUID',
        isMandatory: true,
      }
    }

    if (p.includes('cement') || c.includes('cement') || c.includes('construction')) {
      return {
        standardNumber: 'IS 269:2015',
        standardTitle: 'Ordinary Portland Cement Specification (33, 43 and 53 Grade)',
        qcoNotificationNumber: 'S.O. 883(E)',
        issuingMinistry: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
        verificationStatus: 'Mandatory BIS Scheme I (ISI Mark)',
        isMandatory: true,
      }
    }

    if (p.includes('toy') || c.includes('toy')) {
      return {
        standardNumber: 'IS 9873 (Part 1):2019',
        standardTitle: 'Safety of Toys — Mechanical and Physical Properties',
        qcoNotificationNumber: 'S.O. 853(E)',
        issuingMinistry: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
        verificationStatus: 'Mandatory BIS Scheme I (ISI Mark)',
        isMandatory: true,
      }
    }

    // Default fallback when no specific standard is identified in demo catalog
    return {
      standardNumber: 'Not available in demo data',
      standardTitle: 'Commodity QCO cross-reference pending authoritative BIS registry sync',
      qcoNotificationNumber: 'Not available in demo data',
      issuingMinistry: 'Not available in demo data',
      verificationStatus: 'Unclassified / Pending Officer Verification',
      isMandatory: false,
    }
  }

  public getTraceabilityEvidenceItems(
    inspectionId: string,
    scanId?: string | null,
    productName?: string
  ): VerificationEvidenceItem[] {
    const timestamp = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const items: VerificationEvidenceItem[] = [
      {
        id: `ev-lmpc-1`,
        source: 'Physical Package Label OCR',
        documentReference: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        clauseReference: 'Rule 6(1)(a) & Rule 6(1)(b)',
        evidenceText: `Extracted commodity name: "${productName || 'Packaged Commodity'}" and manufacturer declaration from front packaging label scan.`,
        originatingWorkflow: 'Legal Metrology OCR Pipeline',
        timestamp,
        verificationStatus: 'VERIFIED_BY_OFFICER',
      },
      {
        id: `ev-lmpc-2`,
        source: 'Maximum Retail Price Declaration',
        documentReference: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        clauseReference: 'Rule 6(1)(e) — Inclusive of all taxes',
        evidenceText:
          'MRP declaration and Unit Sale Price (USP) formatting evaluated against statutory syntax.',
        originatingWorkflow: 'Legal Metrology Rule Engine',
        timestamp,
        verificationStatus: 'VERIFIED_BY_OFFICER',
      },
      {
        id: `ev-bis-1`,
        source: 'BIS Quality Control Orders Catalog',
        documentReference: 'Bureau of Indian Standards Act, 2016',
        clauseReference: 'Section 16 — Mandatory Conformity Assessment',
        evidenceText:
          'Cross-referenced product commodity classification against central Quality Control Orders for mandatory certification markings.',
        originatingWorkflow: 'BIS Standards Cross-Reference Engine',
        timestamp,
        verificationStatus: 'AI_ADVISORY',
      },
      {
        id: `ev-photo-1`,
        source: 'Primary Package Evidence Media',
        documentReference: scanId ? `Scan Reference #${scanId}` : `Inspection #${inspectionId}`,
        clauseReference: 'Inspection Evidence Media Attachment',
        evidenceText:
          'High-resolution packaging panel photograph attached to evidence dossier for forensic verification.',
        originatingWorkflow: 'Field Inspection Scanner',
        timestamp,
        verificationStatus: 'PENDING_VERIFICATION',
      },
    ]

    return items
  }

  public getInitialVerificationRecord(inspectionId: string): OfficerVerificationRecord {
    return {
      inspectionId,
      status: 'PENDING_VERIFICATION',
      checklist: {
        checkDeclarations: true,
        checkMrpUsp: true,
        checkIsiMark: false,
        checkManufacturerAddress: false,
        checkSamplingProtocol: false,
      },
    }
  }
}

export const authorityVerificationService = new MockAuthorityVerificationService()
