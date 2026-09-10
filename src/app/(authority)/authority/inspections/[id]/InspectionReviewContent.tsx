'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ComplianceBadge,
  IdentificationStatusBadge,
  AuthorityDecisionBadge,
  ViolationSeverityBadge,
  Badge,
} from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'
import {
  Scale,
  FileText,
  Package,
  Image as ImageIcon,
  AlertTriangle,
  Globe,
  CheckCircle,
  Layers,
  Search,
  ExternalLink,
  ScanLine,
} from 'lucide-react'
import { InspectionActionToolbar } from './InspectionActionToolbar'
import { EvidenceTraceabilityModal } from './EvidenceTraceabilityModal'
import { EvidenceTimelineCard } from './EvidenceTimelineCard'
import type { EvidenceTimelineItem } from '@/lib/inspections/types'

const FIELD_LABELS: Record<string, string> = {
  product_name: 'Product / Commodity Name',
  brand: 'Brand Name',
  manufacturer: 'Manufacturer Name',
  packer: 'Packer Name',
  importer: 'Importer Name',
  address: 'Physical Address',
  net_quantity: 'Net Quantity / Weight / Volume',
  mrp: 'Maximum Retail Price (MRP)',
  date_of_manufacture: 'Date of Manufacture',
  date_of_packing: 'Date of Packing',
  best_before: 'Best Before / Expiry Date',
  customer_care: 'Customer Care Details',
  country_of_origin: 'Country of Origin',
  batch_number: 'Batch / Lot Number',
}

interface InspectionReviewContentProps {
  inspection: any
  productName: string
  brandName: string
  scan: any
  complianceChecks: any[]
  violations: any[]
  onlineVerifications: any[]
  evidenceList: any[]
  decision: any
  userRole: string
  initialTimeline: EvidenceTimelineItem[]
}

