import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type TestingLaboratory } from '@/types/standards'
import { FlaskConical, Search, MapPin, Phone, Mail, CheckCircle, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Testing Laboratories Directory | VeriQO PS107',
  description: 'Search and locate BIS Central, Regional, and NABL-accredited testing laboratories across India.',
}

const SAMPLE_LABS: TestingLaboratory[] = [
  {
    id: 'lab-1',
    name: 'BIS Central Laboratory (CL)',
    registrationNumber: 'BIS-HQ-CL-001',
    labType: 'BIS_CENTRAL',
    address: 'Plot No. 20/9, Site IV, Sahibabad Industrial Area',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201010',
    contactPhone: '+91-120-2867900',
    contactEmail: 'cl@bis.gov.in',
    supportedStandards: ['IS 14543', 'IS 13428', 'IS 1061', 'IS 16102', 'IS 1293'],
    validUntil: 'Permanent Official Facility',
    status: 'ACTIVE',
  },
  {
    id: 'lab-2',
    name: 'National Test House (Northern Region)',
    registrationNumber: 'NABL-TC-5012',
    labType: 'NABL_ACCREDITED',
    address: 'Kamla Nehru Nagar, Post Kavi Nagar',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201002',
    contactPhone: '+91-120-2789934',
    contactEmail: 'nth-nr@gov.in',
    supportedStandards: ['IS 14543', 'IS 4984', 'IS 1786', 'IS 456'],
    validUntil: '2027-12-31',
    status: 'ACTIVE',
  },
  {
    id: 'lab-3',
    name: 'Shriram Institute for Industrial Research',
    registrationNumber: 'NABL-TC-5481',
    labType: 'NABL_ACCREDITED',
    address: '19, University Road, Delhi',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110007',
    contactPhone: '+91-11-27667267',
    contactEmail: 'sridlhi@shriraminstitute.org',
    supportedStandards: ['IS 9873 (Part 1)', 'IS 1061', 'IS 15410', 'IS 14543'],
    validUntil: '2026-10-15',
    status: 'ACTIVE',
  },
  {
    id: 'lab-4',
    name: 'BIS Western Regional Laboratory',
    registrationNumber: 'BIS-WRL-002',
    labType: 'BIS_REGIONAL',
    address: 'Manakalaya, E9, MIDC, Andheri (East)',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400093',
    contactPhone: '+91-22-28329295',
    contactEmail: 'wrl@bis.gov.in',
    supportedStandards: ['IS 16102', 'IS 694', 'IS 1293', 'IS 14543'],
    validUntil: 'Permanent Official Facility',
    status: 'ACTIVE',
  },
]

export default function LaboratoriesPage() {
  return (
    <div>
      <PageHeader
        title="Testing Laboratories Directory"
        description="Locate BIS Central, Regional, and NABL-accredited testing facilities in India authorized for conformity testing of certified commodities."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'Testing Laboratories' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="success">Accredited Network</Badge>
            <Badge variant="info">All-India Coverage</Badge>
          </div>
        }
      />

      {/* Filter Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
          display: 'grid',
          gridTemplateColumns: '1fr 200px 160px',
          gap: 'var(--space-4)',
          alignItems: 'center',
        }}
      >
        <div
          style={{
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
            placeholder="Search by IS code (e.g. IS 14543), laboratory name, or city..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              padding: '10px 0',
            }}
          />
        </div>

        <select
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            padding: '10px 12px',
            outline: 'none',
          }}
        >
          <option value="">All States / UTs</option>
          <option value="UP">Uttar Pradesh</option>
          <option value="DL">Delhi NCR</option>
          <option value="MH">Maharashtra</option>
          <option value="KA">Karnataka</option>
          <option value="TN">Tamil Nadu</option>
        </select>

        <Button variant="primary">Search Labs</Button>
      </div>

      {/* Labs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {SAMPLE_LABS.map((lab) => (
          <Card key={lab.id} className="hover-card">
            <CardBody style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge variant={lab.labType === 'BIS_CENTRAL' ? 'error' : 'info'}>
                      {lab.labType.replace(/_/g, ' ')}
                    </Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Reg: {lab.registrationNumber}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 6 }}>
                    {lab.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 8 }}>
                    <MapPin size={14} style={{ color: 'var(--brand-400)', flexShrink: 0 }} />
                    <span>{lab.address}, {lab.city}, {lab.state} — {lab.pincode}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Tested Standards:</span>
                    {lab.supportedStandards.map((std) => (
                      <span
                        key={std}
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 8px',
                          background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--brand-300)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {std}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  {lab.contactPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <Phone size={12} /> {lab.contactPhone}
                    </div>
                  )}
                  {lab.contactEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-link)' }}>
                      <Mail size={12} /> {lab.contactEmail}
                    </div>
                  )}
                  <Button variant="secondary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    View Testing Scope <ArrowRight size={14} />
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
