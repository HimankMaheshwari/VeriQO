import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { InspectionStatusBadge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'
import { Calendar, User, Package } from 'lucide-react'

interface InspectionCardProps {
  id: string
  title?: string | null
  status: 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'CLOSED'
  officerName?: string
  productName?: string | null
  createdAt: Date | string
}

export function InspectionCard({
  id,
  title,
  status,
  officerName,
  productName,
  createdAt,
}: InspectionCardProps) {
  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        <Link
          href={`/authority/inspections/${id}`}
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--text-primary)',
            textDecoration: 'none',
          }}
        >
          {title || 'Inspection Case'}
        </Link>
        <InspectionStatusBadge status={status} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        {productName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={14} style={{ color: 'var(--brand-400)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{productName}</span>
          </div>
        )}
        {officerName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} />
            <span>Officer: {officerName}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} />
          <span>{formatDateTime(createdAt)}</span>
        </div>
      </div>
    </Card>
  )
}
