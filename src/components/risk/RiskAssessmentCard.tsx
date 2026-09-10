import React from 'react'
import { Card } from '@/components/ui/Card'
import { RiskBadge } from './RiskBadge'
import { type RiskAssessment } from '@/lib/risk/types'
import { AlertTriangle, Info, CheckCircle2, Shield } from 'lucide-react'

interface RiskAssessmentCardProps {
  assessment: RiskAssessment
}

export function RiskAssessmentCard({ assessment }: RiskAssessmentCardProps) {
  const { score, level, explanation, factors } = assessment

  // Color selection based on level
  let barColor = '#10b981'
  if (level === 'CRITICAL') barColor = '#ef4444'
  else if (level === 'HIGH') barColor = '#f97316'
  else if (level === 'MEDIUM') barColor = '#f59e0b'

  return (
    <Card>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} style={{ color: 'var(--brand-400)' }} />
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-md)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--text-primary)',
            }}
          >
            Investigative Risk Assessment
          </h3>
        </div>
        <RiskBadge level={level} score={score} size="md" />
      </div>

      {/* Score Progress Meter */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            fontSize: 'var(--text-xs)',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Prioritization Score</span>
          <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {score} / 100
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            backgroundColor: 'var(--bg-base)',
            borderRadius: 'var(--radius-full, 9999px)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, score))}%`,
              height: '100%',
              backgroundColor: barColor,
              borderRadius: 'var(--radius-full, 9999px)',
              transition: 'width 0.4s ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Why this case is prioritized (Explanation) */}
      <div
        style={{
          padding: '12px 14px',
          backgroundColor: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--brand-400)',
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Info size={13} />
          Why this case is prioritized
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {explanation}
        </div>
      </div>

      {/* Contributing Factors */}
      <div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}
        >
          Contributing Factors ({factors.length})
        </div>

        {factors.length === 0 ? (
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              padding: '10px 12px',
              backgroundColor: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            No adverse risk factors recorded for this docket.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {factors.map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ flex: 1, paddingRight: 10 }}>
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {f.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {f.description}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 'var(--font-bold)',
                    color: f.points > 0 ? barColor : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{f.points} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statutory Disclaimer */}
      <div
        style={{
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.4,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
        }}
      >
        <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-muted)' }} />
        <span>
          <strong>Investigative Prioritization Notice:</strong> Risk scores assist authority dispatch and
          monitoring workflows. They do not constitute statutory guilt, override compliance evaluations,
          or replace officer judgment.
        </span>
      </div>
    </Card>
  )
}
