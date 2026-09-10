/**
 * ConsumerDocumentService — Server-Side Domain Service for Consumer Result Documents
 *
 * Implements strict RBAC, IDOR prevention, status gating, and data redaction
 * for consumer-facing compliance reports and regulatory orders.
 */

import { prisma } from '../prisma'
import type { PrismaClient, Role, AuthorityDecision } from '@prisma/client'
import { getConsumerSafeStatus, getSafeInspectionDecisionSummary } from './status-projection'
import { defaultConsumerPdfService } from './consumer-pdf-service'
import crypto from 'crypto'

export class ConsumerDocumentAccessError extends Error {
  constructor(message: string = 'Complaint not found') {
    super(message)
    this.name = 'ConsumerDocumentAccessError'
  }
}

export class ConsumerDocumentStatusGatedError extends Error {
  constructor(message: string = 'Official documents are not accessible until the regulatory case reaches final resolution.') {
    super(message)
    this.name = 'ConsumerDocumentStatusGatedError'
  }
}

export type ConsumerDocType = 'compliance-report' | 'regulatory-order'

const FIELD_LABEL_MAP: Record<string, string> = {
  product_name: 'Product / Commodity Name',
  brand: 'Brand Name',
  manufacturer: 'Manufacturer Name',
  packer: 'Packer Name',
  importer: 'Importer Name',
  address: 'Complete Physical Address',
  net_quantity: 'Net Quantity / Weight / Volume',
  mrp: 'Maximum Retail Price (MRP)',
  unit_sale_price: 'Unit Sale Price (USP)',
  date_of_manufacture: 'Date of Manufacture',
  date_of_packing: 'Date of Packing',
  best_before: 'Best Before / Expiry Date',
  customer_care: 'Customer Care Details',
  country_of_origin: 'Country of Origin',
  batch_number: 'Batch / Lot Number',
}

