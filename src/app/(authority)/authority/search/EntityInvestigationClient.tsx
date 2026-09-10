'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Tag,
  ShoppingBag,
  Briefcase,
  FileText,
  ClipboardList,
  AlertTriangle,
  Globe,
  ExternalLink,
  Info,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
  CaseStatusBadge,
  CasePriorityBadge,
  InspectionStatusBadge,
  ComplaintStatusBadge,
  Badge,
} from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { EntityInvestigationSummary } from '@/lib/search/types'

interface Props {
  entity: EntityInvestigationSummary
}

export function EntityInvestigationClient({ entity }: Props) {
  const [activeTab, setActiveTab] = useState<
    'products' | 'cases' | 'complaints' | 'inspections' | 'violations' | 'discrepancies'
  >('products')

  const { name, type, summaryCounts, products, cases, complaints, inspections, violations, onlineDiscrepancies } = entity
  const isManufacturer = type === 'MANUFACTURER'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header Profile Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-semibold)',
                  color: isManufacturer ? 'var(--brand-400)' : 'var(--color-warning-dark)',
                  background: isManufacturer ? 'rgba(56, 189, 248, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {isManufacturer ? <Building2 size={12} /> : <Tag size={12} />}
                {isManufacturer ? 'Manufacturer Regulatory Profile' : 'Brand Regulatory Profile'}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              {name}
            </h2>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
              Aggregate statutory inspection footprint and cross-referenced marketplace filings.
            </div>
          </div>
        </div>
      </Card>

      {/* Neutral Regulatory Profile Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 16px',
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <Info size={16} style={{ color: 'var(--brand-400)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Regulatory Record Overview:</strong> This investigation
          summary aggregates historical filings, consumer complaints, and statutory inspections associated with{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)' }}>{name}</span>.
          In accordance with regulatory protocols, previous records and consumer complaints do not constitute an
          affirmative finding of non-compliance without an official statutory decision.
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { label: 'Commodities', count: summaryCounts.productsCount, tab: 'products', icon: <ShoppingBag size={16} /> },
          { label: 'Regulatory Cases', count: summaryCounts.casesCount, tab: 'cases', icon: <Briefcase size={16} /> },
          { label: 'Complaints', count: summaryCounts.complaintsCount, tab: 'complaints', icon: <FileText size={16} /> },
          { label: 'Inspections', count: summaryCounts.inspectionsCount, tab: 'inspections', icon: <ClipboardList size={16} /> },
          { label: 'Violations', count: summaryCounts.violationsCount, tab: 'violations', icon: <AlertTriangle size={16} /> },
          { label: 'Discrepancies', count: summaryCounts.onlineDiscrepanciesCount, tab: 'discrepancies', icon: <Globe size={16} /> },
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => setActiveTab(item.tab as any)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              padding: '12px 14px',
              background: activeTab === item.tab ? 'var(--bg-elevated)' : 'var(--bg-surface)',
              border: `1px solid ${activeTab === item.tab ? 'var(--brand-500)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ color: activeTab === item.tab ? 'var(--brand-400)' : 'var(--text-muted)' }}>
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-bold)',
                  color: item.count > 0 ? (item.tab === 'violations' ? 'var(--color-error)' : 'var(--text-primary)') : 'var(--text-muted)',
                }}
              >
                {item.count}
              </span>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border-default)',
          paddingBottom: 2,
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'products', label: `Commodities (${products.length})` },
          { id: 'cases', label: `Cases (${cases.length})` },
          { id: 'complaints', label: `Complaints (${complaints.length})` },
          { id: 'inspections', label: `Inspections (${inspections.length})` },
          { id: 'violations', label: `Violations (${violations.length})` },
          { id: 'discrepancies', label: `Discrepancies (${onlineDiscrepancies.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: '8px 14px',
              fontSize: 'var(--text-xs)',
              fontWeight: activeTab === t.id ? 'var(--font-semibold)' : 'var(--font-normal)',
              color: activeTab === t.id ? 'var(--brand-400)' : 'var(--text-muted)',
              borderBottom: activeTab === t.id ? '2px solid var(--brand-500)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'products' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {products.length === 0 ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyNotice label="No distinct commodities cataloged under this name." />
              </div>
            ) : (
              products.map((p) => (
                <Card key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {p.category || 'General Commodity'}
                      </span>
                      <h4 style={{ margin: '2px 0 0 0', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                        {p.name}
                      </h4>
                    </div>
                    <Link
                      href={`/authority/search/products/${p.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 'var(--text-xs)',
                        color: 'var(--brand-400)',
                        textDecoration: 'none',
                      }}
                    >
                      History <ExternalLink size={12} />
                    </Link>
                  </div>

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {p.brand && <div>Brand: <strong>{p.brand}</strong></div>}
                    {p.manufacturer && <div>Manufacturer: <strong>{p.manufacturer}</strong></div>}
                    {p.standardQuantity && <div>Standard Qty: {p.standardQuantity}</div>}
                    {p.declaredMrp != null && <div>Declared MRP: ₹{p.declaredMrp.toFixed(2)}</div>}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'cases' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cases.length === 0 ? (
              <EmptyNotice label="No regulatory cases found linked to this entity." />
            ) : (
              cases.map((c) => (
                <Card key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Briefcase size={16} style={{ color: 'var(--brand-400)' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                            {c.caseNumber}
                          </span>
                          <CaseStatusBadge status={c.status} />
                          <CasePriorityBadge priority={c.priority} />
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {c.title}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        <div>Officer: {c.assignedOfficer || 'Unassigned'}</div>
                        <div>{formatDate(c.createdAt)}</div>
                      </div>
                      <Link
                        href={`/authority/cases/${c.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 'var(--text-xs)',
                          color: 'var(--brand-400)',
                          textDecoration: 'none',
                          padding: '6px 12px',
                          background: 'var(--bg-base)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        Case Dossier <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'complaints' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {complaints.length === 0 ? (
              <EmptyNotice label="No consumer complaints recorded against this entity." />
            ) : (
              complaints.map((comp) => (
                <Card key={comp.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={16} style={{ color: 'var(--brand-400)' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                            #{comp.complaintRef}
                          </span>
                          <ComplaintStatusBadge status={comp.status} />
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {comp.title}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {formatDate(comp.createdAt)}
                      </span>
                      <Link
                        href={`/authority/complaints/${comp.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 'var(--text-xs)',
                          color: 'var(--brand-400)',
                          textDecoration: 'none',
                          padding: '6px 12px',
                          background: 'var(--bg-base)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        View Complaint <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'inspections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inspections.length === 0 ? (
              <EmptyNotice label="No statutory inspections conducted on this entity." />
            ) : (
              inspections.map((ins) => (
                <Card key={ins.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ClipboardList size={16} style={{ color: 'var(--brand-400)' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                            {ins.title || `Inspection #${ins.id.slice(0, 8)}`}
                          </span>
                          <InspectionStatusBadge status={ins.status} />
                          {ins.decision && (
                            <Badge variant={ins.decision === 'NON_COMPLIANT' ? 'error' : ins.decision === 'COMPLIANT' ? 'success' : 'warning'}>
                              {ins.decision}
                            </Badge>
                          )}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                          Inspector: {ins.officerName}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {formatDate(ins.createdAt)}
                      </span>
                      <Link
                        href={`/authority/inspections/${ins.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 'var(--text-xs)',
                          color: 'var(--brand-400)',
                          textDecoration: 'none',
                          padding: '6px 12px',
                          background: 'var(--bg-base)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        Inspection Dossier <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'violations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {violations.length === 0 ? (
              <EmptyNotice label="No statutory violations recorded against this entity." />
            ) : (
              violations.map((v) => (
                <Card key={v.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 'var(--font-bold)',
                            color: 'var(--color-error-dark)',
                            background: 'var(--color-error-bg)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--text-xs)',
                          }}
                        >
                          {v.ruleNumber}
                        </span>
                        <Badge variant={v.severity === 'CRITICAL' ? 'error' : v.severity === 'MAJOR' ? 'warning' : 'info'}>
                          {v.severity}
                        </Badge>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {formatDate(v.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 4 }}>
                        {v.description}
                      </div>
                      {v.remediation && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          <strong>Required Remediation:</strong> {v.remediation}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/authority/inspections/${v.inspectionId}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 'var(--text-xs)',
                        color: 'var(--brand-400)',
                        textDecoration: 'none',
                        padding: '6px 12px',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      Inspection Evidence <ExternalLink size={12} />
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'discrepancies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {onlineDiscrepancies.length === 0 ? (
              <EmptyNotice label="No online discrepancies detected for this entity." />
            ) : (
              onlineDiscrepancies.map((d) => (
                <Card key={d.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Globe size={14} style={{ color: 'var(--brand-400)' }} />
                        <span style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                          {d.discrepancyType}
                        </span>
                        <Badge variant={d.severity === 'HIGH' ? 'error' : d.severity === 'MEDIUM' ? 'warning' : 'info'}>
                          {d.severity}
                        </Badge>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          Domain: {d.domain}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        <div>
                          <strong>Physical Declaration:</strong> {d.physicalValue || '—'}
                        </div>
                        <div>
                          <strong>Online Listing:</strong> {d.onlineValue || '—'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatDate(d.createdAt)}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyNotice({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: 'var(--space-6)',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-xs)',
        border: '1px dashed var(--border-default)',
      }}
    >
      {label}
    </div>
  )
}
