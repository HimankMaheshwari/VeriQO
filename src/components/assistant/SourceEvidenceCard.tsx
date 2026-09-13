'use client'

import React from 'react'
import { type AssistantSource } from '@/types/assistant'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, ExternalLink, ShieldCheck } from 'lucide-react'

interface SourceEvidenceCardProps {
  source: AssistantSource
}

export function SourceEvidenceCard({ source }: SourceEvidenceCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        fontSize: 'var(--text-xs)',
      }}
    >
      {/* Header Row: Standard Code, Clause, QCO badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--brand-400)' }}>
            <BookOpen size={14} />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {source.standardNumber}
            </span>
          </div>

          <span
            style={{
              color: 'var(--brand-300)',
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {source.clauseReference}
          </span>

          {source.isMandatoryQco && (
            <Badge variant="policy" dot>Mandatory QCO</Badge>
          )}
        </div>

        {source.relevanceScore && (
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
            {source.relevanceScore}% Source Match
          </span>
        )}
      </div>

      {/* Document Title */}
      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
        {source.documentTitle}
      </div>

      {/* Verbatim Excerpt */}
      <div
        style={{
          color: 'var(--text-secondary)',
          background: 'var(--bg-input)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          borderLeft: '3px solid var(--brand-500)',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        &ldquo;{source.excerpt}&rdquo;
      </div>

      {/* Footer Link */}
      {source.sourceUrl && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text-link)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
            }}
          >
            View official BIS reference <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  )
}
