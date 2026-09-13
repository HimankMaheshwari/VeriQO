import React from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export default function InspectionDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Skeleton width={180} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={320} height={28} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={120} height={36} borderRadius="var(--radius-md)" />
          <Skeleton width={140} height={36} borderRadius="var(--radius-md)" />
        </div>
      </div>

      {/* Status Bar */}
      <Card>
        <CardBody style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Skeleton width={110} height={24} borderRadius="var(--radius-full)" />
              <Skeleton width={140} height={20} />
            </div>
            <Skeleton width={200} height={28} borderRadius="var(--radius-md)" />
          </div>
        </CardBody>
      </Card>

      {/* 2-Column Responsive Layout Skeleton */}
      <div className="responsive-grid-2col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card>
            <CardBody style={{ padding: 'var(--space-6)' }}>
              <Skeleton width="40%" height={22} style={{ marginBottom: 'var(--space-4)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div>
                  <Skeleton width={80} height={14} style={{ marginBottom: 4 }} />
                  <Skeleton width={140} height={20} />
                </div>
                <div>
                  <Skeleton width={80} height={14} style={{ marginBottom: 4 }} />
                  <Skeleton width={120} height={20} />
                </div>
                <div>
                  <Skeleton width={80} height={14} style={{ marginBottom: 4 }} />
                  <Skeleton width={160} height={20} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody style={{ padding: 'var(--space-6)' }}>
              <Skeleton width="50%" height={22} style={{ marginBottom: 'var(--space-4)' }} />
              <Skeleton width="100%" height={60} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={60} />
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardBody style={{ padding: 'var(--space-5)' }}>
              <Skeleton width="60%" height={20} style={{ marginBottom: 'var(--space-4)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton width="100%" height={32} />
                <Skeleton width="100%" height={32} />
                <Skeleton width="100%" height={32} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
