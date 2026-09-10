'use client'

import React, { useState } from 'react'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AlertCircle } from 'lucide-react'

interface ComplaintFormProps {
  productId?: string
  scanId?: string
  onSuccess?: (complaintRef: string) => void
  onCancel?: () => void
}

export function ComplaintForm({ productId, scanId, onSuccess, onCancel }: ComplaintFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, productId, scanId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit complaint')
        return
      }
      if (onSuccess && data.data?.complaintRef) {
        onSuccess(data.data.complaintRef)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
            fontSize: 'var(--text-sm)',
            color: 'var(--color-error-dark)',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      <Input
        label="Complaint Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Missing MRP declaration on biscuit packet"
        required
        hint="Brief summary of the issue"
      />

      <Textarea
        label="Detailed Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the product and specific Legal Metrology violation..."
        required
        rows={5}
      />

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button type="submit" variant="primary" loading={submitting}>
          Submit Complaint
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
