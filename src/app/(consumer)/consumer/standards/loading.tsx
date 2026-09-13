import React from 'react'
import { StandardCardSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function StandardsLoading() {
  return (
    <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Skeleton width="40%" height={32} style={{ marginBottom: 8 }} />
        <Skeleton width="65%" height={18} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 140px', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Skeleton height={42} borderRadius="var(--radius-md)" />
        <Skeleton height={42} borderRadius="var(--radius-md)" />
        <Skeleton height={42} borderRadius="var(--radius-md)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <StandardCardSkeleton />
        <StandardCardSkeleton />
        <StandardCardSkeleton />
      </div>
    </div>
  )
}
