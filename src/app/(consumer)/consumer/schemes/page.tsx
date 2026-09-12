import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Award, ShieldCheck, Globe, CheckCircle2, ArrowRight, FileText, Clock, HelpCircle } from 'lucide-react'

export const metadata = {
  title: 'BIS Certification Schemes | VeriQO PS107',
  description: 'Interactive roadmap for BIS certification schemes: ISI Mark (Scheme I), CRS (Scheme II), FMCS (Scheme X), and Hallmarking.',
}

const SCHEMES = [
  {
    code: 'Scheme I',
    name: 'Product Certification Scheme (ISI Mark)',
    mark: 'ISI Mark',
    badgeVariant: 'success' as const,
    description: 'Third-party conformity assessment scheme providing the iconic ISI Mark for domestic manufacturers across 1,000+ products.',
    statutoryAct: 'BIS Act 2016, Section 13',
    renewalPeriod: '1 or 2 years',
    steps: [
      { step: 1, title: 'Standard Identification', desc: 'Identify relevant Indian Standard (IS) and Quality Control Order applicability.' },
      { step: 2, title: 'In-house Testing Setup', desc: 'Establish plant laboratory and test facilities adhering to the standard Scheme of Inspection and Testing (SIT).' },
      { step: 3, title: 'Online Application & Audit', desc: 'Submit Form-I on the Manakonline portal and host factory audit by BIS technical officers.' },
      { step: 4, title: 'Sample Drawing & Grant', desc: 'Factory and independent laboratory samples verified; License granted (CML Number issued).' },
    ],
  },
  {
    code: 'Scheme II',
    name: 'Compulsory Registration Scheme (CRS)',
    mark: 'Standard Mark',
    badgeVariant: 'info' as const,
    description: 'Self-declaration of conformity based on laboratory testing for IT, electronics, solar, and battery commodities under MeitY orders.',
    statutoryAct: 'BIS (CRS) Order, 2012',
    renewalPeriod: '2 years',
    steps: [
      { step: 1, title: 'Sample Testing in BIS Lab', desc: 'Submit product sample to a BIS-recognized laboratory in India for testing.' },
      { step: 2, title: 'Test Report Generation', desc: 'Obtain compliant test report (valid for 90 days from issuance).' },
      { step: 3, title: 'Portal Submission', desc: 'Apply online with Authorised Indian Representative (AIR) undertaking if foreign.' },
      { step: 4, title: 'Grant of Registration', desc: 'Receive R-Number (Registration Number) and affix Standard Mark.' },
    ],
  },
  {
    code: 'Scheme X',
    name: 'Foreign Manufacturers Certification Scheme (FMCS)',
    mark: 'ISI Mark (Overseas)',
    badgeVariant: 'warning' as const,
    description: 'Licensing foreign manufacturing units exporting goods to India to use the standard ISI mark on compliant products.',
    statutoryAct: 'BIS Act 2016, Regulation 3',
    renewalPeriod: '1 or 2 years',
    steps: [
      { step: 1, title: 'AIR Appointment', desc: 'Nominate an Authorised Indian Representative residing in India.' },
      { step: 2, title: 'Overseas Factory Audit', desc: 'BIS delegation conducts physical on-site audit of the manufacturing facility.' },
      { step: 3, title: 'Independent Testing', desc: 'Witness sample testing during audit; send sealed duplicates to Indian labs.' },
      { step: 4, title: 'License & Performance Bank Guarantee', desc: 'Submit PBG (USD 10,000) and obtain overseas license.' },
    ],
  },
  {
    code: 'Scheme IV',
    name: 'Hallmarking Scheme for Precious Metals',
    mark: 'HUID & Hallmark',
    badgeVariant: 'default' as const,
    description: 'Mandatory purity certification of gold and silver articles to protect consumers from adulteration and under-karatage.',
    statutoryAct: 'Hallmarking of Gold Jewellery Orders',
    renewalPeriod: '5 years',
    steps: [
      { step: 1, title: 'Jeweller Registration', desc: 'Register sales outlet online with BIS (automatic one-time portal registration).' },
      { step: 2, title: 'Assaying & Hallmarking (AHC)', desc: 'Submit jewellery batch to BIS-recognized Assaying and Hallmarking Centre.' },
      { step: 3, title: 'Laser Engraving (HUID)', desc: 'AHC tests fineness (fire assay/XRF) and laser marks 6-digit alphanumeric HUID.' },
      { step: 4, title: 'Consumer Verification', desc: 'Consumers verify authenticity through BIS CARE app or VeriQO Hallmarking Checker.' },
    ],
  },
]

export default function SchemesPage() {
  return (
    <div>
      <PageHeader
        title="BIS Certification Schemes & Licensing Procedures"
        description="Comprehensive guides, procedural workflows, documentation requirements, and timelines for obtaining Bureau of Indian Standards (BIS) licenses."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'Certification Schemes' },
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        {SCHEMES.map((scheme) => (
          <Card key={scheme.code} style={{ border: '1px solid var(--border-default)' }}>
            <CardHeader style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <Badge variant={scheme.badgeVariant}>{scheme.code}</Badge>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--brand-400)', fontWeight: 600 }}>
                      Mark: {scheme.mark}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Legal Basis: {scheme.statutoryAct}
                    </span>
                  </div>
                  <CardTitle style={{ fontSize: 'var(--text-lg)' }}>{scheme.name}</CardTitle>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>License Renewal:</span>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{scheme.renewalPeriod}</div>
                </div>
              </div>
            </CardHeader>

            <CardBody style={{ padding: 'var(--space-6)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
                {scheme.description}
              </p>

              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', letterSpacing: '0.05em' }}>
                Procedural Roadmap &amp; Milestones
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
                {scheme.steps.map((st) => (
                  <div
                    key={st.step}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'var(--brand-600)',
                          color: 'white',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {st.step}
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {st.title}
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                      {st.desc}
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
