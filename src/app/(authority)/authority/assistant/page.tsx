import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Bot, Sparkles, Send, ShieldAlert, Scale, ClipboardCheck, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Standards Enforcement Copilot | VeriQO Authority',
  description: 'Authority technical assistant for BIS standard clause interpretation, mandatory QCO enforcement, and inspection checklists.',
}

export default function AuthorityAssistantPage() {
  return (
    <div>
      <PageHeader
        title="Standards Enforcement Copilot"
        description="Technical AI copilot for Legal Metrology & BIS enforcement officers to verify mandatory Quality Control Orders (QCOs), interpret standard clauses, and generate inspection checklists."
        breadcrumbs={[
          { label: 'Authority', href: '/authority/dashboard' },
          { label: 'Standards Copilot' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="error">Officer Technical Mode</Badge>
            <Badge variant="info">BIS Act 2016 Citations</Badge>
          </div>
        }
      />

      {/* Advisory Safeguard Notice */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: 'var(--space-4)',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-warning-dark)',
          lineHeight: 1.5,
        }}
      >
        <ShieldAlert size={20} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Statutory Officer Safeguard:</strong> The Standards Copilot provides clause references and technical explanations.
          All formal regulatory decisions, search warrants, compound notices, and inspection reports remain subject to authorized officer review under the BIS Act, 2016 and Legal Metrology Act, 2009.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* Chat / Copilot Shell */}
        <Card style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}>
          <CardHeader style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--brand-700), var(--brand-900))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Scale size={16} color="white" />
              </div>
              <CardTitle style={{ fontSize: 'var(--text-base)' }}>Technical Regulatory Consultation</CardTitle>
            </div>
          </CardHeader>

          <CardBody style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-6)' }}>
            {/* Welcome message */}
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
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--brand-300)', marginBottom: 4 }}>
                  Officer Technical Copilot
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
                  Welcome Officer. Query any technical parameter, mandatory Quality Control Order (QCO) gazette date, sampling methodology, or testing laboratory recognition for commodities under inspection.
                </p>
              </div>
            </div>

            {/* Officer Quick Checklists */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', fontWeight: 600, textTransform: 'uppercase' }}>
                Officer Technical Actions
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
                {[
                  { title: 'Check Mandatory QCO Status', query: 'Is this commodity under a mandatory Quality Control Order (QCO) requiring mandatory ISI mark?' },
                  { title: 'Standard Sampling Procedure', query: 'What is the statutory lot size and sampling protocol specified under the relevant IS standard?' },
                  { title: 'Testing Tolerance Thresholds', query: 'What are the permissible technical deviations and tolerances before an item is declared non-compliant?' },
                  { title: 'Draft Statutory Seizure Notice', query: 'Generate standard reference points for a notice under Section 16/17 of the BIS Act 2016.' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="hover-card"
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--brand-400)', marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      {item.query}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Query Input */}
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
                placeholder="Ask technical regulatory query (e.g. Mandatory QCO notification date for footwear)..."
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
              <Button variant="primary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Send size={14} /> Consult
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Right Column: Statutory Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 'var(--text-sm)' }}>Active Statutory Orders</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 'var(--text-xs)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Bureau of Indian Standards Act, 2016</div>
                <div style={{ color: 'var(--text-muted)' }}>Act No. 11 of 2016 · Conformity Assessment Regulations</div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Quality Control Orders (QCO)</div>
                <div style={{ color: 'var(--text-muted)' }}>Orders issued by DPIIT, Ministry of Consumer Affairs, MeitY</div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Hallmarking of Gold Jewellery Order</div>
                <div style={{ color: 'var(--text-muted)' }}>Mandatory hallmarking across 343+ notified districts</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
