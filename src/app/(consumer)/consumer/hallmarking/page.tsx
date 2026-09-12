import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Gem, ShieldCheck, CheckCircle2, AlertTriangle, Search, Info, HelpCircle } from 'lucide-react'

export const metadata = {
  title: 'Hallmarking & HUID Verification | VeriQO PS107',
  description: 'Understand mandatory gold and silver hallmarking signs, 6-digit HUID verification, and purity testing standards in India.',
}

const PURITY_GRADES = [
  { karat: '24 Karat', fineness: '999', standard: 'IS 1417', description: '99.9% Pure Gold (bars & coins)' },
  { karat: '22 Karat', fineness: '916', standard: 'IS 1417', description: '91.6% Pure Gold (standard bridal jewellery)' },
  { karat: '20 Karat', fineness: '833', standard: 'IS 1417', description: '83.3% Pure Gold' },
  { karat: '18 Karat', fineness: '750', standard: 'IS 1417', description: '75.0% Pure Gold (diamond & gemstone studded)' },
  { karat: '14 Karat', fineness: '585', standard: 'IS 1417', description: '58.5% Pure Gold (daily wear jewellery)' },
  { karat: 'Fine Silver', fineness: '999', standard: 'IS 2112', description: '99.9% Pure Silver (medallions & coins)' },
  { karat: 'Sterling Silver', fineness: '925', standard: 'IS 2112', description: '92.5% Pure Silver (silver jewellery & utensils)' },
]

export default function HallmarkingPage() {
  return (
    <div>
      <PageHeader
        title="Gold & Silver Hallmarking (HUID) Verification"
        description="Comprehensive guide to verifying mandatory hallmarking symbols, purity karats, and 6-digit alphanumeric HUID numbers under BIS standards IS 1417 and IS 2112."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'Hallmarking & HUID' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="warning">Mandatory in India</Badge>
            <Badge variant="success">IS 1417 / IS 2112</Badge>
          </div>
        }
      />

      {/* 3 Hallmark Symbols Breakdown */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          The 3 Mandatory Hallmarking Signs on Gold Jewellery
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          <Card>
            <CardBody style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 'var(--radius-xl)',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--brand-400)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-4)',
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <Badge variant="info">Sign 1</Badge>
              </div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 4 }}>BIS Standard Logo</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                A triangular mark indicating that the jewellery has been certified and audited by the Bureau of Indian Standards.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 'var(--radius-xl)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-4)',
                }}
              >
                <Gem size={28} />
              </div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <Badge variant="warning">Sign 2</Badge>
              </div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 4 }}>Purity &amp; Fineness Mark</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Indicates gold purity grade: <strong>22K916</strong> (91.6% pure), <strong>18K750</strong> (75% pure), or <strong>14K585</strong> (58.5% pure).
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 'var(--radius-xl)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-4)',
                }}
              >
                <CheckCircle2 size={28} />
              </div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <Badge variant="success">Sign 3</Badge>
              </div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 4 }}>6-Digit HUID Code</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                A laser-engraved 6-digit alphanumeric unique identifier (e.g. <code>AB1234</code>) giving individual piece traceability to the assaying center.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* HUID Verification Checker Shell */}
      <Card style={{ marginBottom: 'var(--space-8)' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} color="var(--brand-400)" />
            HUID Format Validation &amp; Purity Lookup
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'flex', gap: 'var(--space-3)', maxWidth: 540 }}>
            <input
              type="text"
              placeholder="Enter 6-digit HUID code (e.g. A3F89K)..."
              maxLength={6}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                fontSize: 'var(--text-sm)',
                outline: 'none',
              }}
            />
            <Button variant="primary">Verify HUID</Button>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
            Validation adheres strictly to Bureau of Indian Standards HUID registry format (6 alphanumeric characters, laser engraved by accredited AHC).
          </p>
        </CardBody>
      </Card>

      {/* Purity Karat Reference Table */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
          Statutory Fineness &amp; Karat Standards (IS 1417 &amp; IS 2112)
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                <th style={{ padding: '12px 16px' }}>Karat Grade</th>
                <th style={{ padding: '12px 16px' }}>Fineness Value</th>
                <th style={{ padding: '12px 16px' }}>Standard Code</th>
                <th style={{ padding: '12px 16px' }}>Commercial Application</th>
              </tr>
            </thead>
            <tbody>
              {PURITY_GRADES.map((row) => (
                <tr key={row.karat} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.karat}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--brand-400)' }}>{row.fineness}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{row.standard}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
