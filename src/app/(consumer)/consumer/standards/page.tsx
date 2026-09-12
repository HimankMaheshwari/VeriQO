import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { STANDARDS_CATEGORIES, type IndianStandardSummary } from '@/types/standards'
import { Search, Filter, BookOpen, AlertTriangle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react'

export const metadata = {
  title: 'Indian Standards Directory | VeriQO PS107',
  description: 'Search and browse Indian Standards (IS codes), mandatory Quality Control Orders (QCOs), and specifications.',
}

const SAMPLE_STANDARDS: IndianStandardSummary[] = [
  {
    id: 'is-1',
    standardNumber: 'IS 14543:2016',
    title: 'Packaged Drinking Water (Other than Packaged Natural Mineral Water) — Specification',
    year: 2016,
    category: 'Food & Agriculture',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 3932(E)',
    status: 'ACTIVE',
    applicableCommodities: ['Bottled drinking water', 'Packaged water jars', 'Mineral water containers'],
    labCount: 48,
  },
  {
    id: 'is-2',
    standardNumber: 'IS 1061:1997',
    title: 'Disinfectant Fluids, Phenolic Type — Specification',
    year: 1997,
    category: 'Chemicals & Plastics',
    isMandatoryQco: false,
    status: 'ACTIVE',
    applicableCommodities: ['Household disinfectants', 'Floor cleaners', 'Phenolic concentrates'],
    labCount: 16,
  },
  {
    id: 'is-3',
    standardNumber: 'IS 16102 (Part 1):2012',
    title: 'Self-Ballasted LED Lamps for General Lighting Services — Safety Requirements',
    year: 2012,
    category: 'Electronics & IT',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 2357(E)',
    status: 'ACTIVE',
    applicableCommodities: ['LED bulbs', 'B22 LED lamps', 'E27 LED lamps'],
    labCount: 32,
  },
  {
    id: 'is-4',
    standardNumber: 'IS 1417:2016',
    title: 'Gold and Gold Alloys, Jewellery/Artefacts — Fineness and Marking',
    year: 2016,
    category: 'Jewellery & Precious Metals',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 50(E)',
    status: 'ACTIVE',
    applicableCommodities: ['Gold jewellery', 'Gold coins', '22K ornaments', '18K jewellery'],
    labCount: 120,
  },
  {
    id: 'is-5',
    standardNumber: 'IS 9873 (Part 1):2019',
    title: 'Safety of Toys — Mechanical and Physical Properties',
    year: 2019,
    category: 'Consumer Products',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 853(E)',
    status: 'ACTIVE',
    applicableCommodities: ['Children toys', 'Plastic toys', 'Educational toys', 'Electronic toys'],
    labCount: 22,
  },
]

export default function StandardsPage() {
  return (
    <div>
      <PageHeader
        title="Indian Standards Directory"
        description="Search, explore, and verify Bureau of Indian Standards (BIS) specifications, mandatory Quality Control Orders (QCOs), and testing requirements."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'Indian Standards' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="info">20,000+ Standards</Badge>
            <Badge variant="warning">QCO Enforced</Badge>
          </div>
        }
      />

      {/* Search & Sector Filters */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '0 14px',
            }}
          >
            <Search size={18} style={{ color: 'var(--text-muted)', marginRight: 10 }} />
            <input
              type="text"
              placeholder="Search by IS code (e.g. IS 14543), product keyword, or standard title..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                padding: '12px 0',
              }}
            />
          </div>
          <Button variant="primary" style={{ padding: '0 24px' }}>Search</Button>
        </div>

        {/* Sector Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
            Sector Filter:
          </span>
          {STANDARDS_CATEGORIES.map((cat, i) => (
            <button
              key={cat}
              type="button"
              style={{
                fontSize: 'var(--text-xs)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: i === 0 ? 'var(--brand-600)' : 'var(--bg-elevated)',
                color: i === 0 ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${i === 0 ? 'var(--brand-500)' : 'var(--border-default)'}`,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Standards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>
            Displaying Featured Indian Standards ({SAMPLE_STANDARDS.length})
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Official BIS Registry Database Sync
          </span>
        </div>

        {SAMPLE_STANDARDS.map((std) => (
          <Card key={std.id} className="hover-card">
            <CardBody style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', color: 'var(--brand-400)', fontFamily: 'var(--font-mono)' }}>
                      {std.standardNumber}
                    </span>
                    {std.isMandatoryQco ? (
                      <Badge variant="error" dot>Mandatory QCO</Badge>
                    ) : (
                      <Badge variant="default">Voluntary Standard</Badge>
                    )}
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Year: {std.year}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
                    {std.title}
                  </h3>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Applicable for:</span>
                    {std.applicableCommodities.map((comm) => (
                      <span
                        key={comm}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {comm}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Accredited Labs: <strong>{std.labCount}</strong>
                  </span>
                  {std.qcoNotificationNumber && (
                    <span style={{ fontSize: '11px', color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
                      QCO: {std.qcoNotificationNumber}
                    </span>
                  )}
                  <Button variant="secondary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    View Standard Specifications <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