export class ConsumerDocumentService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Validates consumer ownership and retrieves the authoritative complaint and case graph.
   * Enforces IDOR protection: returns null / throws 404 on unowned to prevent ID enumeration.
   */
  private async getComplaintWithAuth(complaintId: string, user: { id: string; role: Role }) {
    const complaint = await this.db.complaint.findUnique({
      where: { id: complaintId },
      include: {
        consumer: { select: { id: true, name: true, email: true } },
        product: true,
        scan: {
          include: {
            extractedDeclarations: { orderBy: { fieldName: 'asc' } },
          },
        },
        case: {
          include: {
            inspections: {
              include: {
                decision: true,
                complianceChecks: {
                  include: {
                    rule: {
                      include: {
                        versions: { orderBy: { versionNumber: 'desc' } },
                      },
                    },
                  },
                  orderBy: { checkedAt: 'desc' },
                },
                violations: {
                  include: { rule: true },
                  orderBy: { detectedAt: 'desc' },
                },
                product: true,
                scan: {
                  include: {
                    extractedDeclarations: { orderBy: { fieldName: 'asc' } },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        inspection: {
          include: {
            decision: true,
            complianceChecks: {
              include: {
                rule: {
                  include: {
                    versions: { orderBy: { versionNumber: 'desc' } },
                  },
                },
              },
              orderBy: { checkedAt: 'desc' },
            },
            violations: {
              include: { rule: true },
              orderBy: { detectedAt: 'desc' },
            },
            product: true,
            scan: {
              include: {
                extractedDeclarations: { orderBy: { fieldName: 'asc' } },
              },
            },
          },
        },
      },
    })

    if (!complaint) {
      throw new ConsumerDocumentAccessError('Complaint not found')
    }

    // Strict IDOR Protection:
    // If caller is a CONSUMER, they can ONLY access their own complaint.
    // Authority Officers, Senior Authority, and Admins are permitted to view.
    if (user.role === 'CONSUMER' && complaint.consumerId !== user.id) {
      throw new ConsumerDocumentAccessError('Complaint not found')
    }

    return complaint
  }

  /**
   * Resolves the finalized inspection with an officer decision.
   */
  private resolveFinalizedInspection(complaint: any) {
    // 1. From linked case inspections
    if (complaint.case?.inspections && complaint.case.inspections.length > 0) {
      const finalized = complaint.case.inspections.find((i: any) => i.decision && i.status === 'CLOSED')
      if (finalized) return finalized
      const withDecision = complaint.case.inspections.find((i: any) => i.decision)
      if (withDecision) return withDecision
    }

    // 2. Direct complaint.inspection
    if (complaint.inspection && complaint.inspection.decision) {
      return complaint.inspection
    }

    return null
  }

  /**
   * Lists available consumer documents for a given complaint, enforcing status gating.
   */
  async getAvailableDocuments(complaintId: string, user: { id: string; role: Role }) {
    const complaint = await this.getComplaintWithAuth(complaintId, user)

    const safeStatus = getConsumerSafeStatus(complaint.case?.status, complaint.status)
    const finalizedInspection = this.resolveFinalizedInspection(complaint)

    const isTerminal = safeStatus.isTerminal && ['RESOLVED', 'CLOSED'].includes(complaint.case?.status || complaint.status)
    const hasFinalDecision = !!finalizedInspection?.decision

    const areDocumentsAvailable = isTerminal && hasFinalDecision

    const documents = areDocumentsAvailable
      ? [
          {
            id: 'compliance-report',
            docType: 'compliance-report' as ConsumerDocType,
            title: 'Statutory Packaging Compliance Report',
            format: 'PDF',
            isAvailable: true,
            downloadUrl: `/api/v1/consumer/complaints/${complaint.id}/documents/compliance-report?download=true`,
            viewUrl: `/api/v1/consumer/complaints/${complaint.id}/documents/compliance-report`,
            issuedAt: finalizedInspection.decision.decidedAt,
          },
          {
            id: 'regulatory-order',
            docType: 'regulatory-order' as ConsumerDocType,
            title: 'Official Regulatory Determination Order',
            format: 'PDF',
            isAvailable: true,
            downloadUrl: `/api/v1/consumer/complaints/${complaint.id}/documents/regulatory-order?download=true`,
            viewUrl: `/api/v1/consumer/complaints/${complaint.id}/documents/regulatory-order`,
            issuedAt: finalizedInspection.decision.decidedAt,
          },
        ]
      : []

    return {
      complaintRef: complaint.complaintRef,
      caseNumber: complaint.case?.caseNumber || null,
      statusKey: safeStatus.key,
      isTerminal: safeStatus.isTerminal,
      areDocumentsAvailable,
      availabilityNotice: areDocumentsAvailable
        ? null
        : 'Official compliance reports and regulatory determination orders will be available upon conclusion of the regulatory review.',
      documents,
    }
  }

  /**
   * Generates a sanitized consumer PDF document on-demand.
   * Strictly validates session, ownership, status gating, and inspection finality.
   */
  async generateDocument(
    complaintId: string,
    docType: ConsumerDocType,
    user: { id: string; role: Role }
  ) {
    const complaint = await this.getComplaintWithAuth(complaintId, user)

    // Status Gate Check: Case must be in RESOLVED or CLOSED
    const caseStatus = complaint.case?.status || complaint.status
    if (!['RESOLVED', 'CLOSED'].includes(caseStatus)) {
      throw new ConsumerDocumentStatusGatedError(
        'Official documents are not accessible until the regulatory case reaches final resolution.'
      )
    }

    const inspection = this.resolveFinalizedInspection(complaint)
    if (!inspection || !inspection.decision) {
      throw new ConsumerDocumentStatusGatedError(
        'No finalized regulatory decision has been recorded for this case.'
      )
    }

    const issuedAt = inspection.decision.decidedAt || new Date()
    const caseNumber = complaint.case?.caseNumber || `CASE-${complaint.complaintRef.toUpperCase()}`
    const product = inspection.product || complaint.product || inspection.scan || complaint.scan

    if (docType === 'compliance-report') {
      const documentRef = `REP-CR-${complaint.complaintRef.toUpperCase().slice(-6)}-${Date.now().toString(36).toUpperCase()}`

      // Extract declarations from inspection scan or complaint scan
      const scan = inspection.scan || complaint.scan
      const rawDeclarations = scan?.extractedDeclarations || []

      const declarations = rawDeclarations.map((d: any) => ({
        fieldName: d.fieldName,
        label: FIELD_LABEL_MAP[d.fieldName] || d.fieldName,
        declaredValue: d.normalizedValue || d.rawValue || '—',
        detectionStatus: d.detectionStatus,
      }))

      // Process compliance checks (historical rule version locked)
      const complianceChecks = inspection.complianceChecks.map((check: any) => {
        let matchedVersion = null
        if (check.rule?.versions && check.rule.versions.length > 0) {
          if (check.ruleVersionNumber) {
            matchedVersion = check.rule.versions.find((v: any) => v.versionNumber === check.ruleVersionNumber) ?? null
          }
          if (!matchedVersion) {
            matchedVersion = check.rule.versions[0] ?? null
          }
        }

        const evalDetails = (check.evaluationDetails as any) || {}

        return {
          ruleNumber: check.rule.ruleNumber,
          ruleTitle: check.rule.title,
          ruleVersionNumber: check.ruleVersionNumber ?? matchedVersion?.versionNumber ?? 1,
          status: check.status,
          isAdvisoryOnly: check.status === 'WARNING',
          summary: evalDetails.summary || check.rule.requirement,
          sourceReference: check.rule.sourceReference,
        }
      })

      // Formal violations only (omits internal notes)
      const violations = inspection.violations.map((v: any) => ({
        ruleNumber: v.rule?.ruleNumber || 'Rule Violation',
        severity: v.severity,
        description: v.description,
        remediationGuidance: v.remediationGuidance,
      }))

      // Neutral statutory summary text
      const summaryText =
        getSafeInspectionDecisionSummary(inspection.decision.decision) ||
        'Official regulatory examination recorded by the Directorate of Legal Metrology.'

      // Cryptographic integrity hash
      const hashPayload = JSON.stringify({
        documentRef,
        complaintRef: complaint.complaintRef,
        caseNumber,
        ruling: inspection.decision.decision,
        checksCount: complianceChecks.length,
        violationsCount: violations.length,
        issuedAt: issuedAt.toISOString(),
      })
      const securityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

      const buffer = await defaultConsumerPdfService.generateConsumerCompliancePdf({
        documentRef,
        complaintRef: complaint.complaintRef,
        caseNumber,
        issuedAt,
        securityHash,
        product: {
          name: product?.name || product?.identifiedProductName || 'Packaged Commodity',
          brand: product?.brand || product?.identifiedBrand || null,
          category: product?.category || product?.identifiedCategory || null,
          manufacturer: product?.manufacturer || product?.identifiedManufacturer || null,
          packer: product?.packer || null,
          importer: product?.importer || null,
          countryOfOrigin: product?.countryOfOrigin || null,
        },
        declarations,
        complianceChecks,
        violations,
        decision: {
          ruling: inspection.decision.decision,
          summaryText,
          decidedAt: issuedAt,
        },
      })

      return {
        buffer,
        filename: `VeriQO-Compliance-Report-${complaint.complaintRef.toUpperCase()}.pdf`,
        documentRef,
        securityHash,
        contentType: 'application/pdf',
      }
    }

    if (docType === 'regulatory-order') {
      const orderRef = `ORD-LM-${complaint.complaintRef.toUpperCase().slice(-6)}-${Date.now().toString(36).toUpperCase()}`

      const ruling = inspection.decision.decision as AuthorityDecision
      const rulingTitle =
        ruling === 'COMPLIANT'
          ? 'Packaged Commodity Declared Fully Compliant'
          : ruling === 'NON_COMPLIANT'
          ? 'Statutory Non-Compliance Recorded & Corrective Action Directed'
          : ruling === 'DISMISSED'
          ? 'Complaint Concluded & Disposed Without Statutory Action'
          : 'Further Investigation Directed'

      const statutorySummary =
        getSafeInspectionDecisionSummary(ruling) ||
        'The packaged commodity has been evaluated under the Legal Metrology (Packaged Commodities) Rules, 2011.'

      const statutoryDirectives: string[] = []
      if (ruling === 'NON_COMPLIANT') {
        statutoryDirectives.push(
          'Notice of non-compliance registered under Section 39 of the Legal Metrology Act, 2009.'
        )
        if (inspection.violations.length > 0) {
          for (const v of inspection.violations) {
            if (v.remediationGuidance) {
              statutoryDirectives.push(`Remediation for ${v.rule?.ruleNumber || 'violation'}: ${v.remediationGuidance}`)
            }
          }
        }
        statutoryDirectives.push('Manufacturer and packer directed to rectify packaging declarations immediately.')
      } else if (ruling === 'COMPLIANT') {
        statutoryDirectives.push('Packaging declarations verified as fully conformant to statutory metric standards.')
        statutoryDirectives.push('Case docket formally resolved and marked closed in regulatory registry.')
      } else {
        statutoryDirectives.push('Matter concluded and recorded in the official Legal Metrology registry.')
      }

      const hashPayload = JSON.stringify({
        orderRef,
        complaintRef: complaint.complaintRef,
        caseNumber,
        ruling,
        issuedAt: issuedAt.toISOString(),
      })
      const securityHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

      const buffer = await defaultConsumerPdfService.generateRegulatoryOrderPdf({
        orderRef,
        complaintRef: complaint.complaintRef,
        caseNumber,
        issuedAt,
        securityHash,
        complainantSubject: complaint.title,
        product: {
          name: product?.name || product?.identifiedProductName || 'Packaged Commodity',
          brand: product?.brand || product?.identifiedBrand || null,
          manufacturer: product?.manufacturer || product?.identifiedManufacturer || null,
          category: product?.category || product?.identifiedCategory || null,
        },
        determination: {
          ruling,
          rulingTitle,
          statutorySummary,
          decidedAt: issuedAt,
          effectiveDate: issuedAt,
        },
        statutoryDirectives,
        legalAuthority: {
          actTitle: 'Legal Metrology Act, 2009 (Act No. 1 of 2010)',
          rulesTitle: 'Legal Metrology (Packaged Commodities) Rules, 2011',
          competentAuthority: 'Directorate of Legal Metrology, Department of Consumer Affairs',
        },
      })

      return {
        buffer,
        filename: `VeriQO-Regulatory-Order-${complaint.complaintRef.toUpperCase()}.pdf`,
        documentRef: orderRef,
        securityHash,
        contentType: 'application/pdf',
      }
    }

    throw new Error(`Unsupported document type: ${docType}`)
  }
}

export const defaultConsumerDocumentService = new ConsumerDocumentService()
