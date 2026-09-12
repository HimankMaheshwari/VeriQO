import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { STARTER_PROMPTS, SUPPORTED_LANGUAGES } from '@/types/assistant'
import {
  Sparkles,
  Send,
  Mic,
  BookOpen,
  Award,
  FlaskConical,
  Gem,
  Info,
  Globe,
  Bot,
  CheckCircle2,
} from 'lucide-react'

export const metadata = {
  title: 'AI Standards Assistant | VeriQO PS107',
  description: 'AI conversational assistant for Indian Standards, BIS certification schemes, testing requirements, and hallmarking.',
}

export default function AssistantPage() {
  return (
    <div>
      <PageHeader
        title="AI Standards & Regulations Assistant"
        description="Source-backed conversational guidance for Indian Standards, BIS certification schemes, testing parameters, and hallmarking (SIH PS107)."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'AI Standards Assistant' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="info" dot>SIH PS107 Active</Badge>
            <Badge variant="success">Source-Backed</Badge>
          </div>
        }
      />

      {/* Intelligence & Source-Backing Guidance Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 'var(--space-4)',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
        }}
      >
        <Sparkles size={20} style={{ color: 'var(--brand-400)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>AI Regulatory Intelligence:</strong> Ask queries regarding Indian Standards (IS codes),
          applicable specifications based on product descriptions, BIS certification procedures (ISI Mark Scheme I, CRS Scheme II, FMCS),
          NABL/BIS laboratory testing, or gold/silver hallmarking (HUID). All responses cite official BIS gazettes and clauses.
        </div>
      </div>

      {/* Main Assistant Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Chat Stream Shell */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}>
            <CardHeader style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, var(--brand-600), var(--brand-800))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bot size={16} color="white" />
                  </div>
                  <CardTitle style={{ fontSize: 'var(--text-base)' }}>Conversational Consultation</CardTitle>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <Globe size={14} />
                  <span>Multilingual Support ({SUPPORTED_LANGUAGES.length} Languages)</span>
                </div>
              </div>
            </CardHeader>

            {/* Message Stream Area */}
            <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-6)' }}>
              {/* Initial Assistant Welcome */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-900)',
                    border: '1px solid var(--brand-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={20} style={{ color: 'var(--brand-400)' }} />
                </div>
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                    maxWidth: '85%',
                  }}
                >
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--brand-300)', marginBottom: 4 }}>
                    VeriQO Standards Assistant
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
                    Namaste! I am your AI assistant for <strong>Indian Standards</strong> and <strong>Bureau of Indian Standards (BIS) regulations</strong>.
                    You can ask me questions about applicable standards for your product, certification procedures, testing laboratories, or hallmarking guidelines.
                  </p>
                </div>
              </div>

              {/* Starter Topics Grid */}
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Frequently Asked Regulatory Inquiries
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-3)' }}>
                  {STARTER_PROMPTS.map((item) => (
                    <div
                      key={item.id}
                      className="hover-card"
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand-400)' }}>
                          {item.title}
                        </span>
                        {item.badgeText && (
                          <span style={{ fontSize: '10px', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
                            {item.badgeText}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        {item.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input Bar Shell */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <input
                  type="text"
                  placeholder="Ask any question regarding Indian Standards, BIS schemes, or testing requirements..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    padding: '8px 12px',
                  }}
                />
                <button
                  type="button"
                  title="Voice Input (Speech to Text)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: 8,
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                  }}
                >
                  <Mic size={18} />
                </button>
                <Button variant="primary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Send size={14} /> Ask
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: PS107 Knowledge Quick Index */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 'var(--text-sm)' }}>Regulatory Scope Covered</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { icon: <BookOpen size={16} color="var(--brand-400)" />, title: 'Indian Standards (IS)', desc: '20,000+ standards, QCO orders & mandatory marks' },
                { icon: <Award size={16} color="var(--color-warning)" />, title: 'Certification Schemes', desc: 'ISI Mark (Scheme I), CRS (Scheme II), FMCS (Scheme X)' },
                { icon: <FlaskConical size={16} color="var(--color-info)" />, title: 'Testing Laboratories', desc: 'BIS central, regional & NABL accredited testing facilities' },
                { icon: <Gem size={16} color="var(--color-success)" />, title: 'Hallmarking & HUID', desc: 'IS 1417 (Gold), IS 2112 (Silver), 6-digit HUID verification' },
              ].map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 2 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 'var(--text-sm)' }}>Supported Indian Languages</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <span
                    key={lang.code}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-full)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {lang.name} ({lang.nativeName})
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
