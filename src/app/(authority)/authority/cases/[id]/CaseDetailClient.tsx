'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CaseStatusBadge,
  CasePriorityBadge,
  InspectionStatusBadge,
  AuthorityDecisionBadge,
  Badge,
} from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatDateTime, formatDate, shortId } from '@/lib/utils'
import {
  Briefcase,
  UserCheck,
  ClipboardList,
  Shield,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  Plus,
  CheckCircle2,
  XCircle,
  Hash,
  ShoppingBag,
  Layers,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { RiskBadge } from '@/components/risk/RiskBadge'
import { RiskAssessmentCard } from '@/components/risk/RiskAssessmentCard'

interface CaseDetailClientProps {
  caseData: any
  timeline: any[]
  riskAssessment?: any
  officers: Array<{ id: string; name: string; email: string; role: string }>
  userRole: string
  userId: string
}

export function CaseDetailClient({
  caseData,
  timeline,
  riskAssessment,
  officers,
  userRole,
  userId,
}: CaseDetailClientProps) {
  const router = useRouter()
  const isSeniorOrAdmin = userRole === 'SENIOR_AUTHORITY' || userRole === 'ADMIN'

  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedOfficerId, setSelectedOfficerId] = useState(caseData.assignedOfficerId ?? '')
  const [assignReason, setAssignReason] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)

  const [createInspectionLoading, setCreateInspectionLoading] = useState(false)

  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolveLoading, setResolveLoading] = useState(false)

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  const [closeLoading, setCloseLoading] = useState(false)

  // Actions
  const handleAssign = async () => {
    if (!selectedOfficerId) {
      toast.error('Please select an authority officer')
      return
    }

    setAssignLoading(true)
    try {
      const res = await fetch(`/api/v1/cases/${caseData.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId: selectedOfficerId, reason: assignReason || undefined }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to assign officer')

      toast.success('Officer assigned successfully')
      setAssignModalOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAssignLoading(false)
    }
  }

  const handleCreateInspection = async () => {
    setCreateInspectionLoading(true)
    try {
      const res = await fetch(`/api/v1/cases/${caseData.id}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create inspection')

      toast.success('Inspection initiated successfully')
      router.refresh()
      if (data.data?.id) {
        router.push(`/authority/inspections/${data.data.id}`)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreateInspectionLoading(false)
    }
  }

  const handleReject = async () => {
    if (rejectReason.trim().length < 15) {
      toast.error('Rejection reason must be at least 15 characters')
      return
    }

    setRejectLoading(true)
    try {
      const res = await fetch(`/api/v1/cases/${caseData.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to reject case')

      toast.success('Regulatory case marked as REJECTED')
      setRejectModalOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRejectLoading(false)
    }
  }

  const handleResolve = async () => {
    if (resolutionNotes.trim().length < 15) {
      toast.error('Resolution notes must be at least 15 characters')
      return
    }

    setResolveLoading(true)
    try {
      const res = await fetch(`/api/v1/cases/${caseData.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes: resolutionNotes.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to resolve case')

      toast.success('Regulatory case resolved successfully')
      setResolveModalOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setResolveLoading(false)
    }
  }

  const handleClose = async () => {
    if (!confirm('Are you sure you want to formally close this regulatory case?')) return

    setCloseLoading(true)
    try {
      const res = await fetch(`/api/v1/cases/${caseData.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to close case')

      toast.success('Regulatory case formally closed')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCloseLoading(false)
    }
  }

  // Aggregate stats across linked inspections
  const totalChecks = caseData.inspections.reduce(
    (acc: number, ins: any) => acc + (ins.complianceChecks?.length || 0),
    0
  )
  const allViolations = caseData.inspections.flatMap((ins: any) => ins.violations || [])
  const allReports = caseData.inspections.flatMap((ins: any) => ins.reports || [])
  const scan = caseData.productScan
  const product = scan?.product
  const onlineVerifications = scan?.onlineVerifications || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Action Toolbar Ribbon */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Briefcase size={20} style={{ color: 'var(--brand-400)' }} />
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Regulatory Docket</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              {caseData.caseNumber}
            </div>
          </div>
          {riskAssessment && (
            <RiskBadge level={riskAssessment.level} score={riskAssessment.score} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isSeniorOrAdmin && caseData.status !== 'CLOSED' && caseData.status !== 'REJECTED' && (
            <button
              onClick={() => setAssignModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
              }}
              id="assign-officer-btn"
            >
              <UserCheck size={14} /> {caseData.assignedOfficer ? 'Reassign Officer' : 'Assign Officer'}
            </button>
          )}

          {caseData.status !== 'CLOSED' && caseData.status !== 'REJECTED' && (
            <button
              onClick={handleCreateInspection}
              disabled={createInspectionLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--brand-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
              }}
              id="create-inspection-btn"
            >
              <Plus size={14} /> {createInspectionLoading ? 'Initiating...' : 'Create Inspection'}
            </button>
          )}

          {(caseData.status === 'SUBMITTED' || caseData.status === 'UNDER_REVIEW') && (
            <button
              onClick={() => setRejectModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
              }}
              id="reject-case-btn"
            >
              <XCircle size={14} /> Reject Case
            </button>
          )}

          {(caseData.status === 'INVESTIGATION' || caseData.status === 'DECISION_PENDING') && (
            <button
              onClick={() => setResolveModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
              }}
              id="resolve-case-btn"
            >
              <CheckCircle2 size={14} /> Resolve Case
            </button>
          )}

          {isSeniorOrAdmin && caseData.status === 'RESOLVED' && (
            <button
              onClick={handleClose}
              disabled={closeLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
              }}
              id="close-case-btn"
            >
              {closeLoading ? 'Closing...' : 'Formally Close Case'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
        {/* Left Column: Case Details & Operational Dossier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Section 1: Case Overview */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Docket Title</span>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', margin: '4px 0 0' }}>
                  {caseData.title}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <CasePriorityBadge priority={caseData.priority} />
                <CaseStatusBadge status={caseData.status} />
              </div>
            </div>

            {caseData.description && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
                {caseData.description}
              </p>
            )}

            {caseData.resolutionNotes && (
              <div
                style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-3) var(--space-4)',
                  background: caseData.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  border: `1px solid ${caseData.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: caseData.status === 'REJECTED' ? '#f87171' : '#4ade80', marginBottom: 4 }}>
                  {caseData.status === 'REJECTED' ? 'Rejection Justification' : 'Resolution & Enforcement Record'}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {caseData.resolutionNotes}
                </div>
              </div>
            )}
          </Card>

          {/* Section 2: Consumer Complaint */}
          {caseData.complaint ? (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} style={{ color: 'var(--brand-400)' }} />
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                    Originating Consumer Complaint
                  </h3>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Ref: #{shortId(caseData.complaint.complaintRef)}
                </span>
              </div>
              <div style={{ background: 'var(--bg-base)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {caseData.complaint.title}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {caseData.complaint.description}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span>Complainant: {caseData.complaint.consumer?.name || 'Anonymous Consumer'}</span>
                <span>Filed: {formatDateTime(caseData.complaint.createdAt)}</span>
              </div>
            </Card>
          ) : (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <Shield size={16} />
                <span style={{ fontSize: 'var(--text-sm)' }}>
                  Ex-Officio / Direct Market Surveillance Case (No consumer complaint attached)
                </span>
              </div>
            </Card>
          )}

          {/* Section 3 & 4: Product Identity & Scan */}
          {scan && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShoppingBag size={18} style={{ color: 'var(--brand-400)' }} />
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                    Physical Packaging &amp; OCR Declarations
                  </h3>
                </div>
                <Link
                  href={`/consumer/scans/${scan.id}`}
                  target="_blank"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--brand-400)',
                    textDecoration: 'none',
                  }}
                >
                  View Scan Dossier <ExternalLink size={12} />
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Commodity</span>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {product?.id ? (
                      <Link
                        href={`/authority/search/products/${product.id}`}
                        style={{ color: 'var(--brand-400)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {scan.identifiedProductName || product?.name || 'Unidentified'} <ExternalLink size={12} />
                      </Link>
                    ) : (
                      scan.identifiedProductName || product?.name || 'Unidentified'
                    )}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Brand</span>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {(scan.identifiedBrand || product?.brand) ? (
                      <Link
                        href={`/authority/search/brands/${encodeURIComponent(scan.identifiedBrand || product?.brand || '')}`}
                        style={{ color: 'var(--brand-400)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {scan.identifiedBrand || product?.brand} <ExternalLink size={12} />
                      </Link>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Manufacturer</span>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {product?.manufacturer ? (
                      <Link
                        href={`/authority/search/manufacturers/${encodeURIComponent(product.manufacturer)}`}
                        style={{ color: 'var(--brand-400)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {product.manufacturer} <ExternalLink size={12} />
                      </Link>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Category</span>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {scan.identifiedCategory || product?.category || 'General'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Declarations Extracted: {scan.extractedDeclarations?.length || 0} fields · Packaging Images: {scan.images?.length || 0}
              </div>
            </Card>
          )}

          {/* Section 6: Inspections */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={18} style={{ color: 'var(--brand-400)' }} />
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                  Linked Statutory Inspections ({caseData.inspections.length})
                </h3>
              </div>
              {caseData.status !== 'CLOSED' && caseData.status !== 'REJECTED' && (
                <button
                  onClick={handleCreateInspection}
                  disabled={createInspectionLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    background: 'var(--brand-600)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={12} /> Add Inspection
                </button>
              )}
            </div>

            {caseData.inspections.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                No inspections initiated yet. Click &quot;Create Inspection&quot; to evaluate Legal Metrology compliance.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {caseData.inspections.map((ins: any) => (
                  <Link
                    key={ins.id}
                    href={`/authority/inspections/${ins.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 2 }}>
                        {ins.title ?? 'Statutory Inspection #' + ins.id.slice(-6).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                        <span>Officer: {ins.officer.name}</span>
                        <span>· Created: {formatDate(ins.createdAt)}</span>
                        {ins.violations?.length > 0 && (
                          <span style={{ color: 'var(--color-error)' }}>
                            · {ins.violations.length} Violation{ins.violations.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ins.decision && <AuthorityDecisionBadge decision={ins.decision.decision} />}
                      <InspectionStatusBadge status={ins.status} />
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Section 7 & 8: Compliance Findings & Violations Summary */}
          {totalChecks > 0 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Shield size={18} style={{ color: 'var(--brand-400)' }} />
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                  Statutory Rule Compliance Findings ({totalChecks} Evaluated)
                </h3>
              </div>

              {allViolations.length > 0 ? (
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 'var(--font-semibold)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> Formal Violations ({allViolations.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {allViolations.map((v: any) => (
                      <div
                        key={v.id}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span style={{ fontWeight: 'var(--font-semibold)', color: '#f87171' }}>[{v.severity}]</span> {v.description}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 'var(--text-xs)', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> No statutory violations detected across evaluated rules.
                </div>
              )}
            </Card>
          )}

          {/* Section 10: E-Commerce Cross-Verification Summary */}
          {onlineVerifications.length > 0 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Layers size={18} style={{ color: 'var(--brand-400)' }} />
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                  E-Commerce Listing Verifications ({onlineVerifications.length})
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {onlineVerifications.map((v: any) => (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 10,
                      background: 'var(--bg-base)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{v.domain || v.sourceUrl}</div>
                      <div style={{ color: 'var(--text-muted)' }}>Match: {v.overallMatchStatus} · Discrepancies: {v.discrepancies?.length || 0}</div>
                    </div>
                    <Badge variant={v.overallMatchStatus === 'MATCH' ? 'success' : v.overallMatchStatus === 'MISMATCH' ? 'error' : 'default'}>
                      {v.overallMatchStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Section 12: Official Reports */}
          {allReports.length > 0 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FileText size={18} style={{ color: 'var(--brand-400)' }} />
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                  Official PDF Inspection Reports ({allReports.length})
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allReports.map((r: any) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 10,
                      background: 'var(--bg-base)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--brand-400)' }}>
                        #{shortId(r.reportRef)}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Generated {formatDateTime(r.generatedAt)}
                      </div>
                    </div>
                    <a
                      href={`/api/v1/inspections/${r.inspectionId}/report/pdf?download=true`}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      Download PDF
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Case Metadata & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Investigative Risk Prioritization */}
          {riskAssessment && <RiskAssessmentCard assessment={riskAssessment} />}

          {/* Assigned Officer Card */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Assigned Inspector
              </span>
              {isSeniorOrAdmin && caseData.status !== 'CLOSED' && caseData.status !== 'REJECTED' && (
                <button
                  onClick={() => setAssignModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-400)',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Change
                </button>
              )}
            </div>

            {caseData.assignedOfficer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'var(--font-bold)',
                    color: 'white',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {caseData.assignedOfficer.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                    {caseData.assignedOfficer.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {caseData.assignedOfficer.email} · {caseData.assignedOfficer.role}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                No officer assigned yet. Senior Authority assignment pending.
              </div>
            )}
          </Card>

          {/* Dossier Metadata */}
          <Card>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dossier Metadata
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Case Reference</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{caseData.caseNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Registered Date</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatDate(caseData.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Modified</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatDate(caseData.updatedAt)}</span>
              </div>
              {caseData.closedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Closed At</span>
                  <span style={{ color: 'var(--text-primary)' }}>{formatDate(caseData.closedAt)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Section 13: Unified Timeline */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <Clock size={16} style={{ color: 'var(--brand-400)' }} />
              <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                Regulatory Lifecycle Timeline
              </h3>
            </div>

            <div style={{ position: 'relative', paddingLeft: 'var(--space-5)' }}>
              <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'var(--border-default)' }} />
              {timeline.length === 0 ? (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No timeline entries yet.</div>
              ) : (
                timeline.map((item, idx) => (
                  <div key={item.id || idx} style={{ position: 'relative', paddingBottom: 'var(--space-4)' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -21,
                        top: 2,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: idx === timeline.length - 1 ? 'var(--brand-500)' : 'var(--bg-elevated)',
                        border: '2px solid var(--border-strong)',
                      }}
                    />
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.description}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>
                      {formatDateTime(item.timestamp)} · by {item.actorName}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Assign Officer Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={caseData.assignedOfficer ? 'Reassign Authority Officer' : 'Assign Authority Officer'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>
              Select Authority Officer
            </label>
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="">-- Choose Officer --</option>
              {officers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} ({off.role}) — {off.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>
              Assignment Notes / Directive (Optional)
            </label>
            <textarea
              rows={3}
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              placeholder="e.g. Assigned for packaging and e-commerce verification under Rule 6..."
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => setAssignModalOpen(false)}
              style={{
                padding: '8px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assignLoading}
              style={{
                padding: '8px 16px',
                background: 'var(--brand-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
              }}
            >
              {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Case Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Regulatory Case"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              color: '#f87171',
            }}
          >
            Rejection closes the complaint without formal inspection. A substantive justification (minimum 15 characters) is mandatory.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>
              Rejection Justification *
            </label>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Complaint outside Legal Metrology jurisdiction / de-minimis exempt package under Rule 26..."
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                resize: 'vertical',
              }}
            />
            <div style={{ fontSize: '11px', color: rejectReason.trim().length >= 15 ? '#4ade80' : 'var(--text-muted)', marginTop: 4 }}>
              {rejectReason.trim().length}/15 characters minimum
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setRejectModalOpen(false)}
              style={{
                padding: '8px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={rejectLoading || rejectReason.trim().length < 15}
              style={{
                padding: '8px 16px',
                background: rejectReason.trim().length >= 15 ? '#ef4444' : 'var(--bg-elevated)',
                color: rejectReason.trim().length >= 15 ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: rejectReason.trim().length >= 15 ? 'pointer' : 'not-allowed',
              }}
            >
              {rejectLoading ? 'Rejecting...' : 'Reject Case'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Resolve Case Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Record Case Resolution &amp; Enforcement Action"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              color: '#4ade80',
            }}
          >
            Please document the final resolution, compound fee, remediation notice, or regulatory clearance details.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>
              Resolution Notes &amp; Statutory Outcome *
            </label>
            <textarea
              rows={4}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Notice issued under Section 36; manufacturer compounded defect and paid fee of Rs. 25,000..."
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                resize: 'vertical',
              }}
            />
            <div style={{ fontSize: '11px', color: resolutionNotes.trim().length >= 15 ? '#4ade80' : 'var(--text-muted)', marginTop: 4 }}>
              {resolutionNotes.trim().length}/15 characters minimum
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setResolveModalOpen(false)}
              style={{
                padding: '8px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={resolveLoading || resolutionNotes.trim().length < 15}
              style={{
                padding: '8px 16px',
                background: resolutionNotes.trim().length >= 15 ? 'var(--brand-600)' : 'var(--bg-elevated)',
                color: resolutionNotes.trim().length >= 15 ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                cursor: resolutionNotes.trim().length >= 15 ? 'pointer' : 'not-allowed',
              }}
            >
              {resolveLoading ? 'Resolving...' : 'Confirm Resolution'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
