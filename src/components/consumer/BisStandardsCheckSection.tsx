'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge, MarkDetectionBadge, RegistryVerificationBadge, QcoRegimeBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Award,
  Scale,
  BookOpen,
  Info,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface BisStandardsCheckSectionProps {
  scanId: string
  productName?: string
  brandName?: string
  category?: string
  isAuthorityView?: boolean
}

export function BisStandardsCheckSection({
  scanId,
  productName,
  brandName,
  category,
  isAuthorityView = false,
}: BisStandardsCheckSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)
  const [showFindings, setShowFindings] = useState(true)

  const fetchStandardsCheck = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/bis/scans/${scanId}/standards-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to evaluate BIS & Indian Standards compliance.')
      } else {
        setData(json.data)
      }
    } catch (err: any) {
      setError(err.message || 'Network error while checking standards compliance.')
    } finally {
      setLoading(false)
    }
  }, [scanId])

  useEffect(() => {
    if (scanId) {
      fetchStandardsCheck()
    }
  }, [scanId, fetchStandardsCheck])

  // Helpers for badge styling
  const getOverallBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'success'
      case 'PARTIALLY_COMPLIANT':
      case 'POTENTIAL_NON_COMPLIANCE':
        return 'warning'
      case 'ACTION_REQUIRED':
      case 'NON_COMPLIANT':
        return 'error'
      default:
        return 'default'
    }
  }

  const getBisBadgeVariant = (status: string) => {
    switch (status) {
      case 'CLEAR':
        return 'success'
      case 'NEEDS_REVIEW':
        return 'warning'
      case 'POTENTIAL_NON_COMPLIANCE':
        return 'error'
      case 'NOT_APPLICABLE':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <Card style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--border-default)' }}>
      <CardHeader style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--brand-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={20} />
            </div>
            <div>
              <CardTitle style={{ fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Bureau of Indian Standards (BIS) &amp; QCO Compliance
              </CardTitle>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Dual-Domain Packaged Commodity Evaluation &bull; SIH 2026 PS107
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchStandardsCheck}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Evaluating...' : 'Re-check Standards'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardBody style={{ padding: 'var(--space-6)' }}>
        {/* Loading State */}
        {loading && !data && (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <Spinner size="lg" />
            <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Cross-referencing extracted packaging declarations against Quality Control Orders and Indian Standards catalog...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <XCircle size={18} />
              <span>{error}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchStandardsCheck}>
              Try Again
            </Button>
          </div>
        )}

        {/* Success Data Content */}
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* 1. Unified Verdict Banner */}
            <div
              style={{
                background:
                  data.overall?.status === 'COMPLIANT'
                    ? 'rgba(16, 185, 129, 0.06)'
                    : 'rgba(245, 158, 11, 0.06)',
                border: `1px solid ${
                  data.overall?.status === 'COMPLIANT'
                    ? 'var(--color-success)'
                    : 'var(--color-warning)'
                }`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4) var(--space-5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Unified Disposition:
                    </span>
                    <Badge variant={getOverallBadgeVariant(data.overall?.status)}>
                      {data.overall?.status?.replace(/_/g, ' ')}
                    </Badge>
                    {data.bis?.isDemoData && (
                      <Badge variant="warning" dot>Simulated Demo Data</Badge>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                    {data.overall?.summary || 'Evaluation completed successfully.'}
                  </p>
                </div>

                {/* Sub-verdict pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>LMPC Domain:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{data.lmpc?.status}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>BIS Domain:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{data.bis?.status}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Four Key Assessment Pillars Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              {/* Pillar A: Mark Detection */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                    1. Packaging Mark Detection
                  </span>
                  <MarkDetectionBadge
                    status={data.bis?.detectedIdentifiers?.some((i: any) => i.state === 'DETECTED') ? 'DETECTED' : 'NOT_DETECTED'}
                    label={data.bis?.detectedIdentifiers?.some((i: any) => i.state === 'DETECTED') ? 'Detected on Pack' : 'Not Detected'}
                  />
                </div>

                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {data.bis?.markDetection?.type ||
                    data.bis?.detectedIdentifiers?.[0]?.type?.replace(/_/g, ' ') ||
                    'No Standard Mark'}
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Value: {data.bis?.detectedIdentifiers?.[0]?.detectedValue || 'None Extracted'}
                </div>

                {data.bis?.detectedIdentifiers?.[0]?.confidence && (
                  <div style={{ fontSize: '11px', color: 'var(--brand-400)', marginTop: 4 }}>
                    Confidence: {Math.round(data.bis.detectedIdentifiers[0].confidence * 100)}%
                  </div>
                )}
              </div>

              {/* Pillar B: License Validity */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                    2. License Validity
                  </span>
                  {data.bis?.verificationSummary?.status ? (
                    <RegistryVerificationBadge
                      status={data.bis.verificationSummary.status}
                      label={data.bis.verificationSummary.status}
                    />
                  ) : (
                    <Badge variant="default">Pending</Badge>
                  )}
                </div>

                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {data.bis?.verificationSummary?.details?.status ||
                    (data.bis?.verificationSummary?.status === 'VERIFIED' ? 'OPERATIVE' : 'Unverified / None')}
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {data.bis?.verificationSummary?.details?.licenseeName || 'No verified licensee record'}
                </div>
              </div>

              {/* Pillar C: Mandatory QCO Applicability */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                    3. Mandatory QCO Order
                  </span>
                  <QcoRegimeBadge
                    isMandatory={data.bis?.qcoApplicability?.isMandatoryCertification}
                    label={data.bis?.qcoApplicability?.isMandatoryCertification ? 'Compulsory QCO' : 'Voluntary'}
                  />
                </div>

                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {data.bis?.qcoApplicability?.orderTitle || 'No QCO Mandate Identified'}
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {data.bis?.qcoApplicability?.orderNumber || 'General Consumer Commodity'}
                </div>
              </div>

              {/* Pillar D: Applicable Indian Standard */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                    4. Applicable Standard
                  </span>
                  {data.bis?.candidateStandards?.[0]?.standardNumber &&
                    data.bis.candidateStandards[0].standardNumber !== 'NOT_DETERMINED' && (
                    <Link
                      href={`/consumer/standards?q=${encodeURIComponent(data.bis.candidateStandards[0].standardNumber)}`}
                      style={{ fontSize: '11px', color: 'var(--brand-400)', display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      Explore <ExternalLink size={11} />
                    </Link>
                  )}
                </div>

                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--brand-400)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  {data.bis?.candidateStandards?.[0]?.standardNumber === 'NOT_DETERMINED'
                    ? 'NOT DETERMINED'
                    : data.bis?.candidateStandards?.[0]?.standardNumber || 'NOT DETERMINED'}
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.bis?.candidateStandards?.[0]?.title || 'No applicable Indian Standard identified'}
                </div>
              </div>
            </div>

            {/* 3. Detailed Standards Findings */}
            {data.bis?.findings && data.bis.findings.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowFindings(!showFindings)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 0',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={16} color="var(--brand-400)" />
                    <span>Detailed Standards Compliance Findings ({data.bis.findings.length})</span>
                  </div>
                  {showFindings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showFindings && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                    {data.bis.findings.map((f: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--space-4)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Badge
                              variant={
                                f.severity === 'CRITICAL' || f.severity === 'HIGH'
                                  ? 'error'
                                  : f.severity === 'MEDIUM'
                                  ? 'warning'
                                  : 'info'
                              }
                            >
                              {f.severity}
                            </Badge>
                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {f.title}
                            </span>
                          </div>
                          {f.code && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                              {f.code}
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 6px 0' }}>
                          {f.explanation}
                        </p>

                        {f.recommendation && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-300)', marginTop: 4 }}>
                            <strong>Recommendation:</strong> {f.recommendation}
                          </div>
                        )}

                        {(f.standardReference || f.qcoReference) && (
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {f.standardReference && <span>Standard: {f.standardReference}</span>}
                            {f.qcoReference && <span>QCO Order: {f.qcoReference}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Action Bar to Assistant & Compliance Journey */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                <Sparkles size={14} color="var(--brand-400)" />
                <span>Trace end-to-end standard, QCO, certification, testing, and lab pathway:</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link
                  href={`/consumer/journey?scanId=${encodeURIComponent(scanId)}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="primary" size="sm">
                    View Compliance Journey &rarr;
                  </Button>
                </Link>
                <Link
                  href={`/consumer/assistant?standard=${encodeURIComponent(
                    data.bis?.candidateStandards?.[0]?.standardNumber || ''
                  )}&productName=${encodeURIComponent(productName || '')}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="secondary" size="sm">
                    Ask AI Assistant
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
