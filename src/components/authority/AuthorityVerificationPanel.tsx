'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  type OfficerVerificationStatus,
  type VerificationEvidenceItem,
  type QcoReferenceInfo,
  type OfficerVerificationRecord,
} from '@/types/verification'
import { authorityVerificationService } from '@/services/verification-service'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Scale,
  Lock,
  UserCheck,
  MessageSquare,
  Info,
  CheckSquare,
  Square,
  BookOpen,
} from 'lucide-react'

interface AuthorityVerificationPanelProps {
  inspectionId: string
  productName: string
  brandName?: string
  category?: string
  scanId?: string | null
  userRole: string
  legalMetrologyChecksCount?: number
  legalMetrologyViolationsCount?: number
  scanImagesCount?: number
  existingRecord?: OfficerVerificationRecord | null
}

const CHECKLIST_ITEMS: { key: string; label: string; description: string }[] = [
  {
    key: 'checkDeclarations',
    label: 'Mandatory Packaging Declarations',
    description: 'Verified all mandatory label declarations under Legal Metrology Rule 6(1).',
  },
  {
    key: 'checkMrpUsp',
    label: 'MRP & Unit Sale Price (USP) Syntax',
    description: 'Verified statutory MRP syntax (inclusive of all taxes) and Unit Sale Price formatting.',
  },
  {
    key: 'checkIsiMark',
    label: 'BIS / ISI Mark & QCO Applicability',
    description: 'Verified whether product is notified under a mandatory Quality Control Order (QCO).',
  },
  {
    key: 'checkManufacturerAddress',
    label: 'Manufacturer / Packer Registration',
    description: 'Verified declared entity identity and physical premises address.',
  },
  {
    key: 'checkSamplingProtocol',
    label: 'Statutory Sampling Protocol',
    description: 'Conducted representative package sampling and chain-of-custody documentation.',
  },
]

