'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { HuidVerifierWidget } from '@/components/standards/HuidVerifierWidget'
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Cpu,
  Gem,
  Sparkles,
  Info,
  Building,
  Calendar,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'

type TabType = 'CML' | 'CRS' | 'HUID' | 'UNIVERSAL'

interface VerificationState {
  loading: boolean
  error: string | null
  result: any | null
}

export function BisVerificationClient() {
  const [activeTab, setActiveTab] = useState<TabType>('CML')

  // CM/L form state
  const [cmlNumber, setCmlNumber] = useState('')
  const [cmlStandard, setCmlStandard] = useState('')
  const [cmlState, setCmlState] = useState<VerificationState>({ loading: false, error: null, result: null })

  // CRS form state
  const [crsNumber, setCrsNumber] = useState('')
  const [crsBrand, setCrsBrand] = useState('')
  const [crsState, setCrsState] = useState<VerificationState>({ loading: false, error: null, result: null })

  // Universal form state
  const [universalInput, setUniversalInput] = useState('')
  const [universalState, setUniversalState] = useState<VerificationState>({ loading: false, error: null, result: null })

  // Verify CM/L
  const handleVerifyCml = async (overrideNum?: string) => {
    const num = (overrideNum || cmlNumber).trim()
    if (!num) {
      setCmlState({ loading: false, error: 'Please enter a CM/L license number (e.g. CM/L-1234567).', result: null })
      return
    }

    setCmlState({ loading: true, error: null, result: null })
    try {
      const res = await fetch('/api/v1/bis/verify/cml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseNumber: num, standardNumber: cmlStandard.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCmlState({ loading: false, error: json.error || 'Failed to verify CM/L license.', result: null })
      } else {
        setCmlState({ loading: false, error: null, result: json.data })
      }
    } catch (err: any) {
      setCmlState({ loading: false, error: err.message || 'Network error.', result: null })
    }
  }

  // Verify CRS
  const handleVerifyCrs = async (overrideNum?: string) => {
    const num = (overrideNum || crsNumber).trim()
    if (!num) {
      setCrsState({ loading: false, error: 'Please enter an 8-digit CRS Registration number (e.g. R-41009876).', result: null })
      return
    }

    setCrsState({ loading: true, error: null, result: null })
    try {
      const res = await fetch('/api/v1/bis/verify/crs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: num, brand: crsBrand.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCrsState({ loading: false, error: json.error || 'Failed to verify CRS registration.', result: null })
      } else {
        setCrsState({ loading: false, error: null, result: json.data })
      }
    } catch (err: any) {
      setCrsState({ loading: false, error: err.message || 'Network error.', result: null })
    }
  }

  // Universal Verify
  const handleUniversalVerify = async (overrideVal?: string) => {
    const val = (overrideVal || universalInput).trim()
    if (!val) {
      setUniversalState({ loading: false, error: 'Please enter a license, registration, or HUID code.', result: null })
      return
    }

    setUniversalState({ loading: true, error: null, result: null })
    try {
      const res = await fetch('/api/v1/bis/verify/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: val }),
      })
      const json = await res.json()
      if (!res.ok) {
        setUniversalState({ loading: false, error: json.error || 'Auto-detection or verification failed.', result: null })
      } else {
        setUniversalState({ loading: false, error: null, result: json.data })
      }
    } catch (err: any) {
      setUniversalState({ loading: false, error: err.message || 'Network error.', result: null })
    }
  }

  const renderResultCard = (result: any) => {
    if (!result) return null
    const isOperative = result.isValid && result.status === 'OPERATIVE'
    const isExpired = result.status === 'EXPIRED'

    return (
      <div
        style={{
          marginTop: 'var(--space-5)',
          background: isOperative
            ? 'rgba(16, 185, 129, 0.04)'
            : isExpired
            ? 'rgba(245, 158, 11, 0.04)'
            : 'rgba(239, 68, 68, 0.04)',
          border: `1px solid ${
            isOperative
              ? 'var(--color-success)'
              : isExpired
              ? 'var(--color-warning)'
              : 'var(--color-error)'
          }`,
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {result.licenseNumber}
              </span>
              <Badge variant={isOperative ? 'success' : isExpired ? 'warning' : 'error'}>
                {result.status}
              </Badge>
              {result.isDemoRecord && (
                <Badge variant="warning" dot>Simulated Demo Record</Badge>
              )}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              License Type: <strong>{result.licenseType}</strong> &bull; Standard: <strong>{result.standardNumber || 'Not Specified'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600, color: isOperative ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {isOperative ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {isOperative ? 'Verified Operative License' : result.status === 'EXPIRED' ? 'License Has Expired' : 'Action Required / Inactive'}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Licensee / Manufacturer:</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {result.licenseeName || 'Unknown Entity'}
            </div>
          </div>

          {result.brandName && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Registered Brand Name:</span>
              <div style={{ fontWeight: 600, color: 'var(--brand-400)', marginTop: 2 }}>
                {result.brandName}
              </div>
            </div>
          )}

          <div>
            <span style={{ color: 'var(--text-muted)' }}>Commodity Category:</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {result.productCategory || 'General Industrial Commodity'}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)' }}>Validity Period:</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {result.validFrom ? new Date(result.validFrom).toLocaleDateString('en-IN') : 'N/A'} &mdash;{' '}
              {result.validUntil ? new Date(result.validUntil).toLocaleDateString('en-IN') : 'Permanent'}
            </div>
          </div>

          {result.factoryAddress && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-muted)' }}>Premises / Factory Address:</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                {result.factoryAddress}
              </div>
            </div>
          )}
        </div>

        {result.isDemoRecord && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)' }}>
            <Info size={14} style={{ color: 'var(--color-warning)' }} />
            <span>Note: This record is a simulated demonstration entry for SIH PS107 verification and testing.</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: 'var(--space-6)',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('CML')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'CML' ? 'var(--brand-400)' : 'transparent'}`,
            color: activeTab === 'CML' ? 'var(--brand-400)' : 'var(--text-muted)',
            fontWeight: activeTab === 'CML' ? 600 : 400,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          <Award size={16} /> ISI Mark (CM/L)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CRS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'CRS' ? 'var(--brand-400)' : 'transparent'}`,
            color: activeTab === 'CRS' ? 'var(--brand-400)' : 'var(--text-muted)',
            fontWeight: activeTab === 'CRS' ? 600 : 400,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          <Cpu size={16} /> CRS Electronics (R-Number)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HUID')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'HUID' ? 'var(--brand-400)' : 'transparent'}`,
            color: activeTab === 'HUID' ? 'var(--brand-400)' : 'var(--text-muted)',
            fontWeight: activeTab === 'HUID' ? 600 : 400,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          <Gem size={16} /> Hallmarking (HUID)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('UNIVERSAL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeTab === 'UNIVERSAL' ? 'var(--brand-400)' : 'transparent'}`,
            color: activeTab === 'UNIVERSAL' ? 'var(--brand-400)' : 'var(--text-muted)',
            fontWeight: activeTab === 'UNIVERSAL' ? 600 : 400,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={16} /> Universal Mark Auto-Detect
        </button>
      </div>

      {/* TAB 1: ISI CM/L */}
      {activeTab === 'CML' && (
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={20} color="var(--brand-400)" />
              Verify BIS Scheme-I (ISI Mark) CM/L Number
            </CardTitle>
          </CardHeader>
          <CardBody style={{ padding: 'var(--space-6)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Enter the 7–8 digit Certification Marks License (CM/L) number printed beneath the ISI mark on the product packaging (e.g. <code>CM/L-1234567</code>).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleVerifyCml()
              }}
              className="responsive-form-grid-3"
              style={{ maxWidth: 720, marginBottom: 'var(--space-3)' }}
            >
              <input
                type="text"
                value={cmlNumber}
                onChange={(e) => setCmlNumber(e.target.value)}
                placeholder="e.g. CM/L-1234567 or 1234567..."
                aria-label="CM/L Licence Number"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
              <input
                type="text"
                value={cmlStandard}
                onChange={(e) => setCmlStandard(e.target.value)}
                placeholder="Optional IS (e.g. IS 14543)"
                aria-label="Optional Indian Standard Code"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
              <Button variant="primary" type="submit" disabled={cmlState.loading || !cmlNumber.trim()} aria-label="Verify CM/L Licence">
                {cmlState.loading ? <Spinner size="sm" /> : <><Search size={16} /> Verify CM/L</>}
              </Button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Quick Samples:</span>
              {[
                { label: 'CM/L-1234567 (Water)', val: 'CM/L-1234567' },
                { label: 'CM/L-7654321 (Cement)', val: 'CM/L-7654321' },
                { label: 'CM/L-9999999 (Invalid)', val: 'CM/L-9999999' },
              ].map((sample) => (
                <button
                  key={sample.val}
                  type="button"
                  aria-label={`Test sample CM/L ${sample.val}`}
                  onClick={() => {
                    setCmlNumber(sample.val)
                    handleVerifyCml(sample.val)
                  }}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 8px',
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--brand-300)',
                    cursor: 'pointer',
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {cmlState.error && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-error)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <XCircle size={16} /> <span>{cmlState.error}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVerifyCml()}
                  style={{ color: 'var(--color-error)', padding: '2px 8px' }}
                >
                  <RefreshCw size={14} style={{ marginRight: 4 }} /> Retry
                </Button>
              </div>
            )}

            {renderResultCard(cmlState.result)}
          </CardBody>
        </Card>
      )}

      {/* TAB 2: CRS */}
      {activeTab === 'CRS' && (
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={20} color="var(--color-info)" />
              Verify Compulsory Registration Scheme (CRS) Number
            </CardTitle>
          </CardHeader>
          <CardBody style={{ padding: 'var(--space-6)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Enter the 8-digit R-number assigned under the MeitY/BIS Compulsory Registration Scheme for electronics, solar, and battery items (e.g. <code>R-41009876</code>).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleVerifyCrs()
              }}
              className="responsive-form-grid-3"
              style={{ maxWidth: 720, marginBottom: 'var(--space-3)' }}
            >
              <input
                type="text"
                value={crsNumber}
                onChange={(e) => setCrsNumber(e.target.value)}
                placeholder="e.g. R-41009876 or 41009876..."
                aria-label="CRS Registration Number"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
              <input
                type="text"
                value={crsBrand}
                onChange={(e) => setCrsBrand(e.target.value)}
                placeholder="Optional Brand (e.g. TechGlow)"
                aria-label="Optional Brand Name"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
              <Button variant="primary" type="submit" disabled={crsState.loading || !crsNumber.trim()} aria-label="Verify CRS Registration">
                {crsState.loading ? <Spinner size="sm" /> : <><Search size={16} /> Verify CRS</>}
              </Button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Quick Samples:</span>
              {[
                { label: 'R-41009876 (LED Bulb)', val: 'R-41009876' },
                { label: 'R-41001234 (Adapter)', val: 'R-41001234' },
                { label: 'R-99999999 (Invalid)', val: 'R-99999999' },
              ].map((sample) => (
                <button
                  key={sample.val}
                  type="button"
                  aria-label={`Test sample CRS ${sample.val}`}
                  onClick={() => {
                    setCrsNumber(sample.val)
                    handleVerifyCrs(sample.val)
                  }}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 8px',
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--brand-300)',
                    cursor: 'pointer',
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {crsState.error && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-error)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <XCircle size={16} /> <span>{crsState.error}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVerifyCrs()}
                  style={{ color: 'var(--color-error)', padding: '2px 8px' }}
                >
                  <RefreshCw size={14} style={{ marginRight: 4 }} /> Retry
                </Button>
              </div>
            )}

            {renderResultCard(crsState.result)}
          </CardBody>
        </Card>
      )}

      {/* TAB 3: HUID */}
      {activeTab === 'HUID' && (
        <HuidVerifierWidget />
      )}

      {/* TAB 4: UNIVERSAL */}
      {activeTab === 'UNIVERSAL' && (
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="var(--brand-400)" />
              Universal BIS Mark &amp; License Auto-Detector
            </CardTitle>
          </CardHeader>
          <CardBody style={{ padding: 'var(--space-6)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Paste any identifier found on packaging or jewellery. The engine automatically classifies it as an ISI CM/L number, CRS Registration, or 6-digit HUID and verifies authenticity.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleUniversalVerify()
              }}
              style={{ display: 'flex', gap: 'var(--space-3)', maxWidth: 540, marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}
            >
              <input
                type="text"
                value={universalInput}
                onChange={(e) => setUniversalInput(e.target.value)}
                placeholder="Enter CM/L, R-number, or 6-character HUID..."
                aria-label="Universal BIS Identifier"
                style={{
                  flex: '1 1 240px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
              <Button variant="primary" type="submit" disabled={universalState.loading || !universalInput.trim()} aria-label="Auto-Detect and Verify BIS Mark">
                {universalState.loading ? <Spinner size="sm" /> : <><Search size={16} /> Auto-Detect</>}
              </Button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Quick Samples:</span>
              {[
                { label: 'CM/L-1234567', val: 'CM/L-1234567' },
                { label: 'R-41009876', val: 'R-41009876' },
                { label: 'A3F89K', val: 'A3F89K' },
              ].map((sample) => (
                <button
                  key={sample.val}
                  type="button"
                  aria-label={`Test sample universal identifier ${sample.val}`}
                  onClick={() => {
                    setUniversalInput(sample.val)
                    handleUniversalVerify(sample.val)
                  }}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 8px',
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--brand-300)',
                    cursor: 'pointer',
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {universalState.error && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--color-error)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-error)',
                  fontSize: 'var(--text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <XCircle size={16} /> <span>{universalState.error}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUniversalVerify()}
                  style={{ color: 'var(--color-error)', padding: '2px 8px' }}
                >
                  <RefreshCw size={14} style={{ marginRight: 4 }} /> Retry
                </Button>
              </div>
            )}

            {renderResultCard(universalState.result)}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
