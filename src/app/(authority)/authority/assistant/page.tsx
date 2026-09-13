import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AssistantChatContainer } from '@/components/assistant/AssistantChatContainer'
import { Scale, ShieldAlert, FileText, CheckSquare, BookOpen } from 'lucide-react'

export const metadata = {
  title: 'Standards Enforcement Copilot | VeriQO Authority',
  description:
    'Technical AI copilot for BIS standard clause interpretation, mandatory QCO enforcement, sampling protocols, and inspection checklists.',
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

      <div className="responsive-grid-2col">
        {/* Left Column: Interactive Officer Copilot Chat Container */}
        <div>
          <AssistantChatContainer
            mode="authority"
            headerTitle="Standards Enforcement Copilot"
            headerDescription="Technical Officer Consultation for Mandatory QCOs & Clause Checks"
          />
        </div>

        {/* Right Column: Statutory References & Officer Inspection Guidance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Scale size={16} style={{ color: 'var(--color-warning)' }} />
                <CardTitle style={{ fontSize: 'var(--text-sm)' }}>Active Statutory Regimes</CardTitle>
              </div>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 'var(--text-xs)' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Bureau of Indian Standards Act, 2016</div>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Act No. 11 of 2016 · Empowers officers under Sections 16, 17, and 29 for inspection, seizure, and penalty enforcement.
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Quality Control Orders (QCO)</div>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Mandatory orders issued by DPIIT, Ministry of Consumer Affairs, MeitY, and Ministry of Steel.
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Hallmarking of Gold Jewellery Order</div>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Compulsory 3-mark hallmarking across 343+ designated districts under S.O. 50(E).
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckSquare size={16} style={{ color: 'var(--brand-400)' }} />
                <CardTitle style={{ fontSize: 'var(--text-sm)' }}>Officer Checklist Workflow</CardTitle>
              </div>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <strong style={{ color: 'var(--brand-300)' }}>1.</strong>
                <span>Check product label for valid ISI / CRS mark and CM/L or R-number.</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <strong style={{ color: 'var(--brand-300)' }}>2.</strong>
                <span>Verify if commodity falls under mandatory Central QCO enforcement.</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <strong style={{ color: 'var(--brand-300)' }}>3.</strong>
                <span>Draw test lots per standard sampling scale (sealed composite sample).</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <strong style={{ color: 'var(--brand-300)' }}>4.</strong>
                <span>Dispatch to NABL-accredited or BIS-recognized referral laboratory.</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
