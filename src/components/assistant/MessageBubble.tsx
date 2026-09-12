'use client'

import React from 'react'
import { type AssistantMessage } from '@/types/assistant'
import { SourceEvidenceCard } from '@/components/assistant/SourceEvidenceCard'
import { WhyThisAnswerAccordion } from '@/components/assistant/WhyThisAnswerAccordion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Bot, User, AlertCircle, RotateCcw, Clock } from 'lucide-react'

interface MessageBubbleProps {
  message: AssistantMessage
  onRetry?: (message: AssistantMessage) => void
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 'var(--radius-full)',
          background: isUser
            ? 'var(--brand-700)'
            : 'linear-gradient(135deg, var(--brand-900), var(--brand-950))',
          border: `1px solid ${isUser ? 'var(--brand-500)' : 'var(--brand-400)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--neutral-0)',
          flexShrink: 0,
        }}
      >
        {isUser ? <User size={16} /> : <Bot size={18} style={{ color: 'var(--brand-400)' }} />}
      </div>

      {/* Bubble Container */}
      <div
        style={{
          maxWidth: '85%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Name and Timestamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ fontWeight: 600, color: isUser ? 'var(--text-primary)' : 'var(--brand-300)' }}>
            {isUser ? 'You' : 'VeriQO BIS Assistant'}
          </span>
          <span>•</span>
          <span>{message.timestamp}</span>
        </div>

        {/* Bubble Body */}
        <div
          style={{
            background: isUser ? 'var(--brand-900)' : 'var(--bg-elevated)',
            border: `1px solid ${isUser ? 'var(--brand-700)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1.6,
            boxShadow: 'var(--shadow-sm)',
            width: '100%',
          }}
        >
          {/* Main Text Content */}
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </div>

          {/* Structured Evidence & Sources (for Assistant responses) */}
          {message.evidence && message.evidence.sources.length > 0 && (
            <div
              style={{
                marginTop: 'var(--space-4)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Official Regulatory Citations & Specifications ({message.evidence.sources.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {message.evidence.sources.map((src) => (
                  <SourceEvidenceCard key={src.id} source={src} />
                ))}
              </div>
            </div>
          )}

          {/* "Why this answer?" Expandable Section */}
          {message.evidence && (
            <WhyThisAnswerAccordion evidence={message.evidence} />
          )}

          {/* Error State with Retry Button */}
          {message.status === 'error' && (
            <div
              style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-error-dark)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} />
                <span>{message.errorMessage || 'Failed to receive response from service.'}</span>
              </div>
              {onRetry && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRetry(message)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, fontSize: '11px' }}
                >
                  <RotateCcw size={12} /> Retry
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
