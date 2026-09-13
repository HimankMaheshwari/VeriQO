'use client'

import React, { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Badge, ComplianceBadge, ViolationSeverityBadge } from '@/components/ui/Badge'
import {
  Scale,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Hash,
  Clock,
  User,
  Info,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { PhysicalEvidenceTrace, OnlineEvidenceTrace } from '@/lib/inspections/types'

interface EvidenceTraceabilityModalProps {
  inspectionId: string
  checkId?: string | null
  onlineDiscrepancyId?: string | null
  onClose: () => void
}

export function EvidenceTraceabilityModal({
  inspectionId,
  checkId,
  onlineDiscrepancyId,
  onClose,
}: EvidenceTraceabilityModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [physicalTrace, setPhysicalTrace] = useState<PhysicalEvidenceTrace | null>(null)
  const [onlineTrace, setOnlineTrace] = useState<OnlineEvidenceTrace | null>(null)

  const isOpen = Boolean(checkId || onlineDiscrepancyId)

  useEffect(() => {
    if (!isOpen) {
      setPhysicalTrace(null)
      setOnlineTrace(null)
      setError(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    async function fetchTrace() {
      try {
        if (checkId) {
          const res = await fetch(`/api/v1/inspections/${inspectionId}/traceability/${checkId}`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to fetch evidence traceability')
          if (isMounted) setPhysicalTrace(data.data)
        } else if (onlineDiscrepancyId) {
          const res = await fetch(
            `/api/v1/inspections/${inspectionId}/traceability/online/${onlineDiscrepancyId}`
          )
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to fetch online evidence trace')
          if (isMounted) setOnlineTrace(data.data)
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error loading evidence trace')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchTrace()

    return () => {
      isMounted = false
    }
  }, [inspectionId, checkId, onlineDiscrepancyId, isOpen])

  const title = checkId
    ? 'Statutory Finding Evidence Traceability'
    : 'Online Discrepancy Evidence Traceability'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={740}>
      <div style={{ padding: 'var(--space-6)', maxHeight: '78vh', overflowY: 'auto' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-8)' }}>
            <Spinner size="lg" />
            <span style={{ marginTop: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Resolving immutable evidence chain...
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <strong>Error loading trace:</strong> {error}
          </div>
        )}

        {/* 1. PHYSICAL EVIDENCE TRACE */}
        {!loading && physicalTrace && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Finding Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-4)',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 'var(--text-base)', color: 'var(--brand-400)' }}>
                    {physicalTrace.rule.ruleNumber}
                  </span>
                  <Badge variant="default">v{physicalTrace.ruleVersion?.versionNumber ?? 1}</Badge>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginTop: 4 }}>
                  {physicalTrace.rule.title}
                </div>
              </div>
              <ComplianceBadge status={physicalTrace.status} />
            </div>

            {/* Advisory Alert for WARNING findings */}
            {physicalTrace.isAdvisoryOnly && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-warning)',
                }}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Advisory Finding (Zero Violations):</strong> This compliance check produced a WARNING advisory status. Under Legal Metrology inspection guidelines, advisory findings do NOT create formal legal violation records.
                </div>
              </div>
            )}

            {/* Step 1: Legal Metrology Rule & Historical Version */}
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
                <Scale size={16} style={{ color: 'var(--brand-400)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Statutory Rule Baseline
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', marginBottom: 6 }}>
                <strong>Statutory Mandate:</strong> {physicalTrace.rule.requirement}
              </div>
              {physicalTrace.rule.sourceReference && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <strong>Gazette Reference:</strong> {physicalTrace.rule.sourceReference}
                </div>
              )}
              {physicalTrace.ruleVersion && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', gap: 'var(--space-4)', marginTop: 6, borderTop: '1px dashed var(--border-default)', paddingTop: 6 }}>
                  <span>Effective Date: <strong>{formatDateTime(physicalTrace.ruleVersion.effectiveDate)}</strong></span>
                  {physicalTrace.ruleVersion.changeDescription && (
                    <span>Amendment: <em>{physicalTrace.ruleVersion.changeDescription}</em></span>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Extracted Physical Declaration (OCR Data) */}
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
                <FileText size={16} style={{ color: 'var(--brand-400)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Physical Declaration Ground Truth (OCR Extracted)
                </span>
              </div>
              {physicalTrace.declaration ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Field Name:</span>
                    <div style={{ fontWeight: 'bold', fontFamily: 'monospace', marginTop: 2 }}>{physicalTrace.declaration.fieldName}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Normalized Value:</span>
                    <div style={{ fontWeight: 'bold', marginTop: 2 }}>{physicalTrace.declaration.normalizedValue || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Raw OCR Text:</span>
                    <div style={{ fontFamily: 'monospace', marginTop: 2 }}>{physicalTrace.declaration.rawValue || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Detection Confidence:</span>
                    <div style={{ marginTop: 2 }}>
                      {physicalTrace.declaration.confidence ? `${Math.round(physicalTrace.declaration.confidence * 100)}%` : '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No direct field declaration detected on packaging for this rule requirement.
                </div>
              )}
            </div>

            {/* Step 3: Packaging Photograph Source */}
            {physicalTrace.scanImage && (
              <div
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
                  <ImageIcon size={16} style={{ color: 'var(--brand-400)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    Original Packaging Photo Evidence
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/files/${physicalTrace.scanImage.storageKey.replace(/\\/g, '/')}`}
                    alt={physicalTrace.scanImage.originalFilename}
                    style={{
                      width: 90,
                      height: 90,
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-base)',
                    }}
                  />
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <div>Filename: <strong>{physicalTrace.scanImage.originalFilename}</strong></div>
                    <div style={{ marginTop: 2 }}>MIME Type: {physicalTrace.scanImage.mimeType}</div>
                    <div style={{ marginTop: 2 }}>File Size: {Math.round(physicalTrace.scanImage.sizeBytes / 1024)} KB</div>
                    <a
                      href={`/api/v1/files/${physicalTrace.scanImage.storageKey.replace(/\\/g, '/')}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, color: 'var(--brand-400)', fontWeight: 'bold' }}
                    >
                      Open Full-Resolution Source <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Formal Legal Violation (if FAIL) */}
            {physicalTrace.violation && (
              <div
                style={{
                  padding: 'var(--space-4)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-error)' }}>
                    <AlertTriangle size={16} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase' }}>
                      Formal Statutory Violation Candidate
                    </span>
                  </div>
                  <ViolationSeverityBadge severity={physicalTrace.violation.severity} />
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 4 }}>
                  {physicalTrace.violation.description}
                </div>
                {physicalTrace.violation.remediationGuidance && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    <strong>Mandatory Statutory Remediation:</strong> {physicalTrace.violation.remediationGuidance}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Attached Officer Evidence / Observations */}
            {physicalTrace.attachedEvidence && physicalTrace.attachedEvidence.length > 0 && (
              <div
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
                  <User size={16} style={{ color: 'var(--brand-400)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    Linked Officer Observations &amp; Measurements ({physicalTrace.attachedEvidence.length})
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {physicalTrace.attachedEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 'bold' }}>{ev.title || ev.type}</span>
                        <span>{formatDateTime(ev.createdAt)}</span>
                      </div>
                      {ev.description && <p style={{ marginTop: 4, color: 'var(--text-primary)' }}>{ev.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. ONLINE EVIDENCE TRACE */}
        {!loading && onlineTrace && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Header */}
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  E-Commerce Marketplace Discrepancy
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', marginTop: 2 }}>
                  {onlineTrace.discrepancy.fieldName} ({onlineTrace.discrepancy.discrepancyType})
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  Source: <strong>{onlineTrace.domain}</strong>
                </div>
              </div>
              <ViolationSeverityBadge severity={onlineTrace.discrepancy.severity} />
            </div>

            {/* Cryptographic Snapshot Audit */}
            {onlineTrace.snapshot && (
              <div
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    SHA-256 Immutable Listing Snapshot Audit
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Snapshot Hash: </span>
                    <code style={{ fontFamily: 'monospace', color: 'var(--brand-300)', wordBreak: 'break-all' }}>
                      {onlineTrace.snapshot.contentHash}
                    </code>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', color: 'var(--text-muted)' }}>
                    <span>HTTP Status: <strong>{onlineTrace.snapshot.httpStatus}</strong></span>
                    <span>Content-Type: <strong>{onlineTrace.snapshot.contentType || 'text/html'}</strong></span>
                    <span>Retrieved: <strong>{formatDateTime(onlineTrace.snapshot.retrievedAt)}</strong></span>
                  </div>
                  <div>
                    <a
                      href={onlineTrace.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--brand-400)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                    >
                      Visit Public Marketplace Listing <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Discrepancy Comparison */}
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-3)' }}>
                <AlertTriangle size={16} style={{ color: 'var(--color-error)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', color: 'var(--color-error)' }}>
                  Physical vs Online Listing Comparison
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Physical Package Ground Truth</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 4, fontFamily: 'monospace' }}>
                    {onlineTrace.discrepancy.physicalValue || '—'}
                  </div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Online Listed Value</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', marginTop: 4, fontFamily: 'monospace', color: 'var(--color-error)' }}>
                    {onlineTrace.discrepancy.onlineValue || '—'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', marginBottom: 4 }}>
                <strong>Finding:</strong> {onlineTrace.discrepancy.message}
              </div>

              {onlineTrace.discrepancy.statutoryReference && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 6, borderTop: '1px dashed var(--border-default)', paddingTop: 6 }}>
                  Statutory Rule Basis: {onlineTrace.discrepancy.statutoryReference}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
