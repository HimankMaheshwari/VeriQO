import React from 'react'
import { JourneyCardSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function JourneyLoading() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Skeleton width="45%" height={32} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={18} />
      </div>

      <JourneyCardSkeleton stepNumber="PROD" />
      <JourneyCardSkeleton stepNumber="01" />
      <JourneyCardSkeleton stepNumber="02" />
      <JourneyCardSkeleton stepNumber="03" />
    </div>
  )
}
