'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AlertCircle, CheckCircle, Copy, Link as LinkIcon } from 'lucide-react'

function ComplaintForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialScanId = searchParams.get('scanId') || ''
  const initialTitle = searchParams.get('title') || ''

  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState('')
  const [scanId] = useState(initialScanId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id?: string; complaintRef: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          scanId: scanId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit complaint')
        return
      }
      setResult({ id: data.data.id, complaintRef: data.data.complaintRef })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div>
        <PageHeader
          title="Complaint Submitted"
          breadcrumbs={[
            { label: 'Complaints', href: '/consumer/complaints' },
            { label: 'New Complaint' },
          ]}
        />
        <div
          style={{
            maxWidth: 520,
            background: 'var(--bg-surface)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            textAlign: 'center',
          }}
        >
          <CheckCircle size={48} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-4)' }} />
          <h2 style={{ marginBottom: 'var(--space-2)' }}>Complaint Filed Successfully</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
            Your complaint has been received and registered. You can track its investigation progress in real time.
          </p>
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-primary)',
              letterSpacing: '0.1em',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-3)',
            }}
          >
            {result.complaintRef.slice(-12).toUpperCase()}
            <button
              onClick={() => navigator.clipboard.writeText(result.complaintRef)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
              title="Copy reference"
            >
              <Copy size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            {result.id && (
              <Button variant="primary" onClick={() => router.push(`/consumer/complaints/${result.id}`)} id="track-complaint-btn">
                Track Complaint
              </Button>
            )}
            <Button variant={result.id ? "secondary" : "primary"} onClick={() => router.push('/consumer/complaints')}>
              View All Complaints
            </Button>
            <Button variant="ghost" onClick={() => { setResult(null); setTitle(''); setDescription('') }}>
              File Another
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="File a Complaint"
        description="Report a product you believe is non-compliant with Legal Metrology regulations."
        breadcrumbs={[{ label: 'Complaints', href: '/consumer/complaints' }, { label: 'New Complaint' }]}
      />

      <div style={{ maxWidth: 640 }}>
        {scanId && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '6px 12px',
              background: 'var(--brand-950)',
              border: '1px solid var(--brand-700)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              color: 'var(--brand-200)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <LinkIcon size={13} style={{ color: 'var(--brand-400)' }} />
            <span>
              Originating Scan Linked: <strong>#{scanId.slice(-8).toUpperCase()}</strong>
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-5)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-error-dark)',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Input
            label="Complaint Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Missing MRP declaration on biscuit packet"
            required
            hint="Briefly describe the issue"
            id="complaint-title"
          />
          <Textarea
            label="Detailed Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the product, the issue you found, and any other relevant details…"
            required
            rows={6}
            style={{ minHeight: 140 }}
            id="complaint-description"
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button type="submit" variant="primary" size="lg" loading={submitting} id="submit-complaint-btn">
              Submit Complaint
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewComplaintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--space-8)' }}>Loading complaint form…</div>}>
      <ComplaintForm />
    </Suspense>
  )
}