export function InspectionReviewContent({
  inspection,
  productName,
  brandName,
  scan,
  complianceChecks,
  violations,
  onlineVerifications,
  evidenceList,
  decision,
  userRole,
  initialTimeline,
}: InspectionReviewContentProps) {
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null)
  const [selectedOnlineDiscrepancyId, setSelectedOnlineDiscrepancyId] = useState<string | null>(null)

  const latestReport = inspection.reports?.[0] || null

  return (
    <div>
      {/* Interactive Action Toolbar */}
      <InspectionActionToolbar
        inspectionId={inspection.id}
        currentStatus={inspection.status}
        hasScan={Boolean(scan)}
        scanId={inspection.scanId}
        existingDecision={
          decision
            ? {
                decision: decision.decision,
                remarks: decision.remarks,
                decidedAt: decision.decidedAt,
                officerName: decision.officer?.name,
              }
            : null
        }
        userRole={userRole}
        complianceChecks={complianceChecks}
        latestReport={latestReport}
        hasViolations={violations.length > 0 || complianceChecks.some((c: any) => c.status === 'FAIL')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)' }}>
        {/* Left Column: Primary Review Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* 1. Product & Packaging Physical Overview */}
          {scan ? (
            <Card>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={18} style={{ color: 'var(--brand-400)' }} />
                  Physical Product &amp; Packaging Identity
                </CardTitle>
                <IdentificationStatusBadge status={scan.identificationStatus || 'PENDING'} />
              </CardHeader>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--space-4)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Identified Commodity</div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginTop: 2 }}>
                    {productName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Brand</div>
                  <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>{brandName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Category</div>
                  <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>
                    {scan.identifiedCategory || 'Packaged Commodity'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Declared Manufacturer</div>
                  <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>{scan.identifiedManufacturer || '—'}</div>
                </div>
              </div>

              {/* Packaging images */}
              {scan.images?.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      marginBottom: 'var(--space-2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ImageIcon size={14} /> Attached Physical Packaging Images ({scan.images.length})
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
                    {scan.images.map((img: any) => (
                      <a
                        key={img.id}
                        href={`/api/v1/files/${img.storageKey.replace(/\\/g, '/')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          width: 84,
                          height: 84,
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '1px solid var(--border-default)',
                          flexShrink: 0,
                          display: 'block',
                          background: 'var(--bg-elevated)',
                        }}
                      >
                        <img
                          src={`/api/v1/files/${img.storageKey.replace(/\\/g, '/')}`}
                          alt={img.originalFilename}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div
                style={{
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-950)',
                    border: '1px solid var(--brand-800)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-400)',
                  }}
                >
                  <ScanLine size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    No Physical Commodity Scan Linked
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 460, marginTop: 4 }}>
                    Photograph or upload commodity packaging labels to automatically extract declarations, attach packaging photos, and run deterministic Legal Metrology compliance checks.
                  </div>
                </div>
                <Link
                  href={`/authority/scan?inspectionId=${inspection.id}`}
                  style={{ textDecoration: 'none', marginTop: 'var(--space-2)' }}
                >
                  <Button variant="primary" id="launch-scanner-cta-btn">
                    <ScanLine size={16} /> Launch Product Scanner
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* 2. Legal Metrology Compliance Checks (Phase 3A/3B Deterministic Results) */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={18} style={{ color: 'var(--brand-400)' }} />
                Legal Metrology Statutory Compliance Checks ({complianceChecks.length})
              </CardTitle>
              {complianceChecks.length > 0 && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Deterministic Engine &bull; Historical Rule Versions Locked
                </span>
              )}
            </CardHeader>

            {complianceChecks.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Scale size={32} style={{ margin: '0 auto var(--space-2)', opacity: 0.4 }} />
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  No compliance checks evaluated yet. Click <strong>&ldquo;Run Compliance Analysis&rdquo;</strong> above to execute the statutory rule engine against physical packaging declarations.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {complianceChecks.map((check: any) => {
                  const details = (check.evaluationDetails as any) || {}
                  return (
                    <div
                      key={check.id}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 'var(--text-xs)', color: 'var(--brand-300)' }}>
                            {check.rule?.ruleNumber}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>
                            v{check.ruleVersionNumber ?? 1}
                          </span>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                            {check.rule?.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ComplianceBadge status={check.status} />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedCheckId(check.id)}
                            style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
                          >
                            <Search size={12} style={{ marginRight: 4 }} /> Evidence Trace
                          </Button>
                        </div>
                      </div>

                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>
                        {details.summary || check.rule?.requirement}
                      </div>

                      {/* Statutory citation */}
                      {check.rule?.sourceReference && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Source: {check.rule.sourceReference}
                        </div>
                      )}

                      {/* Advisory note for WARNING */}
                      {check.status === 'WARNING' && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: '4px 8px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-warning)',
                          }}
                        >
                          <strong>Advisory Finding:</strong> Display/legibility recommendation only. Zero formal legal violation records created.
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* 3. Formal Violations Panel */}
          {violations.length > 0 && (
            <Card style={{ borderColor: 'var(--color-error)' }}>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-error)' }}>
                  <AlertTriangle size={18} />
                  Formal Statutory Violations Identified ({violations.length})
                </CardTitle>
                <Badge variant="error">{violations.length} Critical/High</Badge>
              </CardHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {violations.map((violation: any) => (
                  <div
                    key={violation.id}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>
                        {violation.rule?.ruleNumber}
                      </span>
                      <ViolationSeverityBadge severity={violation.severity} />
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 4 }}>
                      {violation.description}
                    </div>
                    {violation.remediationGuidance && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        <strong>Statutory Remediation:</strong> {violation.remediationGuidance}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 4. Phase 3C Online & E-commerce Verification Findings */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={18} style={{ color: 'var(--brand-400)' }} />
                Phase 3C Online / E-commerce Verification Evidence ({onlineVerifications.length})
              </CardTitle>
              {onlineVerifications.length > 0 && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  SHA-256 Snapshots &bull; Cross-Verification Evidence
                </span>
              )}
            </CardHeader>

            {onlineVerifications.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Globe size={32} style={{ margin: '0 auto var(--space-2)', opacity: 0.4 }} />
                <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                  No online e-commerce listings audited yet for this product.
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Click <strong>&ldquo;Audit E-Commerce&rdquo;</strong> in the toolbar above to cross-verify an online listing (Amazon, Blinkit, Flipkart, etc.) against physical packaging declarations.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {onlineVerifications.map((v: any) => (
                  <div
                    key={v.id}
                    style={{
                      padding: 'var(--space-4)',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <div>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{v.domain}</span>
                        <a
                          href={v.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-link)', marginLeft: 8 }}
                        >
                          View Listing ↗
                        </a>
                      </div>
                      <Badge variant={v.overallMatchStatus === 'MATCH' ? 'success' : v.overallMatchStatus === 'MISMATCH' ? 'error' : 'default'}>
                        {v.overallMatchStatus}
                      </Badge>
                    </div>

                    {/* Snapshot SHA-256 Audit */}
                    {v.snapshot && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 'var(--space-3)' }}>
                        Audit Hash: {v.snapshot.contentHash.slice(0, 24)}... | HTTP {v.snapshot.httpStatus} | Verified: {formatDateTime(v.verifiedAt)}
                      </div>
                    )}

                    {/* Discrepancies */}
                    {v.discrepancies?.length > 0 ? (
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--color-error)', marginBottom: 4 }}>
                          Detected Discrepancies ({v.discrepancies.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {v.discrepancies.map((d: any) => (
                            <div
                              key={d.id}
                              style={{
                                fontSize: 'var(--text-xs)',
                                padding: '8px 10px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                borderRadius: 4,
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-error)' }}>
                                  {d.discrepancyType} — {d.fieldName}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{d.message}</div>
                                {d.statutoryReference && (
                                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                                    Statutory Authority: {d.statutoryReference}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedOnlineDiscrepancyId(d.id)}
                                style={{ fontSize: '11px', padding: '2px 8px', height: '26px', flexShrink: 0, marginLeft: 8 }}
                              >
                                Trace Source
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', marginTop: 4 }}>
                        ✓ Online listing matches physical packaging declarations with 0 discrepancies.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 5. Physical Declarations Table (14 Statutory Fields) */}
          {scan?.extractedDeclarations && (
            <Card>
              <CardHeader>
                <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} style={{ color: 'var(--brand-400)' }} />
                  Extracted Packaging Declarations ({scan.extractedDeclarations.length})
                </CardTitle>
              </CardHeader>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Mandatory Declaration</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Extracted Value</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Confidence</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scan.extractedDeclarations.map((decl: any) => (
                      <tr key={decl.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 'var(--font-medium)' }}>
                          {FIELD_LABELS[decl.fieldName] ?? decl.fieldName}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                          {decl.normalizedValue || decl.rawValue || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                          {decl.confidence ? `${Math.round(decl.confidence * 100)}%` : '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <Badge
                            variant={
                              decl.detectionStatus === 'DETECTED'
                                ? 'success'
                                : decl.detectionStatus === 'NOT_DETECTED'
                                ? 'error'
                                : 'default'
                            }
                          >
                            {decl.detectionStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Right Sidebar: Inspection Metadata, Official Decision & Evidence Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Official Final Decision Card */}
          <Card style={{ borderColor: decision ? 'var(--brand-500)' : 'var(--border-default)' }}>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} style={{ color: 'var(--brand-400)' }} />
                Official Final Decision
              </CardTitle>
            </CardHeader>
            {decision ? (
              <div>
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <AuthorityDecisionBadge decision={decision.decision} />
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Decided By: <strong>{decision.officer?.name || 'Authorized Officer'}</strong>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                  Date: {formatDateTime(decision.decidedAt)}
                </div>
                {decision.remarks && (
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <strong>Directives / Remarks:</strong>
                    <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{decision.remarks}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Decision pending. Review compliance checks and click <strong>&ldquo;Record Final Decision&rdquo;</strong> when ready to conclude this statutory file.
              </div>
            )}
          </Card>

          {/* File Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} style={{ color: 'var(--brand-400)' }} />
                Inspection File Information
              </CardTitle>
            </CardHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Inspecting Officer</div>
                <div style={{ fontWeight: 'var(--font-medium)', marginTop: 2 }}>
                  {inspection.officer?.name} ({inspection.officer?.email})
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Created Timestamp</div>
                <div style={{ marginTop: 2 }}>{formatDateTime(inspection.createdAt)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Last Updated</div>
                <div style={{ marginTop: 2 }}>{formatDateTime(inspection.updatedAt)}</div>
              </div>
              {inspection.notes && (
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Officer Initial Notes</div>
                  <div style={{ marginTop: 2, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {inspection.notes}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Phase 4C Official Inspection Reports Card */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} style={{ color: 'var(--brand-400)' }} />
                Official Inspection Reports
              </CardTitle>
            </CardHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
              {inspection.reports && inspection.reports.length > 0 ? (
                inspection.reports.map((rep: any) => (
                  <div
                    key={rep.id}
                    style={{
                      padding: 'var(--space-3)',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rep.reportRef}</span>
                      <Badge variant="info">PDF</Badge>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Generated: {formatDateTime(rep.generatedAt)}
                    </div>
                    {rep.fileSizeBytes && (
                      <div style={{ color: 'var(--text-muted)' }}>
                        Size: {Math.round(rep.fileSizeBytes / 1024)} KB
                      </div>
                    )}
                    <a
                      href={`/api/v1/inspections/${inspection.id}/report?reportRef=${rep.reportRef}&download=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', marginTop: 4 }}
                    >
                      <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                        Download PDF Report
                      </Button>
                    </a>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>
                  No official PDF report generated yet. Click <strong>&ldquo;Generate PDF Report&rdquo;</strong> in the toolbar to generate a sealed statutory inspection report.
                </div>
              )}
            </div>
          </Card>

          {/* Phase 4B Interactive Evidence Timeline */}
          <EvidenceTimelineCard
            inspectionId={inspection.id}
            initialItems={initialTimeline}
            onSelectFinding={(checkId) => setSelectedCheckId(checkId)}
          />
        </div>
      </div>

      {/* Traceability Modal */}
      <EvidenceTraceabilityModal
        inspectionId={inspection.id}
        checkId={selectedCheckId}
        onlineDiscrepancyId={selectedOnlineDiscrepancyId}
        onClose={() => {
          setSelectedCheckId(null)
          setSelectedOnlineDiscrepancyId(null)
        }}
      />
    </div>
  )
}
