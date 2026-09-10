'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, Clock, ArrowRight } from 'lucide-react'

interface InspectionWorkflowProps {
  inspectionId: string
  currentStatus: 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'CLOSED'
  onStatusChange?: (newStatus: string) => void
}

const steps = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'PENDING_REVIEW', label: 'Review' },
  { key: 'CLOSED', label: 'Closed' },
]

export function InspectionWorkflow({
  inspectionId,
  currentStatus,
  onStatusChange,
}: InspectionWorkflowProps) {
  const [updating, setUpdating] = useState(false)
  const currentIndex = steps.findIndex((s) => s.key === currentStatus)

  async function updateStatus(nextStatus: string) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/v1/inspections/${inspectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok && onStatusChange) {
        onStatusChange(nextStatus)
      }
    } catch (err) {
      console.error('Workflow update error:', err)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Card>
      <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
        Inspection Lifecycle
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {steps.map((step, idx) => {
          const isPassed = idx < currentIndex
          const isCurrent = idx === currentIndex
          return (
            <React.Fragment key={step.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-bold)',
                    background: isCurrent
                      ? 'var(--brand-600)'
                      : isPassed
                      ? 'var(--color-success-bg)'
                      : 'var(--bg-elevated)',
                    color: isCurrent
                      ? 'white'
                      : isPassed
                      ? 'var(--color-success)'
                      : 'var(--text-muted)',
                    border: `1px solid ${isCurrent ? 'var(--brand-500)' : isPassed ? 'var(--color-success)' : 'var(--border-default)'}`,
                  }}
                >
                  {isPassed ? <CheckCircle2 size={16} /> : isCurrent ? <Clock size={16} /> : idx + 1}
                </div>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: isCurrent ? 'var(--font-semibold)' : 'var(--font-normal)',
                    color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: idx < currentIndex ? 'var(--color-success)' : 'var(--border-default)',
                    marginBottom: 16,
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {currentIndex < steps.length - 1 && (
        <Button
          variant="secondary"
          size="sm"
          loading={updating}
          onClick={() => updateStatus(steps[currentIndex + 1].key)}
          style={{ width: '100%' }}
        >
          Advance to {steps[currentIndex + 1].label}
          <ArrowRight size={14} />
        </Button>
      )}
    </Card>
  )
}
