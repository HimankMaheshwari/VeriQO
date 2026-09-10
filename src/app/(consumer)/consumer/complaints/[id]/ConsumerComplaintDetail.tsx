'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConsumerSafeStatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDateTime, formatDate, shortId } from '@/lib/utils'
import type { ConsumerSafeStatusKey, ConsumerTimelineStep, ConsumerSafeOutcome } from '@/lib/consumer/status-projection'
import {
  FileText,
  Clock,
  Hash,
  Package,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Info,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
  Shield,
  ShieldCheck,
  Download,
  FileCheck,
} from 'lucide-react'

export interface SerializedComplaintDetail {
  id: string
  complaintRef: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  statusKey: ConsumerSafeStatusKey
  statusLabel: string
  statusDescription: string
  badgeVariant: string
  isTerminal: boolean
  product: {
    id: string
    name: string
    brand: string | null
    genericName: string | null
    category: string | null
  } | null
  scan: {
    id: string
    identifiedProductName: string | null
    identifiedBrand: string | null
    identifiedCategory: string | null
  } | null
  caseDocket: {
    caseNumber: string
  } | null
  outcome: ConsumerSafeOutcome | null
  documents?: {
    areAvailable: boolean
    listUrl: string
  }
  timeline: ConsumerTimelineStep[]
}

