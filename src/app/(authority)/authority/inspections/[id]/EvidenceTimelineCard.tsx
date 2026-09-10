'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  Clock,
  Filter,
  Camera,
  FileText,
  Scale,
  Globe,
  PenTool,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { EvidenceTimelineItem, TimelineProvenance } from '@/lib/inspections/types'

interface EvidenceTimelineCardProps {
  inspectionId: string
  initialItems?: EvidenceTimelineItem[]
  onSelectFinding?: (checkId: string) => void
}

const PROVENANCE_LABELS: Record<TimelineProvenance, { label: string; icon: any; color: string }> = {
  PHYSICAL_SCAN: { label: 'Packaging Scan', icon: Camera, color: '#38bdf8' },
  AUTOMATED_EXTRACTION: { label: 'OCR Extraction', icon: FileText, color: '#a855f7' },
  DETERMINISTIC_EVALUATION: { label: 'Statutory Rule', icon: Scale, color: '#6366f1' },
  ONLINE_ACQUISITION: { label: 'E-Commerce', icon: Globe, color: '#f59e0b' },
  OFFICER_ENTRY: { label: 'Officer Note', icon: PenTool, color: '#10b981' },
  OFFICER_DECISION: { label: 'Official Verdict', icon: CheckCircle, color: '#22c55e' },
}

export function EvidenceTimelineCard({
  inspectionId,
  initialItems,
  onSelectFinding,
}: EvidenceTimelineCardProps) {
  const [items, setItems] = useState<EvidenceTimelineItem[]>(initialItems || [])
  const [loading, setLoading] = useState(!initialItems)
  const [activeFilter, setActiveFilter] = useState<string>('ALL')

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems)
      setLoading(false)
      return
    }

    let isMounted = true
    async function fetchTimeline() {
      try {
        const res = await fetch(`/api/v1/inspections/${inspectionId}/timeline`)
        const data = await res.json()
        if (res.ok && isMounted) {
          setItems(data.data || [])
        }
      } catch (err) {
        console.error('Error loading timeline:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchTimeline()
    return () => {
      isMounted = false
    }
  }, [inspectionId, initialItems])

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'ALL') return true
    return item.provenance === activeFilter
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} style={{ color: 'var(--brand-400)' }} />
          Immutable Evidence Timeline ({items.length})
        </CardTitle>
      </CardHeader>

      {/* Filter Chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '0 var(--space-4) var(--space-3)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setActiveFilter('ALL')}
          style={{
            fontSize: 'var(--text-xs)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: activeFilter === 'ALL' ? 'var(--brand-500)' : 'var(--bg-base)',
            color: activeFilter === 'ALL' ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: activeFilter === 'ALL' ? 'bold' : 'normal',
          }}
        >
          All ({items.length})
        </button>
        {Object.entries(PROVENANCE_LABELS).map(([prov, meta]) => {
          const count = items.filter((i) => i.provenance === prov).length
          if (count === 0) return null
          const isActive = activeFilter === prov
          return (
            <button
              key={prov}
              onClick={() => setActiveFilter(prov)}
              style={{
                fontSize: 'var(--text-xs)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: isActive ? meta.color : 'var(--bg-base)',
                color: isActive ? '#000000' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: isActive ? 'bold' : 'normal',
              }}
            >
              {meta.label} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <Spinner size="md" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
          No evidence records found for selected filter.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            maxHeight: 520,
            overflowY: 'auto',
          }}
        >
          {filteredItems.map((item) => {
            const meta = PROVENANCE_LABELS[item.provenance]
            const Icon = meta?.icon || Clock

            return (
              <div
                key={item.id}
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  borderLeft: `3px solid ${meta?.color || 'var(--border-default)'}`,
                }}
              >
                {/* Header line */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={14} style={{ color: meta?.color || 'var(--text-muted)' }} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {meta?.label}
                    </span>
                  </div>
                  <Badge variant={item.badgeVariant as any}>{item.badgeText}</Badge>
                </div>

                {/* Title */}
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  {item.title}
                </div>

                {/* Description */}
                {item.description && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {item.description}
                  </div>
                )}

                {/* Timestamp & action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 4, borderTop: '1px dashed var(--border-subtle)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>{formatDateTime(item.timestamp)}</span>
                  {item.linkId && item.type === 'COMPLIANCE_CHECK' && onSelectFinding && (
                    <button
                      onClick={() => onSelectFinding(item.linkId!)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--brand-400)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        fontWeight: 'bold',
                        fontSize: '10px',
                      }}
                    >
                      Trace Chain <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
