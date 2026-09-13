import React from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export default function VerifyLoading() {
  return (
    <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Skeleton width="40%" height={32} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={18} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-6)' }}>
        <Skeleton width={140} height={38} borderRadius="var(--radius-md)" />
        <Skeleton width={160} height={38} borderRadius="var(--radius-md)" />
        <Skeleton width={120} height={38} borderRadius="var(--radius-md)" />
        <Skeleton width={160} height={38} borderRadius="var(--radius-md)" />
      </div>

      <Card>
        <CardBody style={{ padding: 'var(--space-6)' }}>
          <Skeleton width="50%" height={24} style={{ marginBottom: 'var(--space-4)' }} />
          <Skeleton width="80%" height={16} style={{ marginBottom: 'var(--space-6)' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', maxWidth: 720, marginBottom: 'var(--space-4)' }}>
            <Skeleton height={42} borderRadius="var(--radius-md)" />
            <Skeleton height={42} borderRadius="var(--radius-md)" />
            <Skeleton height={42} borderRadius="var(--radius-md)" />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-4)' }}>
            <Skeleton width={90} height={20} borderRadius="var(--radius-sm)" />
            <Skeleton width={130} height={20} borderRadius="var(--radius-sm)" />
            <Skeleton width={140} height={20} borderRadius="var(--radius-sm)" />
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