export default function ConsumerComplaintDetail({
  complaint,
}: {
  complaint: SerializedComplaintDetail
}) {
  const [copiedRef, setCopiedRef] = useState(false)
  const [copiedDocket, setCopiedDocket] = useState(false)

  function copyToClipboard(text: string, type: 'ref' | 'docket') {
    navigator.clipboard.writeText(text)
    if (type === 'ref') {
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    } else {
      setCopiedDocket(true)
      setTimeout(() => setCopiedDocket(false), 2000)
    }
  }

  const productName = complaint.product?.name ?? complaint.scan?.identifiedProductName
  const productBrand = complaint.product?.brand ?? complaint.scan?.identifiedBrand

  return (
    <div>
      <PageHeader
        title="Complaint Tracking"
        description={`Reference #${complaint.complaintRef.toUpperCase()} · Filed on ${formatDate(complaint.createdAt)}`}
        breadcrumbs={[
          { label: 'Complaints', href: '/consumer/complaints' },
          { label: `#${shortId(complaint.complaintRef).toUpperCase()}` },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ConsumerSafeStatusBadge status={complaint.statusKey} />
            <Link
              href="/consumer/complaints"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-xs)',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={13} /> Back
            </Link>
          </div>
        }
      />

      {/* Terminal Outcome Banner (Adjustment #2: strictly neutral and grounded) */}
      {complaint.outcome && (
        <div
          style={{
            background:
              complaint.outcome.statusKey === 'RESOLVED'
                ? 'rgba(16, 185, 129, 0.08)'
                : complaint.outcome.statusKey === 'REJECTED'
                ? 'rgba(239, 68, 68, 0.08)'
                : 'rgba(107, 114, 128, 0.08)',
            border: `1px solid ${
              complaint.outcome.statusKey === 'RESOLVED'
                ? 'rgba(16, 185, 129, 0.3)'
                : complaint.outcome.statusKey === 'REJECTED'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(107, 114, 128, 0.3)'
            }`,
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-lg)',
                background:
                  complaint.outcome.statusKey === 'RESOLVED'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : complaint.outcome.statusKey === 'REJECTED'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(107, 114, 128, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color:
                  complaint.outcome.statusKey === 'RESOLVED'
                    ? 'var(--color-success)'
                    : complaint.outcome.statusKey === 'REJECTED'
                    ? 'var(--color-error)'
                    : 'var(--text-muted)',
              }}
            >
              {complaint.outcome.statusKey === 'RESOLVED' ? (
                <CheckCircle2 size={24} />
              ) : complaint.outcome.statusKey === 'REJECTED' ? (
                <AlertCircle size={24} />
              ) : (
                <Info size={24} />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h3
                  style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 'var(--font-bold)',
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {complaint.outcome.title}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}
                >
                  Concluded on {formatDate(complaint.outcome.concludedAt || complaint.updatedAt)}
                </span>
              </div>

              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 'var(--leading-relaxed)',
                  margin: '0 0 var(--space-3) 0',
                }}
              >
                {complaint.outcome.message}
              </p>

              {/* Public Inspection Determination (if available, neutral wording) */}
              {complaint.outcome.inspectionSummary && (
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: 'var(--brand-300)' }}>Official Finding Summary: </strong>
                  {complaint.outcome.inspectionSummary}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Result Documents Section (Phase 6B) */}
      {complaint.outcome?.documentsAvailable ? (
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(37, 99, 235, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-400)',
                }}
              >
                <FileCheck size={20} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-base)',
                    fontWeight: 'var(--font-bold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Official Result Documents
                </h3>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Certified publications issued by the Directorate of Legal Metrology for this matter.
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-success)',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 'var(--font-medium)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              ✓ Sealed & Digitally Verified
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {/* Document 1: Statutory Compliance Report */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <FileText size={15} style={{ color: 'var(--brand-400)' }} />
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-bold)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Statutory Packaging Compliance Report
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Complete physical packaging audit and deterministic Legal Metrology rule checks.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingTop: 'var(--space-2)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <a
                  href={`/api/v1/consumer/complaints/${complaint.id}/documents/compliance-report?download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="download-compliance-report-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-600)',
                    color: 'white',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-medium)',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={13} /> Download PDF
                </a>
                <a
                  href={`/api/v1/consumer/complaints/${complaint.id}/documents/compliance-report`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    fontSize: 'var(--text-xs)',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={12} /> View
                </a>
              </div>
            </div>

            {/* Document 2: Regulatory Determination Order */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ShieldCheck size={15} style={{ color: 'var(--color-success)' }} />
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-bold)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Official Regulatory Determination Order
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Authoritative closing order and legal directives issued under Legal Metrology Act, 2009.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingTop: 'var(--space-2)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <a
                  href={`/api/v1/consumer/complaints/${complaint.id}/documents/regulatory-order?download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="download-regulatory-order-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-success)',
                    color: 'white',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-medium)',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={13} /> Download PDF
                </a>
                <a
                  href={`/api/v1/consumer/complaints/${complaint.id}/documents/regulatory-order`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    fontSize: 'var(--text-xs)',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={12} /> View
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : !complaint.isTerminal ? (
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} style={{ color: 'var(--text-muted)' }} />
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                Official Documents Pending Regulatory Conclusion
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Certified compliance reports and regulatory determination orders will be made available here once the investigation concludes.
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            In Progress
          </span>
        </div>
      ) : null}

      {/* Main Grid: 2 cols on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-6)' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Status Timeline */}
          <Card>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)' }}>
                Progress & Investigation Status
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Official regulatory milestones reached for this complaint.
              </p>
            </div>

            <div style={{ position: 'relative', paddingLeft: 'var(--space-7)' }}>
              {/* Vertical progress line */}
              <div
                style={{
                  position: 'absolute',
                  left: 11,
                  top: 8,
                  bottom: 24,
                  width: 2,
                  background: 'var(--border-default)',
                }}
              />

              {complaint.timeline.map((step, idx) => {
                const isCompleted = step.status === 'completed'
                const isActive = step.status === 'active'
                const isPending = step.status === 'pending'
                const isRejected = step.key === 'REJECTED'

                return (
                  <div
                    key={step.key}
                    style={{
                      position: 'relative',
                      paddingBottom: idx === complaint.timeline.length - 1 ? 0 : 'var(--space-6)',
                    }}
                  >
                    {/* Step Icon / Dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -33,
                        top: 2,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isCompleted
                          ? 'var(--color-success)'
                          : isActive
                          ? isRejected
                            ? 'var(--color-error)'
                            : 'var(--brand-600)'
                          : 'var(--bg-elevated)',
                        border: `2px solid ${
                          isCompleted
                            ? 'var(--color-success)'
                            : isActive
                            ? isRejected
                              ? 'var(--color-error)'
                              : 'var(--brand-400)'
                            : 'var(--border-strong)'
                        }`,
                        color: isCompleted || isActive ? 'white' : 'var(--text-muted)',
                        boxShadow: isActive ? '0 0 0 4px rgba(79, 70, 229, 0.2)' : 'none',
                        zIndex: 1,
                      }}
                    >
                      {isCompleted ? (
                        <Check size={13} strokeWidth={3} />
                      ) : isActive ? (
                        isRejected ? (
                          <AlertCircle size={13} />
                        ) : (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: 'white',
                            }}
                          />
                        )
                      ) : (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'var(--border-strong)',
                          }}
                        />
                      )}
                    </div>

                    {/* Step Content */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: isActive ? 'var(--font-bold)' : isCompleted ? 'var(--font-semibold)' : 'var(--font-normal)',
                            color: isActive ? 'var(--text-primary)' : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}
                        >
                          {step.label}
                        </span>

                        {step.timestamp && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Clock size={11} /> {formatDateTime(step.timestamp)}
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: isPending ? 'var(--text-muted)' : 'var(--text-secondary)',
                          lineHeight: 1.4,
                          margin: '3px 0 0 0',
                        }}
                      >
                        {step.description}
                      </p>

                      {step.hasDocuments && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 6,
                            padding: '3px 8px',
                            background: 'rgba(37, 99, 235, 0.1)',
                            border: '1px solid rgba(37, 99, 235, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            color: 'var(--brand-300)',
                            fontWeight: 'var(--font-medium)',
                          }}
                        >
                          <FileText size={12} /> Official Result Documents Available ({step.documentCount ?? 2} PDFs)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Complaint Details Card */}
          <Card>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                Submitted Subject
              </div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>
                {complaint.title}
              </h3>
            </div>

            <div style={{ marginBottom: 'var(--space-5)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Your Reported Description
              </div>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  lineHeight: 'var(--leading-relaxed)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {complaint.description}
              </div>
            </div>

            {/* Linked Product Context */}
            {productName && (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>
                  <Package size={14} style={{ color: 'var(--brand-400)' }} />
                  <span>Associated Product / Commodity</span>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  {productName}
                </div>
                {productBrand && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Brand: {productBrand}
                  </div>
                )}
                {complaint.product?.category && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                    Category: {complaint.product.category}
                  </div>
                )}
              </div>
            )}

            {/* Linked Scan Session Notice */}
            {complaint.scan && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--brand-950)',
                  border: '1px solid var(--brand-800)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-200)' }}>
                  <ScanLine size={15} style={{ color: 'var(--brand-400)' }} />
                  <span>Originated from verified product scan session</span>
                </div>
                <Link
                  href={`/consumer/scans/${complaint.scan.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--brand-400)',
                    textDecoration: 'none',
                    fontWeight: 'var(--font-medium)',
                  }}
                >
                  View Scan Analysis <ExternalLink size={12} />
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column / Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Reference & Docket Card */}
          <Card>
            <h3 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
              Official Filing Summary
            </h3>

            {/* Complaint Ref */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                Complaint Reference
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-elevated)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                  #{complaint.complaintRef}
                </span>
                <button
                  onClick={() => copyToClipboard(complaint.complaintRef, 'ref')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                  title="Copy reference"
                >
                  {copiedRef ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Regulatory Docket (if linked) */}
            {complaint.caseDocket && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                  Authority Regulatory Docket
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-elevated)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--brand-300)' }}>
                    {complaint.caseDocket.caseNumber}
                  </span>
                  <button
                    onClick={() => copyToClipboard(complaint.caseDocket!.caseNumber, 'docket')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                    title="Copy docket"
                  >
                    {copiedDocket ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            )}

            {/* Filing Dates */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date Filed</span>
                <span style={{ color: 'var(--text-secondary)' }}>{formatDate(complaint.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Status Update</span>
                <span style={{ color: 'var(--text-secondary)' }}>{formatDate(complaint.updatedAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Channel</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {complaint.scan ? 'Scan-Assisted Filing' : 'Direct Consumer Portal'}
                </span>
              </div>
            </div>
          </Card>

          {/* Consumer Safeguards & Transparency Advisory */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-3)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--brand-400)' }} />
              <h4 style={{ margin: 0, fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Statutory Review Process
              </h4>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              All complaints are independently reviewed under the provisions of the Legal Metrology (Packaged Commodities) Rules, 2011.
              Authority determinations are recorded deterministically based on statutory compliance evaluations.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