export function AuthorityVerificationPanel({
  inspectionId,
  productName,
  brandName = 'Unknown Brand',
  category = 'Packaged Commodity',
  scanId,
  userRole,
  legalMetrologyChecksCount = 0,
  legalMetrologyViolationsCount = 0,
  scanImagesCount = 0,
  existingRecord,
}: AuthorityVerificationPanelProps) {
  // RBAC Permission Check
  const canVerify = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(userRole)

  // Retrieve QCO reference info from isolated verification service
  const qcoInfo: QcoReferenceInfo = authorityVerificationService.getQcoReferenceForProduct(
    productName,
    category
  )

  // Retrieve Traceability Evidence Items
  const evidenceItems: VerificationEvidenceItem[] =
    authorityVerificationService.getTraceabilityEvidenceItems(inspectionId, scanId, productName)

  // Initial Record State
  const initialRecord =
    existingRecord || authorityVerificationService.getInitialVerificationRecord(inspectionId)

  const [verificationStatus, setVerificationStatus] = useState<OfficerVerificationStatus>(
    initialRecord.status
  )
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initialRecord.checklist)
  const [comments, setComments] = useState<string>(initialRecord.comments || '')
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(existingRecord?.verifiedAt))
  const [savedRecord, setSavedRecord] = useState<OfficerVerificationRecord | null>(existingRecord || null)

  const toggleChecklist = (key: string) => {
    if (!canVerify) return
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSaveVerification = () => {
    if (!canVerify) return

    const newRecord: OfficerVerificationRecord = {
      inspectionId,
      status: verificationStatus,
      verifiedByOfficerName: 'Inspector (Active Session)',
      verifiedByOfficerRole: userRole,
      verifiedAt: new Date().toISOString(),
      comments: comments.trim() || 'Officer review completed per statutory guidelines.',
      checklist,
    }

    setSavedRecord(newRecord)
    setIsSaved(true)
  }

  const getStatusBadge = (status: OfficerVerificationStatus) => {
    switch (status) {
      case 'VERIFIED_BY_OFFICER':
        return <Badge variant="success">Verified by Officer</Badge>
      case 'REQUIRES_FURTHER_REVIEW':
        return <Badge variant="error">Requires Further Review</Badge>
      case 'PENDING_VERIFICATION':
        return <Badge variant="warning">Pending Officer Verification</Badge>
      case 'AI_ADVISORY':
      default:
        return <Badge variant="info">AI Advisory Information</Badge>
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Master Officer Verification Card */}
      <Card>
        <CardHeader>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} style={{ color: 'var(--brand-400)' }} />
              Officer QCO &amp; Regulatory Verification Panel
            </CardTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge variant="default">SIH PS107</Badge>
              {getStatusBadge(savedRecord ? savedRecord.status : verificationStatus)}
            </div>
          </div>
        </CardHeader>
        <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Section 1: Product & Package Identity with Legal Metrology Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-3)',
              padding: 'var(--space-4)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Target Commodity</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginTop: 2 }}>
                {productName}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Brand / Category</div>
              <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>
                {brandName} · <span style={{ color: 'var(--text-secondary)' }}>{category}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Legal Metrology Scope</div>
              <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>
                <strong>{legalMetrologyChecksCount}</strong> Checks ·{' '}
                <strong style={{ color: legalMetrologyViolationsCount > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                  {legalMetrologyViolationsCount} Violations
                </strong>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Attached Evidence</div>
              <div style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>
                <strong>{scanImagesCount}</strong> Packaging Images
              </div>
            </div>
          </div>

          {/* Section 2: BIS Standards & Quality Control Order (QCO) Reference Card */}
          <div
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              background: 'var(--bg-surface)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} style={{ color: 'var(--brand-400)' }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                  Bureau of Indian Standards (BIS) &amp; QCO Cross-Reference
                </span>
              </div>
              {qcoInfo.standardNumber === 'Not available in demo data' ? (
                <Badge variant="warning">Catalog Sync Pending</Badge>
              ) : qcoInfo.isMandatory ? (
                <Badge variant="error" dot>Mandatory QCO Enforced</Badge>
              ) : (
                <Badge variant="default">Demo Cross-Reference</Badge>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-4)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Indian Standard Specification</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 'var(--font-bold)',
                    color: 'var(--brand-300)',
                    marginTop: 2,
                  }}
                >
                  {qcoInfo.standardNumber}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{qcoInfo.standardTitle}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)' }}>Quality Control Order (QCO)</div>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginTop: 2 }}>
                  {qcoInfo.qcoNotificationNumber}
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{qcoInfo.issuingMinistry}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)' }}>Statutory Mandate &amp; Scheme</div>
                <div style={{ color: 'var(--text-primary)', marginTop: 2, fontWeight: 'var(--font-medium)' }}>
                  {qcoInfo.verificationStatus}
                </div>
              </div>
            </div>

            {qcoInfo.standardNumber === 'Not available in demo data' && (
              <div
                style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                }}
              >
                <strong>Live Registry Status: </strong>
                Specific standard cross-reference not identified in current demo catalog for &ldquo;{productName}&rdquo;. Live BIS central registry integration will populate this automatically. Officers may manually verify ISI/CRS marks using the checklist below.
              </div>
            )}
          </div>

          {/* Section 3: AI Advisory Regulatory Notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: 'var(--color-warning)' }}>AI Advisory Information Only: </strong>
              Cross-references and automated extraction suggestions displayed in this panel are advisory tools
              designed to assist officers. They do not constitute statutory enforcement orders or official
              certification determinations. The final compliance, certification, and compounding decision
              rests solely with the designated Legal Metrology / BIS enforcement officer.
            </div>
          </div>

          {/* Section 4: Evidence Traceability Table */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                <Scale size={16} style={{ color: 'var(--brand-400)' }} />
                <span>Evidence Traceability Chain ({evidenceItems.length} Records)</span>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Full provenance from OCR capture to standards cross-check
              </span>
            </div>

            <div
              className="table-scroll-container"
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <table
                style={{
                  minWidth: 640,
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 'var(--text-xs)',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '18%' }}>
                      Evidence Source
                    </th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '22%' }}>
                      Document / Clause Ref
                    </th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '38%' }}>
                      Extracted Text / Finding
                    </th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '22%' }}>
                      Originating Pipeline
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: idx === evidenceItems.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                        background: idx % 2 === 1 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 'var(--font-medium)', verticalAlign: 'top' }}>
                        {item.source}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--brand-300)', verticalAlign: 'top' }}>
                        {item.documentReference}
                        {item.clauseReference && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: 2 }}>
                            {item.clauseReference}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', lineHeight: 1.4, verticalAlign: 'top' }}>
                        {item.evidenceText}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', verticalAlign: 'top' }}>
                        <div>{item.originatingWorkflow}</div>
                        <div style={{ fontSize: '10px', marginTop: 2 }}>{item.timestamp}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Interactive Officer Verification Checklist */}
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>
              Officer Verification Protocol Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {CHECKLIST_ITEMS.map((check) => {
                const isChecked = Boolean(checklist[check.key])
                return (
                  <div
                    key={check.key}
                    onClick={() => toggleChecklist(check.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 'var(--space-3)',
                      background: isChecked ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-elevated)',
                      border: isChecked ? '1px solid var(--color-success)' : '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      cursor: canVerify ? 'pointer' : 'not-allowed',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ marginTop: 2, color: isChecked ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-semibold)',
                          color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {check.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {check.description}
                      </div>
                    </div>
                    <div>
                      {isChecked ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="default">Pending</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 6: Officer Comments & Verification Status Selection */}
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Statutory Determination Status
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-2)' }}>
                {(
                  [
                    { value: 'AI_ADVISORY', label: 'AI Advisory Info' },
                    { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
                    { value: 'VERIFIED_BY_OFFICER', label: 'Verified by Officer' },
                    { value: 'REQUIRES_FURTHER_REVIEW', label: 'Requires Further Review' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!canVerify}
                    onClick={() => setVerificationStatus(opt.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: verificationStatus === opt.value ? 'var(--font-bold)' : 'var(--font-normal)',
                      border:
                        verificationStatus === opt.value
                          ? '2px solid var(--brand-500)'
                          : '1px solid var(--border-default)',
                      background:
                        verificationStatus === opt.value ? 'var(--brand-950)' : 'var(--bg-surface)',
                      color:
                        verificationStatus === opt.value ? 'var(--brand-300)' : 'var(--text-secondary)',
                      cursor: canVerify ? 'pointer' : 'not-allowed',
                      textAlign: 'center',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="officer-comments"
                style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Officer Inspection Remarks &amp; Statutory Notes
              </label>
              <textarea
                id="officer-comments"
                rows={3}
                disabled={!canVerify}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  canVerify
                    ? 'Enter statutory findings, packaging non-conformities, laboratory referral remarks, or compounding notices...'
                    : 'Restricted to authorized enforcement officers.'
                }
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Section 8: RBAC Guard Notice or Action Buttons */}
            {canVerify ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                  paddingTop: 'var(--space-3)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <UserCheck size={14} style={{ color: 'var(--color-success)' }} />
                  <span>
                    Authorized Session: <strong>{userRole}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveVerification}
                    id="save-officer-verification-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ShieldCheck size={14} /> Record Officer Determination
                  </Button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 'var(--space-3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Lock size={14} style={{ color: 'var(--color-error)' }} />
                <span>
                  <strong>Read-Only View:</strong> Verification controls are restricted to authorized
                  enforcement officers (Role: AUTHORITY_OFFICER, SENIOR_AUTHORITY, or ADMIN).
                </span>
              </div>
            )}
          </div>

          {/* Section 7: Auditability Record Stamp */}
          {savedRecord && (
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'rgba(34, 197, 94, 0.06)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                <div>
                  <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                    Official Determination Recorded by {savedRecord.verifiedByOfficerName} ({savedRecord.verifiedByOfficerRole})
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                    Timestamp: {savedRecord.verifiedAt} · Remarks: &ldquo;{savedRecord.comments}&rdquo;
                  </div>
                </div>
              </div>
              <Badge variant="success">Audit Trail Logged</Badge>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
