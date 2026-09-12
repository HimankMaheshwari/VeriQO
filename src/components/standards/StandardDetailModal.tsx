'use client'

import React from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type StandardDiscoveryItem } from '@/types/standards'
import {
  BookOpen,
  FlaskConical,
  ShieldAlert,
  ExternalLink,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Award,
  FileCheck,
} from 'lucide-react'

interface StandardDetailModalProps {
  isOpen: boolean
  onClose: () => void
  standard: StandardDiscoveryItem | null
}

export function StandardDetailModal({
  isOpen,
  onClose,
  standard,
}: StandardDetailModalProps) {
  if (!standard) return null

  const assistantUrl = `/consumer/assistant?standard=${encodeURIComponent(
    standard.standardNumber
  )}&topic=${encodeURIComponent(standard.title)}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${standard.standardNumber} — Specifications`}
      width={780}
    >
      <div
        style={{
          maxHeight: 'calc(85vh - 140px)',
          overflowY: 'auto',
          paddingRight: 'var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        {/* Top Badges & Meta Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            paddingBottom: 'var(--space-3)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-bold)',
                color: 'var(--brand-400)',
              }}
            >
              {standard.standardNumber}
            </span>

            {standard.isMandatoryQco ? (
              <Badge variant="error" dot>Mandatory QCO Enforced</Badge>
            ) : (
              <Badge variant="default">Voluntary Standard</Badge>
            )}

            <Badge variant="info">
              {standard.applicableScheme === 'SCHEME_I'
                ? 'Scheme I: ISI Mark'
                : standard.applicableScheme === 'SCHEME_II'
                ? 'Scheme II: CRS Self-Declaration'
                : standard.applicableScheme === 'HALLMARKING'
                ? 'Hallmarking Scheme'
                : 'Scheme X: Foreign Manufacturers'}
            </Badge>

            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {standard.category}
            </span>
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Status: <strong style={{ color: 'var(--color-success)' }}>{standard.status}</strong> (Rev {standard.year})
          </div>
        </div>

        {/* Full Standard Title */}
        <div>
          <h2
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
              margin: '0 0 var(--space-2) 0',
              lineHeight: 1.4,
            }}
          >
            {standard.title}
          </h2>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {standard.scope}
          </p>
        </div>

        {/* Critical Parameters Section */}
        <div>
          <h4
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--brand-400)' }} />
            Critical Quality & Safety Parameters
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-2)',
            }}
          >
            {standard.criticalParameters.map((param, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--brand-400)',
                    flexShrink: 0,
                  }}
                />
                <span>{param}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Structured Clauses & Test Methods Table */}
        <div>
          <h4
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BookOpen size={16} style={{ color: 'var(--brand-400)' }} />
            Key Clauses, Test Methods & Tolerances
          </h4>

          <div
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--text-xs)',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '15%' }}>
                    Clause
                  </th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '30%' }}>
                    Specification Requirement
                  </th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '30%' }}>
                    Testing Method
                  </th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '25%' }}>
                    Prescribed Tolerance
                  </th>
                </tr>
              </thead>
              <tbody>
                {standard.clauses.map((clause, idx) => (
                  <tr
                    key={clause.clauseNumber}
                    style={{
                      borderBottom: idx === standard.clauses.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                      background: idx % 2 === 1 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--brand-300)', verticalAlign: 'top' }}>
                      {clause.clauseNumber}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{clause.title}</div>
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{clause.description}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', verticalAlign: 'top' }}>
                      {clause.testingMethod || 'Standard laboratory assay'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-warning)', fontFamily: 'var(--font-mono)', verticalAlign: 'top' }}>
                      {clause.prescribedTolerance || 'Conform per specification'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regulatory Enforcement & Lab Ecosystem */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Scale size={16} style={{ color: 'var(--color-warning)' }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                Regulatory & QCO Reference
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div><strong>Order Number:</strong> {standard.qcoNotificationNumber || 'Voluntary / General BIS Scheme'}</div>
              <div><strong>Authority:</strong> {standard.officialSource.ministryOrDepartment || 'Bureau of Indian Standards'}</div>
              <div><strong>Year Enacted:</strong> {standard.officialSource.yearOfPublication}</div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <FlaskConical size={16} style={{ color: 'var(--color-info)' }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                Conformity Assessment Labs
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div><strong>Recognized Labs:</strong> {standard.accreditedLabCount} testing facilities</div>
              <div><strong>Accreditation:</strong> BIS Central, Regional & NABL Accredited</div>
              <div>
                <Link
                  href="/consumer/laboratories"
                  style={{ color: 'var(--brand-400)', textDecoration: 'underline', marginTop: 4, display: 'inline-block' }}
                >
                  Browse testing laboratories in directory &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Advisory Disclaimer Notice */}
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--color-warning)' }}>Statutory Advisory Notice: </strong>
            This summary of standard requirements and Quality Control Orders is provided for public awareness, research, and regulatory clarity under Smart India Hackathon Problem Statement 107.
            Please consult the official Gazette of India and the Bureau of Indian Standards standards portal for definitive legal enforcement and certification filings.
          </div>
        </div>

        {/* Modal Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          {standard.officialSource.bisPortalUrl ? (
            <a
              href={standard.officialSource.bisPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-link)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} /> Official BIS Standards Portal
            </a>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Link href={assistantUrl}>
              <Button variant="primary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Bot size={14} /> Ask Assistant About This Standard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  )
}
