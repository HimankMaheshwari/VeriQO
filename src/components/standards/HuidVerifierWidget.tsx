'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Gem,
  Building2,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react'

export interface HuidVerificationData {
  isValid: boolean
  licenseNumber: string
  licenseType: string
  status: string
  licenseeName?: string
  brandName?: string
  factoryAddress?: string
  standardNumber?: string
  validFrom?: string | null
  validUntil?: string | null
  productCategory?: string | null
  varietyDescription?: string | null
  isDemoRecord: boolean
  metadata?: Record<string, any>
  message?: string
}

interface HuidVerifierWidgetProps {
  initialCode?: string
  onVerified?: (data: HuidVerificationData) => void
  showTitle?: boolean
}

export function HuidVerifierWidget({
  initialCode = '',
  onVerified,
  showTitle = true,
}: HuidVerifierWidgetProps) {
  const [code, setCode] = useState(initialCode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<HuidVerificationData | null>(null)

  const handleVerify = async (codeToVerify?: string) => {
    const raw = (codeToVerify || code).trim().toUpperCase()
    if (!raw) {
      setError('Please enter a 6-character HUID code.')
      return
    }

    if (raw.length !== 6) {
      setError('HUID must be exactly 6 alphanumeric characters (e.g. A3F89K).')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/v1/bis/verify/huid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ huid: raw }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'HUID verification failed.')
      } else {
        setResult(json.data)
        if (onVerified) onVerified(json.data)
      }
    } catch (err: any) {
      setError(err.message || 'Network error verifying HUID code.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickCode = (quickCode: string) => {
    setCode(quickCode)
    handleVerify(quickCode)
  }

  return (
    <Card style={{ marginBottom: 'var(--space-8)' }}>
      {showTitle && (
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} color="var(--brand-400)" />
            HUID Format Validation &amp; Purity Lookup
          </CardTitle>
        </CardHeader>
      )}
      <CardBody style={{ padding: 'var(--space-6)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleVerify()
          }}
          style={{ display: 'flex', gap: 'var(--space-3)', maxWidth: 540, marginBottom: 'var(--space-3)' }}
        >
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              if (error) setError(null)
            }}
            placeholder="Enter 6-character HUID code (e.g. A3F89K)..."
            maxLength={6}
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: `1px solid ${error ? 'var(--color-error)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              letterSpacing: '0.1em',
            }}
          />
          <Button variant="primary" type="submit" disabled={loading || code.trim().length === 0}>
            {loading ? <Spinner size="sm" /> : <><Search size={16} /> Verify HUID</>}
          </Button>
        </form>

        {/* Quick sample chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Quick Samples:</span>
          {['A3F89K', 'G7K29P', 'AB12CD'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => handleQuickCode(sample)}
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
              {sample}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
          Validation strictly checks the 6-character laser-engraved alphanumeric Hallmarking Unique Identification (HUID) registered with BIS Assaying &amp; Hallmarking Centres (AHC).
        </p>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 'var(--text-sm)',
              color: 'var(--color-error)',
            }}
          >
            <XCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Result Card */}
        {result && (
          <div
            style={{
              marginTop: 'var(--space-5)',
              background: result.isValid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
              border: `1px solid ${result.isValid ? 'var(--color-success)' : 'var(--color-error)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 'var(--space-3)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    HUID: {result.licenseNumber}
                  </span>
                  <Badge variant={result.isValid ? 'success' : 'error'}>
                    {result.status === 'OPERATIVE' ? 'AUTHENTIC / ACTIVE' : result.status}
                  </Badge>
                  {result.isDemoRecord && (
                    <Badge variant="warning" dot>Demo Record</Badge>
                  )}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Standard Specification: <strong>{result.standardNumber || 'IS 1417 (Gold Fineness & Hallmarking)'}</strong>
                </div>
              </div>

              {result.isValid && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> Laser Hallmarking Verified
                </div>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-3)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Jeweller / Licensee:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {result.licenseeName || 'Registered Jeweller'}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Purity &amp; Fineness:</span>
                <div style={{ fontWeight: 600, color: 'var(--brand-400)', marginTop: 2 }}>
                  {result.varietyDescription || '22 Karat (916 Fineness)'}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Assaying Centre (AHC):</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {result.factoryAddress || 'Recognized BIS Assaying & Hallmarking Centre'}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Hallmarked / Valid Until:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {result.validUntil ? new Date(result.validUntil).toLocaleDateString('en-IN') : 'Permanent Traceability'}
                </div>
              </div>
            </div>

            {result.isDemoRecord && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)' }}>
                <Info size={13} style={{ color: 'var(--color-warning)' }} />
                <span>Notice: This is a verified demonstration HUID registry entry for SIH PS107 evaluation.</span>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
