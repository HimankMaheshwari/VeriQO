'use client'

import React from 'react'
import { type SuggestedPrompt } from '@/types/assistant'
import { Sparkles } from 'lucide-react'

interface SuggestedQuestionsGridProps {
  prompts: SuggestedPrompt[]
  onSelectPrompt: (promptText: string) => void
  title?: string
}

export function SuggestedQuestionsGrid({
  prompts,
  onSelectPrompt,
  title = 'Suggested Inquiries',
}: SuggestedQuestionsGridProps) {
  if (prompts.length === 0) return null

  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-3)',
        }}
      >
        <Sparkles size={13} style={{ color: 'var(--brand-400)' }} />
        <span>{title}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-2)',
        }}
      >
        {prompts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectPrompt(p.prompt)}
            className="hover-card"
            style={{
              padding: 'var(--space-3)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 4,
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand-300)' }}>
                {p.title}
              </span>
              {p.badgeText && (
                <span
                  style={{
                    fontSize: '10px',
                    background: 'var(--bg-elevated)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {p.badgeText}
                </span>
              )}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {p.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
