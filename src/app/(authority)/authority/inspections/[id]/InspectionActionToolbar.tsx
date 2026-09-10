'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Scale, CheckCircle, AlertTriangle, HelpCircle, XCircle, Send, Play, FilePlus, ChevronRight, FileText, Download, Globe, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import type { InspectionStatus, AuthorityDecision } from '@prisma/client'

interface InspectionActionToolbarProps {
  inspectionId: string
  currentStatus: InspectionStatus
  hasScan: boolean
  scanId?: string | null
  existingDecision?: {
    decision: AuthorityDecision
    remarks?: string | null
    decidedAt: string | Date
    officerName?: string | null
  } | null
  userRole: string
  complianceChecks?: Array<{
    id: string
    rule?: {
      ruleNumber: string
      title: string
    } | null
  }>
  latestReport?: {
    id: string
    reportRef: string
    generatedAt: string | Date
    title?: string | null
  } | null
  hasViolations?: boolean
}

export function InspectionActionToolbar({
  inspectionId,
  currentStatus,
  hasScan,
  scanId,
  existingDecision,
  userRole,
  complianceChecks = [],
  latestReport,
  hasViolations = false,
}: InspectionActionToolbarProps) {
  const router = useRouter()
  const [analyzing, setAnalyzing] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)
  const [showOnlineModal, setShowOnlineModal] = useState(false)

  // Decision Form state
  const [decision, setDecision] = useState<AuthorityDecision>('COMPLIANT')
  const [remarks, setRemarks] = useState('')
  const [submittingDecision, setSubmittingDecision] = useState(false)

  // Evidence Form state
  const [evidenceType, setEvidenceType] = useState<'OFFICER_OBSERVATION' | 'FIELD_MEASUREMENT' | 'OFFICER_NOTE'>('OFFICER_OBSERVATION')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [linkedCheckId, setLinkedCheckId] = useState('')
  const [submittingEvidence, setSubmittingEvidence] = useState(false)

  // Online Verification Form state
  const [onlineUrl, setOnlineUrl] = useState('')
  const [submittingOnline, setSubmittingOnline] = useState(false)

  // Audit E-Commerce Listing handler
  const handleVerifyOnline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasScan || !scanId) {
      toast.error('Cannot run online audit: Inspection is not linked to a physical product scan.')
      return
    }
    if (!onlineUrl.trim()) {
      toast.error('Please enter a valid product listing URL.')
      return
    }

    setSubmittingOnline(true)
    try {
      const res = await fetch('/api/v1/online-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId,
          inspectionId,
          url: onlineUrl.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify online listing')
      }

      toast.success(
        `Online audit complete: ${
          data.data.overallMatchStatus === 'MATCH'
            ? 'Declarations match physical package'
            : `${data.data.discrepancies?.length || 0} discrepancy(ies) detected`
        }`
      )
      setShowOnlineModal(false)
      setOnlineUrl('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error running online verification')
    } finally {
      setSubmittingOnline(false)
    }
  }


  // Run Compliance Analysis handler
  const handleRunAnalysis = async () => {
    if (!hasScan) {
      toast.error('Cannot run analysis: Inspection is not linked to a physical product scan.')
      return
    }

    setAnalyzing(true)
    try {
      const res = await fetch(`/api/v1/inspections/${inspectionId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to run compliance analysis')
      }

      toast.success(
        `Analysis complete: ${data.data.checksCreated} legal checks evaluated, ${data.data.violationsCreated} formal violation(s) found.`
      )
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error running compliance analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  // Generate Official PDF Report handler
  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    try {
      const res = await fetch(`/api/v1/inspections/${inspectionId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate official report')
      }

      toast.success(`Official inspection report ${data.data.reportRef} generated successfully!`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error generating report')
    } finally {
      setGeneratingReport(false)
    }
  }

  // Status transition handler
  const handleStatusChange = async (newStatus: InspectionStatus) => {
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/v1/inspections/${inspectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to transition status')
      }

      toast.success(`Inspection status transitioned to ${newStatus}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to change status')
    } finally {
      setStatusUpdating(false)
    }
  }

  // Submit Final Decision handler
  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasViolations && (decision === 'DISMISSED' || decision === 'COMPLIANT')) {
      if (remarks.trim().length < 15) {
        toast.error('Statutory violations exist. A dismissal or compliant ruling requires substantive regulatory justification (minimum 15 characters).')
        return
      }
    }

    setSubmittingDecision(true)

    try {
      const res = await fetch(`/api/v1/inspections/${inspectionId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          remarks: remarks.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record official decision')
      }

      toast.success(`Official decision '${decision}' recorded. Inspection status updated.`)
      setShowDecisionModal(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error recording decision')
    } finally {
      setSubmittingDecision(false)
    }
  }

  // Submit Evidence Note handler
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evidenceNote.trim()) return

    setSubmittingEvidence(true)
    try {
      const res = await fetch(`/api/v1/inspections/${inspectionId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: evidenceType,
          title: evidenceTitle.trim() || undefined,
          description: evidenceNote.trim(),
          complianceCheckId: linkedCheckId || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to attach evidence note')
      }

      toast.success('Officer observation attached to inspection evidence.')
      setEvidenceTitle('')
      setEvidenceNote('')
      setLinkedCheckId('')
      setShowEvidenceModal(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error attaching evidence')
    } finally {
      setSubmittingEvidence(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
      {/* Top Action Ribbon */}
      <Card>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          {/* Left Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Link
              href={`/authority/scan?inspectionId=${inspectionId}`}
              style={{ textDecoration: 'none' }}
            >
              <Button
                variant="secondary"
                size="sm"
                title="Photograph or scan commodity packaging for this inspection"
                id="toolbar-scan-commodity-btn"
              >
                <ScanLine size={16} style={{ marginRight: 6 }} /> {hasScan ? 'Rescan Commodity' : 'Scan Commodity'}
              </Button>
            </Link>

            <Button
              variant="primary"
              size="sm"
              onClick={handleRunAnalysis}
              loading={analyzing}
              disabled={!hasScan}
              title={!hasScan ? 'Link a scan to enable compliance analysis' : 'Run deterministic Legal Metrology rules'}
            >
              <Scale size={16} style={{ marginRight: 6 }} /> Run Compliance Analysis
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowOnlineModal(true)}
              disabled={!hasScan}
              title={!hasScan ? 'Link a scan to enable online verification' : 'Audit e-commerce listings against packaging'}
            >
              <Globe size={16} style={{ marginRight: 6 }} /> Audit E-Commerce
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEvidenceModal(true)}
            >
              <FilePlus size={16} style={{ marginRight: 6 }} /> Add Observation Note
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDecisionModal(true)}
              style={{
                borderColor: 'var(--brand-500)',
                color: 'var(--brand-400)',
              }}
            >
              <CheckCircle size={16} style={{ marginRight: 6 }} /> Record Final Decision
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateReport}
              loading={generatingReport}
              style={{
                borderColor: 'var(--border-default)',
              }}
            >
              <FileText size={16} style={{ marginRight: 6 }} /> Generate PDF Report
            </Button>

            {latestReport && (
              <a
                href={`/api/v1/inspections/${inspectionId}/report?download=true`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  style={{
                    borderColor: 'var(--color-success)',
                    color: 'var(--color-success-dark)',
                    background: 'var(--color-success-bg)',
                  }}
                >
                  <Download size={16} style={{ marginRight: 6 }} /> Download PDF
                </Button>
              </a>
            )}
          </div>

          {/* Right Status Transitions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Status Transition:</span>

            {currentStatus === 'DRAFT' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={statusUpdating}
              >
                Start Inspection <ChevronRight size={14} />
              </Button>
            )}

            {currentStatus === 'IN_PROGRESS' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange('PENDING_REVIEW')}
                disabled={statusUpdating}
              >
                Send for Review <ChevronRight size={14} />
              </Button>
            )}

            {currentStatus === 'PENDING_REVIEW' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDecisionModal(true)}
              >
                Render Decision &amp; Close <ChevronRight size={14} />
              </Button>
            )}

            {currentStatus === 'CLOSED' && (userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={statusUpdating}
              >
                Reopen Inspection
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Decision Modal */}
      {showDecisionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 540,
              width: '100%',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              Record Authority Final Decision
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Render the statutory verdict for this inspection. Recording a decision (except Further Investigation) will automatically transition the inspection to <strong>CLOSED</strong> and record an immutable audit log.
            </p>

            <form onSubmit={handleSubmitDecision} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 6 }}>
                  Decision Outcome
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  {[
                    { val: 'COMPLIANT', label: 'Compliant', color: 'var(--color-success)', icon: <CheckCircle size={16} /> },
                    { val: 'NON_COMPLIANT', label: 'Non-Compliant', color: 'var(--color-error)', icon: <XCircle size={16} /> },
                    { val: 'FURTHER_INVESTIGATION', label: 'Further Investigation', color: 'var(--color-warning)', icon: <HelpCircle size={16} /> },
                    { val: 'DISMISSED', label: 'Dismissed', color: 'var(--neutral-400)', icon: <AlertTriangle size={16} /> },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setDecision(opt.val as AuthorityDecision)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: decision === opt.val ? `2px solid ${opt.color}` : '1px solid var(--border-default)',
                        background: decision === opt.val ? 'var(--bg-elevated)' : 'transparent',
                        color: decision === opt.val ? opt.color : 'var(--text-secondary)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: decision === opt.val ? 'var(--font-semibold)' : 'var(--font-normal)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasViolations && (decision === 'DISMISSED' || decision === 'COMPLIANT') && (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: 'var(--text-xs)',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Mandatory Regulatory Justification Required:</strong> Active statutory violations were identified during inspection analysis. Dismissing or marking this file compliant requires substantive justification (minimum 15 characters, e.g. compounding under Section 48, lab re-verification, or statutory exemption) which will be permanently recorded in the audit trail and official report.
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 6 }}>
                  Officer Remarks &amp; Statutory Directives
                </label>
                <textarea
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="State the statutory grounds, compounding instructions, or reasons for closure..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    resize: 'vertical',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <Button type="button" variant="ghost" onClick={() => setShowDecisionModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submittingDecision}>
                  Submit &amp; Record Decision
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evidence Note Modal */}
      {showEvidenceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 520,
              width: '100%',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
              Record Officer Evidence / Observation
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Attach a field observation, measurement verification, or official inspection remark.
            </p>

            <form onSubmit={handleSubmitEvidence} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Evidence Type Selector */}
              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 4 }}>
                  Evidence Classification
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <option value="OFFICER_OBSERVATION">Physical Officer Observation</option>
                  <option value="FIELD_MEASUREMENT">Field Measurement (e.g. Caliper, Scale, Dimensions)</option>
                  <option value="OFFICER_NOTE">General Inspection Note</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 4 }}>
                  Evidence Title / Subject
                </label>
                <input
                  type="text"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  placeholder="e.g., Vernier Caliper Font Height Verification"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
              </div>

              {/* Optional Link to Compliance Check */}
              {complianceChecks.length > 0 && (
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 4 }}>
                    Link to Compliance Finding (Optional)
                  </label>
                  <select
                    value={linkedCheckId}
                    onChange={(e) => setLinkedCheckId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <option value="">— Unlinked / General Inspection Evidence —</option>
                    {complianceChecks.map((check) => (
                      <option key={check.id} value={check.id}>
                        {check.rule?.ruleNumber}: {check.rule?.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description Textarea */}
              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 4 }}>
                  Detailed Observation / Value
                </label>
                <textarea
                  rows={4}
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  placeholder="Enter detailed measurement readings, verification methodology, or store observations..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    resize: 'vertical',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <Button type="button" variant="ghost" onClick={() => setShowEvidenceModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submittingEvidence}>
                  Attach Evidence
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit E-Commerce Listing Modal */}
      {showOnlineModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              maxWidth: 560,
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={20} style={{ color: 'var(--brand-400)' }} />
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Audit E-Commerce Listing</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowOnlineModal(false)}>
                &times;
              </Button>
            </div>

            <form onSubmit={handleVerifyOnline} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'bold', marginBottom: 4, color: 'var(--text-secondary)' }}>
                  Product Listing URL (Amazon, Blinkit, Flipkart, Zepto, etc.) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.amazon.in/dp/... or https://blinkit.com/prn/..."
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
              </div>

              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                <strong>Evidentiary Safeguards:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  <li>Fetches public e-commerce listing and computes cryptographic SHA-256 snapshot hash.</li>
                  <li>Extracts mandatory declarations (MRP, net quantity, manufacturer, origin).</li>
                  <li>Compares online fields against physical packaging declarations deterministically.</li>
                  <li>Online discrepancies remain structured findings; AI never makes legal decisions.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <Button type="button" variant="secondary" onClick={() => setShowOnlineModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submittingOnline}>
                  Run Online Audit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
