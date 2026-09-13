'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { type BisJourneyResult } from '@/services/journey-service'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Award,
  BookOpen,
  FlaskConical,
  Scale,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Building,
  Info,
  MapPin,
  Bot,
  Layers,
  FileText,
  Clock,
  Scan,
} from 'lucide-react'

export interface BisComplianceJourneyProps {
  initialProductName?: string
  initialCategory?: string
  initialBrand?: string
  initialScanId?: string
  initialStandardNumber?: string
  onSelectStandard?: (stdNum: string) => void
}

export function BisComplianceJourney({
  initialProductName = 'Stainless Steel Water Bottle',
  initialCategory,
  initialBrand,
  initialScanId,
  initialStandardNumber,
}: BisComplianceJourneyProps) {
  const [productName, setProductName] = useState(initialProductName)
  const [category, setCategory] = useState(initialCategory || '')
  const [brand, setBrand] = useState(initialBrand || '')
  const [scanId, setScanId] = useState(initialScanId || '')
  const [selectedStandardNumber, setSelectedStandardNumber] = useState(initialStandardNumber || '')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [journey, setJourney] = useState<BisJourneyResult | null>(null)

  // Expandable section states
  const [expandedWhy, setExpandedWhy] = useState(true)
  const [expandedQco, setExpandedQco] = useState(true)
  const [expandedTesting, setExpandedTesting] = useState(false)
  const [expandedLabs, setExpandedLabs] = useState(false)

  const fetchJourney = useCallback(
    async (params?: {
      pName?: string
      cat?: string
      brd?: string
      sId?: string
      stdNum?: string
    }) => {
      setLoading(true)
      setError(null)
      try {
        const queryName = params?.pName !== undefined ? params.pName : productName
        const queryCat = params?.cat !== undefined ? params.cat : category
        const queryBrd = params?.brd !== undefined ? params.brd : brand
        const queryScanId = params?.sId !== undefined ? params.sId : scanId
        const queryStdNum = params?.stdNum !== undefined ? params.stdNum : selectedStandardNumber

        const res = await fetch('/api/v1/bis/journey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: queryName,
            category: queryCat || undefined,
            brand: queryBrd || undefined,
            scanId: queryScanId || undefined,
            standardNumber: queryStdNum || undefined,
          }),
        })

        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'Failed to evaluate compliance journey.')
        } else {
          setJourney(json.data)
        }
      } catch (err: any) {
        setError(err.message || 'Network error while fetching journey.')
      } finally {
        setLoading(false)
      }
    },
    [productName, category, brand, scanId, selectedStandardNumber]
  )

  useEffect(() => {
    fetchJourney()
  }, [fetchJourney])

  const handleStandardSwitch = (stdNum: string) => {
    setSelectedStandardNumber(stdNum)
    fetchJourney({ stdNum })
  }

  // Helpers for status badges
  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return <Badge variant="success">HIGH CONFIDENCE</Badge>
      case 'MEDIUM':
        return <Badge variant="warning">MEDIUM CONFIDENCE</Badge>
      case 'LOW':
        return <Badge variant="warning">LOW CONFIDENCE</Badge>
      default:
        return <Badge variant="default">NOT DETERMINED</Badge>
    }
  }

  const getQcoBadge = (status: string, isMandatory: boolean) => {
    if (isMandatory || status === 'APPLICABLE') {
      return <Badge variant="policy" dot>MANDATORY QCO IN FORCE</Badge>
    }
    if (status === 'NOT_YET_EFFECTIVE') {
      return <Badge variant="warning">NOT YET EFFECTIVE</Badge>
    }
    if (status === 'NOT_APPLICABLE') {
      return <Badge variant="default">VOLUNTARY / NO MANDATORY QCO</Badge>
    }
    return <Badge variant="default">QCO NOT DETERMINED</Badge>
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── DEMO DATA BANNER ── */}
      {journey?.isDemoData && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 16px',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-warning)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} />
            <span>
              <strong>SIMULATED / DEMO DATASET:</strong> Grounded in official Indian Standards (IS), DPIIT Quality Control Orders, and BIS Scheme regulations. Demo records are explicitly labeled.
            </span>
          </div>
          <Badge variant="warning">DEMO DATA</Badge>
        </div>
      )}

      {/* ── LOADING & ERROR STATES ── */}
      {loading && !journey && (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Spinner size="lg" />
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Analyzing Product &amp; Evaluating Compliance Journey...</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Checking Indian Standards, QCO schedules, certification schemes, testing parameters, and accredited laboratories.
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card style={{ padding: 'var(--space-6)', border: '1px solid var(--color-error)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-error)' }}>
              <XCircle size={20} />
              <div>
                <div style={{ fontWeight: 600 }}>Unable to retrieve BIS information</div>
                <div style={{ fontSize: 'var(--text-xs)' }}>{error}</div>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => fetchJourney()}>
              <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry
            </Button>
          </div>
        </Card>
      )}

      {journey && (
        <>
          {/* ───────────────────────────────────────────────────────────── */}
          {/* PRODUCT STAGE (SOURCE OF JOURNEY) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <Card style={{ border: '1px solid var(--border-default)' }}>
            <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--brand-400)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    PROD
                  </div>
                  <CardTitle style={{ fontSize: 'var(--text-base)' }}>Product Under Assessment</CardTitle>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {journey.product.source === 'PRODUCT_SCAN' ? (
                    <Badge variant="info">
                      <Scan size={12} style={{ marginRight: 4 }} />
                      EXTRACTED FROM SCAN
                    </Badge>
                  ) : (
                    <Badge variant="default">USER SEARCH</Badge>
                  )}
                  {journey.product.confidence !== null && (
                    <Badge variant="success">{journey.product.confidence}% OCR CONFIDENCE</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Identified Product Name</div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {journey.product.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Commodity Category</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {journey.product.category || 'Standard Packaged Commodity'}
                  </div>
                </div>
                {journey.product.brand && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Brand / Label</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {journey.product.brand}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 01: APPLICABLE INDIAN STANDARD */}
          {/* ───────────────────────────────────────────────────────────── */}
          <Card style={{ border: '1px solid var(--border-default)', position: 'relative' }}>
            <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--brand-500)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    01
                  </div>
                  <div>
                    <CardTitle style={{ fontSize: 'var(--text-base)' }}>Applicable Indian Standard</CardTitle>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Identified via substantive commodity classification &amp; BIS catalog
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getConfidenceBadge(journey.standard.confidenceLevel)}
                  {journey.standard.state === 'ASSOCIATED' ? (
                    <Badge variant="success">ASSOCIATED</Badge>
                  ) : (
                    <Badge variant="warning">NEEDS REVIEW</Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardBody>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        color:
                          journey.standard.selected.standardNumber === 'NOT_DETERMINED'
                            ? 'var(--text-muted)'
                            : 'var(--brand-400)',
                      }}
                    >
                      {journey.standard.selected.standardNumber}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
                      {journey.standard.selected.title}
                    </div>
                  </div>

                  {journey.standard.selected.standardNumber !== 'NOT_DETERMINED' && (
                    <Link
                      href={`/consumer/standards?q=${encodeURIComponent(journey.standard.selected.standardNumber)}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: 'var(--brand-400)',
                        textDecoration: 'none',
                      }}
                    >
                      <BookOpen size={14} /> View Standard Specifications <ExternalLink size={12} />
                    </Link>
                  )}
                </div>

                {/* Candidate switchers if multiple matches */}
                {journey.standard.candidates.length > 1 && (
                  <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Other candidate standards evaluated:
                    </div>
                    {loading && (
                      <div
                        role="status"
                        aria-live="polite"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          background: 'rgba(59, 130, 246, 0.08)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          marginBottom: 'var(--space-3)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--brand-400)',
                          fontWeight: 500,
                        }}
                      >
                        <Spinner size="sm" />
                        <span>Evaluating candidate standard specifications &amp; re-calculating compliance journey...</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {journey.standard.candidates.map((cand) => (
                        <button
                          key={cand.standardNumber}
                          disabled={loading}
                          aria-disabled={loading}
                          aria-label={`Switch standard to ${cand.standardNumber}`}
                          onClick={() => handleStandardSwitch(cand.standardNumber)}
                          style={{
                            background:
                              cand.standardNumber === journey.standard.selected.standardNumber
                                ? 'var(--brand-500)'
                                : 'var(--bg-surface)',
                            color:
                              cand.standardNumber === journey.standard.selected.standardNumber
                                ? '#ffffff'
                                : 'var(--text-secondary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            padding: '4px 10px',
                            fontSize: 'var(--text-xs)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            fontWeight: 500,
                            transition: 'opacity 0.2s ease, background-color 0.15s ease',
                          }}
                        >
                          {cand.standardNumber} ({Math.round(cand.relevance * 100)}%)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 02: WHY THIS STANDARD? (EXPLAINABILITY) */}
          {/* ───────────────────────────────────────────────────────────── */}
          <Card style={{ border: '1px solid var(--border-default)' }}>
            <CardHeader
              style={{ cursor: 'pointer', userSelect: 'none', paddingBottom: expandedWhy ? 'var(--space-2)' : 'var(--space-4)' }}
              onClick={() => setExpandedWhy(!expandedWhy)}
              role="button"
              tabIndex={0}
              aria-expanded={expandedWhy}
              aria-label="Toggle Why This Standard explainability section"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedWhy(!expandedWhy)
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--color-success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    02
                  </div>
                  <div>
                    <CardTitle style={{ fontSize: 'var(--text-base)' }}>Why This Standard?</CardTitle>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Evidentiary reasoning, commodity scope &amp; statutory rationale
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant={journey.whyThisStandard.isSufficient ? 'success' : 'default'}>
                    {journey.whyThisStandard.isSufficient ? 'EVIDENCE GROUNDED' : 'INSUFFICIENT EVIDENCE'}
                  </Badge>
                  {expandedWhy ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </CardHeader>

            {expandedWhy && (
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-elevated)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--brand-500)',
                    }}
                  >
                    {journey.whyThisStandard.summary}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                    <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Commodity Scope Match
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {journey.whyThisStandard.commodityScopeMatch}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Intended Use &amp; Application
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {journey.whyThisStandard.intendedUse}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Material &amp; Specifications
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {journey.whyThisStandard.materialComposition}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Authoritative Data Source
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {journey.whyThisStandard.dataSource}
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            )}
          </Card>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 03: QUALITY CONTROL ORDER (QCO) APPLICABILITY */}
          {/* ───────────────────────────────────────────────────────────── */}
          <Card style={{ border: '1px solid var(--border-default)' }}>
            <CardHeader
              style={{ cursor: 'pointer', userSelect: 'none', paddingBottom: expandedQco ? 'var(--space-2)' : 'var(--space-4)' }}
              onClick={() => setExpandedQco(!expandedQco)}
              role="button"
              tabIndex={0}
              aria-expanded={expandedQco}
              aria-label="Toggle Quality Control Order applicability section"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedQco(!expandedQco)
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--color-error)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    03
                  </div>
                  <div>
                    <CardTitle style={{ fontSize: 'var(--text-base)' }}>Quality Control Order (QCO) Applicability</CardTitle>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Statutory mandates under Section 16 of the Bureau of Indian Standards Act, 2016
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getQcoBadge(journey.qco.status, journey.qco.isMandatory)}
                  {expandedQco ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </CardHeader>

            {expandedQco && (
              <CardBody>
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Notified QCO Order</div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {journey.qco.orderTitle}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Gazette Order Number</div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {journey.qco.orderNumber}
                      </div>
                    </div>

                    {journey.qco.ministry && (
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Issuing Ministry / Department</div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {journey.qco.ministry}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Mandatory Enforcement Status</div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: journey.qco.isMandatory ? 'var(--color-policy)' : 'var(--color-success)', marginTop: 2 }}>
                        {journey.qco.isMandatory ? 'COMPULSORY CERTIFICATION REQUIRED' : 'VOLUNTARY / NONE'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 'var(--space-4)',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <strong>Statutory Note:</strong> {journey.qco.disclaimer}
                  </div>
                </div>
              </CardBody>
            )}
          </Card>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 04: CERTIFICATION ROUTE */}
          {/* ───────────────────────────────────────────────────────────── */}
          <Card style={{ border: '1px solid var(--border-default)' }}>
            <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: 'var(--color-warning)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    04
                  </div>
                  <div>
                    <CardTitle style={{ fontSize: 'var(--text-base)' }}>Statutory Certification Route</CardTitle>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Conformity assessment procedure required under BIS regulations
                    </div>
                  </div>
                </div>

                <Badge variant={journey.certification.requirementType === 'NOT_DETERMINED' ? 'default' : 'info'}>
                  {journey.certification.schemeName}
                </Badge>
              </div>
            </CardHeader>

            <CardBody>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div style={{ maxWidth: 650 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={18} style={{ color: 'var(--brand-400)' }} />
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {journey.certification.markName}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                    {journey.certification.description}
                  </div>
                </div>

                <div>
                  <Link href={journey.certification.actionRoute}>
                    <Button variant="primary" size="sm">
                      <ShieldCheck size={14} style={{ marginRight: 6 }} />
                      Verify Licence / Marking
                    </Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 05: REQUIRED TESTING SPECIFICATIONS */}
          {/* ───────────────────────────────────────────────────────────── */}
          <Card style={{ border: '1px solid var(--border-default)' }}>
            <CardHeader
              style={{ cursor: 'pointer', userSelect: 'none', paddingBottom: expandedTesting ? 'var(--space-2)' : 'var(--space-4)' }}
              onClick={() => setExpandedTesting(!expandedTesting)}
              role="button"
              tabIndex={0}
              aria-expanded={expandedTesting}
              aria-label="Toggle Required Testing Specifications section"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedTesting(!expandedTesting)
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(14, 165, 233, 0.1)',
                      color: 'var(--color-info)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    05
                  </div>
                  <div>
                    <CardTitle style={{ fontSize: 'var(--text-base)' }}>Required Testing Specifications</CardTitle>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Laboratory testing parameters, sampling methods &amp; tolerance limits
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant={journey.testing.status === 'AVAILABLE' ? 'success' : 'default'}>
                    {journey.testing.status === 'AVAILABLE'
                      ? `${journey.testing.parameters.length} PARAMETERS RECORDED`
                      : 'NOT DETERMINED'}
                  </Badge>
                  {expandedTesting ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </CardHeader>

            {expandedTesting && (
              <CardBody>
                {journey.testing.status === 'NOT_DETERMINED' ? (
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <HelpCircle size={16} />
                    <span>{journey.testing.reason || 'Testing requirements unavailable until applicable standard is established.'}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {journey.testing.parameters.map((param, pIdx) => (
                      <div
                        key={pIdx}
                        className="responsive-testing-grid"
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--brand-400)' }}>{param.clauseNumber || `Test ${pIdx + 1}`}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{param.name}</div>
                          <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{param.testingMethod}</div>
                        </div>
                        <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600 }}>Tolerance / Limit:</span> {param.prescribedTolerance}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            )}
          </Card>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 06: RELEVANT ACCREDITED TESTING LABORATORY */}
          {/* ───────────────────────────────────────────────────────────── */}
          <Card style={{ border: '1px solid var(--border-default)' }}>
            <CardHeader
              style={{ cursor: 'pointer', userSelect: 'none', paddingBottom: expandedLabs ? 'var(--space-2)' : 'var(--space-4)' }}
              onClick={() => setExpandedLabs(!expandedLabs)}
              role="button"
              tabIndex={0}
              aria-expanded={expandedLabs}
              aria-label="Toggle Accredited Testing Laboratories section"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedLabs(!expandedLabs)
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(168, 85, 247, 0.1)',
                      color: 'var(--brand-400)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    06
                  </div>
                  <div>
                    <CardTitle style={{ fontSize: 'var(--text-base)' }}>Accredited Testing Laboratories</CardTitle>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      BIS Central, Regional, and NABL facilities equipped for conformity testing
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant={journey.laboratory.status === 'AVAILABLE' ? 'success' : 'default'}>
                    {journey.laboratory.status === 'AVAILABLE'
                      ? `${journey.laboratory.totalCount} FACILITIES MATCHED`
                      : 'NOT DETERMINED'}
                  </Badge>
                  {expandedLabs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </CardHeader>

            {expandedLabs && (
              <CardBody>
                {journey.laboratory.status === 'NOT_DETERMINED' ? (
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <FlaskConical size={16} />
                    <span>{journey.laboratory.reason || 'Relevant lab cannot be confidently determined yet.'}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {journey.laboratory.notice}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                      {journey.laboratory.facilities.map((lab) => (
                        <div
                          key={lab.id}
                          style={{
                            background: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '14px',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                                {lab.name}
                              </span>
                              <Badge variant={lab.labType === 'BIS_CENTRAL' ? 'info' : 'default'}>{lab.labType}</Badge>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                              <MapPin size={12} />
                              <span>{lab.city}, {lab.state}</span>
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 8 }}>
                              <strong>Reg:</strong> {lab.registrationNumber}
                            </div>
                          </div>

                          <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 500 }}>
                              ✓ Capable for {journey.standard.selected.standardNumber}
                            </span>
                            <Link href={`/consumer/laboratories?q=${encodeURIComponent(lab.name)}`}>
                              <Button variant="ghost" size="sm" style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}>
                                Contact Info
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            )}
          </Card>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 07: CONTEXTUAL NEXT ACTION & AI ASSISTANT LAUNCH */}
          {/* ───────────────────────────────────────────────────────────── */}
          <Card
            style={{
              border: '1px solid var(--brand-500)',
              background: 'linear-gradient(180deg, var(--bg-surface) 0%, rgba(59, 130, 246, 0.04) 100%)',
            }}
          >
            <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--brand-500)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    07
                  </div>
                  <div>
                    <CardTitle style={{ fontSize: 'var(--text-base)' }}>Recommended Next Action</CardTitle>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Contextual compliance directive based on statutory determination
                    </div>
                  </div>
                </div>

                <Badge variant="info">DIRECTIVE ACTIVE</Badge>
              </div>
            </CardHeader>

            <CardBody>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  paddingBottom: 'var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {journey.nextAction.actionTitle}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4, maxWidth: 620 }}>
                    {journey.nextAction.actionDescription}
                  </div>
                </div>

                <Link href={journey.nextAction.primaryButtonHref}>
                  <Button variant="primary" size="md">
                    {journey.nextAction.primaryButtonText} <ArrowRight size={14} style={{ marginLeft: 6 }} />
                  </Button>
                </Link>
              </div>

              {/* Contextual AI Assistant Quick Actions */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand-400)', marginBottom: 8 }}>
                  <Bot size={14} />
                  <span>Ask AI Assistant with Journey Context:</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {journey.nextAction.contextualPrompts.map((cp, idx) => (
                    <Link
                      key={idx}
                      href={`/consumer/assistant?standard=${encodeURIComponent(
                        journey.standard.selected.standardNumber
                      )}&productName=${encodeURIComponent(journey.product.name)}&topic=${encodeURIComponent(cp.prompt)}&q=${encodeURIComponent(cp.prompt)}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <button
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                          padding: '6px 12px',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          transition: 'background var(--transition-fast)',
                        }}
                      >
                        <Sparkles size={12} style={{ color: 'var(--brand-400)' }} />
                        <span>{cp.label}</span>
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
