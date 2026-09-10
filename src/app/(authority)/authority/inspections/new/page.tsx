'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Link as LinkIcon, ScanLine } from 'lucide-react'

function NewInspectionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialScanId = searchParams.get('scanId') || ''
  const initialTitle = searchParams.get('title') || ''

  const [title, setTitle] = useState(initialTitle)
  const [scanId, setScanId] = useState(initialScanId)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
          scanId: scanId.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create inspection')
        return
      }
      router.push(`/authority/inspections/${data.data.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Create Inspection"
        description="Start a new product compliance inspection."
        breadcrumbs={[{ label: 'Inspections', href: '/authority/inspections' }, { label: 'New Inspection' }]}
      />

      <div style={{ maxWidth: 640 }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)', background: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)', color: 'var(--color-error-dark)',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Input
            label="Inspection Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Inspection of XYZ Biscuit Packets — Market Survey"
            hint="A descriptive title for this inspection"
            id="inspection-title"
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                Linked Product Scan ID (Optional)
              </label>
              <Link
                href="/authority/scan"
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--brand-400)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none',
                }}
              >
                <ScanLine size={13} /> Launch Product Scanner ↗
              </Link>
            </div>
            <Input
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              placeholder="e.g. cmtomnp5r001tc9xrg837zukn"
              hint="Paste a scan session ID to link uploaded package images, OCR text, and extracted declarations"
              id="inspection-scan-id"
            />
          </div>

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
              }}
            >
              <LinkIcon size={13} style={{ color: 'var(--brand-400)' }} />
              <span>Target Scan Linked: <strong>#{scanId.slice(-8).toUpperCase()}</strong></span>
            </div>
          )}

          <Textarea
            label="Initial Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any initial observations or context for this inspection…"
            rows={4}
            id="inspection-notes"
          />

          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-info-bg)',
              border: '1px solid var(--color-info)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-info-dark)',
              lineHeight: 1.5,
            }}
          >
            <strong>Statutory Compliance Inspection:</strong> Linking a product scan automatically attaches the uploaded packaging
            images, verbatim OCR extractions, and identified declarations to this inspection. You can then execute deterministic
            Legal Metrology compliance analysis, review statutory rule versions, and record official officer decisions.
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button type="submit" variant="primary" size="lg" loading={submitting} id="create-inspection-btn">
              Create Inspection
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

export default function NewInspectionPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--space-8)' }}>Loading inspection form…</div>}>
      <NewInspectionForm />
    </Suspense>
  )
}
