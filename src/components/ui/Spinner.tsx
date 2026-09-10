import React from 'react'
import { cx } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number
  color?: string
  className?: string
  style?: React.CSSProperties
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 36,
}

export function Spinner({ size = 'md', color, className, style }: SpinnerProps) {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size]

  return (
    <span
      className={cx(className)}
      style={{
        display: 'inline-block',
        width: pixelSize,
        height: pixelSize,
        border: '2px solid transparent',
        borderTopColor: color || 'var(--brand-400)',
        borderRightColor: color || 'var(--brand-400)',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
        flexShrink: 0,
        ...style,
      }}
      role="status"
      aria-label="Loading"
    />
  )
}
