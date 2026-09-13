import React from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { cx } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({
  width,
  height,
  borderRadius = 'var(--radius-md)',
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cx('skeleton', className)}
      style={{
        width: width ?? '100%',
        height: height ?? '1rem',
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

/**
 * StandardCardSkeleton
 * Matches the exact height and layout of StandardCard to prevent layout jumping
 */
export function StandardCardSkeleton() {
  return (
    <Card style={{ border: '1px solid var(--border-subtle)', marginBottom: 'var(--space-4)' }}>
      <CardBody style={{ padding: 'var(--space-6)' }}>
        {/* Header Row: Standard Code + Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skeleton width={110} height={24} borderRadius="var(--radius-sm)" />
            <Skeleton width={90} height={20} borderRadius="var(--radius-full)" />
            <Skeleton width={110} height={20} borderRadius="var(--radius-full)" />
          </div>
          <Skeleton width={70} height={16} />
        </div>

        {/* Title */}
        <Skeleton width="75%" height={22} style={{ marginBottom: 'var(--space-2)' }} />

        {/* Description */}
        <Skeleton width="100%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="88%" height={16} style={{ marginBottom: 'var(--space-4)' }} />

        {/* Commodity Chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-4)' }}>
          <Skeleton width={80} height={20} borderRadius="var(--radius-sm)" />
          <Skeleton width={95} height={20} borderRadius="var(--radius-sm)" />
          <Skeleton width={70} height={20} borderRadius="var(--radius-sm)" />
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          <Skeleton width={130} height={28} borderRadius="var(--radius-md)" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton width={110} height={28} borderRadius="var(--radius-md)" />
            <Skeleton width={100} height={28} borderRadius="var(--radius-md)" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * JourneyCardSkeleton
 * Wireframe for end-to-end journey steps
 */
export function JourneyCardSkeleton({ stepNumber }: { stepNumber?: string }) {
  return (
    <Card style={{ border: '1px solid var(--border-subtle)', marginBottom: 'var(--space-6)' }}>
      <CardBody style={{ padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}
            >
              {stepNumber || '••'}
            </div>
            <Skeleton width={180} height={20} />
          </div>
          <Skeleton width={100} height={22} borderRadius="var(--radius-full)" />
        </div>
        <Skeleton width="100%" height={80} borderRadius="var(--radius-lg)" />
      </CardBody>
    </Card>
  )
}
