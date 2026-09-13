'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge, QcoRegimeBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type StandardDiscoveryItem } from '@/types/standards'
import {
  Sparkles,
  ArrowRight,
  Bot,
  FlaskConical,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ScanLine,
  Layers,
} from 'lucide-react'

interface StandardCardProps {
  standard: StandardDiscoveryItem
  onViewDetails: (standard: StandardDiscoveryItem) => void
  showReasoningInitially?: boolean
}

export function StandardCard({
  standard,
  onViewDetails,
  showReasoningInitially = false,
}: StandardCardProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(showReasoningInitially)

  // Determine badge variant for match level
  const matchVariant =
    standard.matchLevel === 'HIGH'
      ? 'success'
      : standard.matchLevel === 'MEDIUM'
      ? 'warning'
      : 'default'

  const assistantUrl = `/consumer/assistant?standard=${encodeURIComponent(
    standard.standardNumber
  )}&topic=${encodeURIComponent(standard.title)}`

  return (
    <Card className="hover-card" style={{ transition: 'all var(--transition-normal)' }}>
      <CardBody style={{ padding: 'var(--space-6)' }}>
        {/* Card Header Row: Code, Year, Match, QCO */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-bold)',
                color: 'var(--brand-400)',
                letterSpacing: '0.02em',
              }}
            >
              {standard.standardNumber}
            </span>

            <QcoRegimeBadge
              isMandatory={standard.isMandatoryQco}
              label={standard.isMandatoryQco ? 'Mandatory QCO' : 'Voluntary Standard'}
            />

            <Badge variant={matchVariant}>
              {standard.matchLevel} MATCH ({standard.matchScore}%)
            </Badge>

            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {standard.category}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Revision: <strong>{standard.year}</strong>
            </span>
          </div>
        </div>

        {/* Standard Title */}
        <h3
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
            lineHeight: 1.4,
          }}
        >
          {standard.title}
        </h3>

        {/* Short Scope / Description */}
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-4)',
            lineHeight: 1.5,
          }}
        >
          {standard.shortDescription}
        </p>

        {/* Applicable Commodities Chips */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginRight: 4,
              }}
            >
              Applicable For:
            </span>
            {standard.applicableCommodities.map((comm) => (
              <span
                key={comm}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {comm}
              </span>
            ))}
          </div>
        </div>

        {/* Advisory Match Reasoning Section */}
        {standard.reasoning && (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div
              onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} style={{ color: 'var(--brand-400)' }} />
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--brand-300)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Why this standard may be relevant
                </span>
                {standard.reasoning.matchedKeywords.length > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      background: 'var(--bg-elevated)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {standard.reasoning.matchedKeywords.length} matched keywords
                  </span>
                )}
              </div>
              <button
                type="button"
                aria-label={isReasoningExpanded ? 'Collapse reasoning' : 'Expand reasoning'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {isReasoningExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {isReasoningExpanded && (
              <div
                style={{
                  marginTop: 'var(--space-2)',
                  paddingTop: 'var(--space-2)',
                  borderTop: '1px dashed var(--border-subtle)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: '0 0 var(--space-2) 0' }}>{standard.reasoning.summary}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
                  {standard.reasoning.matchedKeywords.length > 0 && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Matched Tokens: </strong>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-300)' }}>
                        {standard.reasoning.matchedKeywords.join(', ')}
                      </span>
                    </div>
                  )}
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Regulatory Mandate: </strong>
                    <span>{standard.reasoning.regulatoryStatusNote}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card Footer: Metadata & Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Left Metadata info */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}
            >
              <FlaskConical size={14} style={{ color: 'var(--color-info)' }} />
              <span>
                Accredited Labs: <strong style={{ color: 'var(--text-primary)' }}>{standard.accreditedLabCount}</strong>
              </span>
            </div>

            {standard.qcoNotificationNumber && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-warning)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <ShieldCheck size={14} />
                <span>QCO: {standard.qcoNotificationNumber}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Link href="/consumer/scan" style={{ textDecoration: 'none' }}>
              <Button
                variant="secondary"
                size="sm"
                title="Verify packaging declarations under Legal Metrology Rules, 2011"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ScanLine size={14} /> Verify Label
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails(standard)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FileText size={14} /> View Details
            </Button>

            <Link href={`/consumer/journey?standard=${encodeURIComponent(standard.standardNumber)}`} style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                size="sm"
                title="Trace end-to-end BIS Compliance Journey for this standard"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Layers size={14} /> Journey &rarr;
              </Button>
            </Link>

            <Link href={assistantUrl}>
              <Button
                variant="secondary"
                size="sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Bot size={14} /> Ask Assistant
              </Button>
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
