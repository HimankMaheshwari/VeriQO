'use client'

import React, { useState } from 'react'
import { type AssistantEvidence } from '@/types/assistant'
import { Sparkles, ChevronDown, ChevronUp, Layers, CheckCircle2, Info } from 'lucide-react'

interface WhyThisAnswerAccordionProps {
  evidence: AssistantEvidence
}

export function WhyThisAnswerAccordion({ evidence }: WhyThisAnswerAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      style={{
        background: 'rgba(59, 130, 246, 0.04)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        marginTop: 'var(--space-3)',
      }}
    >
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-2) var(--space-3)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--brand-300)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          textAlign: 'left',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} style={{ color: 'var(--brand-400)' }} />
          <span>Why this answer?</span>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 400,
            }}
          >
            Advisory Evidence Summary
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <span>{isExpanded ? 'Hide reasoning' : 'Show reasoning'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expandable Reasoning Body */}
      {isExpanded && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            lineHeight: 1.5,
          }}
        >
          {/* Matched Product Description */}
          {evidence.matchedProductDescription && (
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
                Matched Product Scope:
              </strong>
              <span>{evidence.matchedProductDescription}</span>
            </div>
          )}

          {/* Relevant Keywords */}
          {evidence.relevantKeywords.length > 0 && (
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                Relevant Regulatory Keywords:
              </strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {evidence.relevantKeywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--brand-300)',
                      fontSize: '11px',
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Context Considered */}
          <div>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
              Regulatory Context Considered:
            </strong>
            <span>{evidence.contextConsidered}</span>
          </div>

          {/* Statutory Advisory Callout */}
          <div
            style={{
              padding: 'var(--space-2) var(--space-3)',
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Info size={13} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
            <span>
              Advisory Demonstration: Derived from indexed Bureau of Indian Standards (BIS) specifications. Official certification mandates should be verified against published Gazette notifications.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
