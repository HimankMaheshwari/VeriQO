import React from 'react'
import { type RiskLevel } from '@/lib/risk/types'
import { AlertOctagon, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'

interface RiskBadgeProps {
  level: RiskLevel
  score?: number
  size?: 'sm' | 'md'
  showIcon?: boolean
}

export function RiskBadge({
  level,
  score,
  size = 'sm',
  showIcon = true,
}: RiskBadgeProps) {
  let color = '#10b981'
  let bg = 'rgba(16, 185, 129, 0.12)'
  let border = 'rgba(16, 185, 129, 0.28)'
  let Icon = ShieldCheck

  switch (level) {
    case 'CRITICAL':
      color = '#ef4444'
      bg = 'rgba(239, 68, 68, 0.12)'
      border = 'rgba(239, 68, 68, 0.32)'
      Icon = AlertOctagon
      break
    case 'HIGH':
      color = '#f97316'
      bg = 'rgba(249, 115, 22, 0.12)'
      border = 'rgba(249, 115, 22, 0.32)'
      Icon = AlertTriangle
      break
    case 'MEDIUM':
      color = '#f59e0b'
      bg = 'rgba(245, 158, 11, 0.12)'
      border = 'rgba(245, 158, 11, 0.32)'
      Icon = ShieldAlert
      break
    case 'LOW':
    default:
      color = '#10b981'
      bg = 'rgba(16, 185, 129, 0.12)'
      border = 'rgba(16, 185, 129, 0.28)'
      Icon = ShieldCheck
      break
  }

  const padding = size === 'sm' ? '2px 8px' : '4px 10px'
  const fontSize = size === 'sm' ? '11px' : '12px'
  const iconSize = size === 'sm' ? 12 : 14

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
      title={`Investigative Risk: ${level}${score !== undefined ? ` (${score}/100)` : ''}`}
    >
      {showIcon && <Icon size={iconSize} />}
      <span>{level} RISK</span>
      {score !== undefined && (
        <span
          style={{
            opacity: 0.85,
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            paddingLeft: 2,
          }}
        >
          {score}
        </span>
      )}
    </span>
  )
}
