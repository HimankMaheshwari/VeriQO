'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ShoppingBag,
  Briefcase,
  FileText,
  ClipboardList,
  AlertTriangle,
  Globe,
  FileCheck,
  Tag,
  Building2,
  Calendar,
  ExternalLink,
  ShieldAlert,
  Download,
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
import { RiskBadge } from '@/components/risk/RiskBadge'
import { formatDate } from '@/lib/utils'
import type { ProductInvestigationDossier } from '@/lib/search/types'

interface Props {
  dossier: ProductInvestigationDossier
  riskAssessment?: any
}

export function ProductInvestigationClient({ dossier, riskAssessment }: Props) {
  const [activeTab, setActiveTab] = useState<
    'cases' | 'complaints' | 'inspections' | 'violations' | 'discrepancies' | 'declarations' | 'scans' | 'reports'
  >('cases')

  const { product, packagingDeclarations, scans, complaints, cases, inspections, violations, onlineDiscrepancies, reports } = dossier

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Product Identity Header Card */}
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
                  color: 'var(--brand-400)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <ShoppingBag size={12} /> Commodity File
              </span>
              {riskAssessment && (
                <RiskBadge level={riskAssessment.level} score={riskAssessment.score} />
              )}
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Registered: {formatDate(product.createdAt)}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              {product.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              {product.brand && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)' }}>
                  <Tag size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Brand:</span>
                  <Link
                    href={`/authority/search/brands/${encodeURIComponent(product.brand)}`}
                    style={{ color: 'var(--brand-400)', textDecoration: 'none', fontWeight: 'var(--font-medium)' }}
                  >
                    {product.brand}
                  </Link>
                </div>
              )}
              {product.manufacturer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)' }}>
                  <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Manufacturer:</span>
                  <Link
                    href={`/authority/search/manufacturers/${encodeURIComponent(product.manufacturer)}`}
                    style={{ color: 'var(--brand-400)', textDecoration: 'none', fontWeight: 'var(--font-medium)' }}
                  >
                    {product.manufacturer}
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))',
              gap: 8,
              background: 'var(--bg-base)',
              padding: 12,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Category</div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>
                {product.category || 'General Commodity'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Barcode / GTIN</div>
              <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                {product.barcode || '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Standard Qty</div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>
                {product.standardQuantity || '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Declared MRP</div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--brand-400)' }}>
                {product.declaredMrp != null ? `₹${product.declaredMrp.toFixed(2)}` : '—'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Neutral Regulatory Footprint Notice */}
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
          <strong style={{ color: 'var(--text-primary)' }}>Previous Regulatory Records:</strong> This dossier compiles
          the verified historical regulatory footprint linked to this product across consumer complaints, regulatory dockets,
          statutory inspections, recorded violations, and online marketplace verifications. Historical records do not infer
          unlawful operation outside of formal statutory decisions.
        </div>
      </div>

      {/* Regulatory Footprint Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { label: 'Regulatory Cases', count: cases.length, tab: 'cases', icon: <Briefcase size={16} /> },
          { label: 'Complaints', count: complaints.length, tab: 'complaints', icon: <FileText size={16} /> },
          { label: 'Inspections', count: inspections.length, tab: 'inspections', icon: <ClipboardList size={16} /> },
          { label: 'Violations', count: violations.length, tab: 'violations', icon: <AlertTriangle size={16} /> },
          { label: 'Online Discrepancies', count: onlineDiscrepancies.length, tab: 'discrepancies', icon: <Globe size={16} /> },
          { label: 'Official Reports', count: reports.length, tab: 'reports', icon: <FileCheck size={16} /> },
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
          { id: 'cases', label: `Cases (${cases.length})` },
          { id: 'complaints', label: `Complaints (${complaints.length})` },
          { id: 'inspections', label: `Inspections (${inspections.length})` },
          { id: 'violations', label: `Violations (${violations.length})` },
          { id: 'discrepancies', label: `Online Discrepancies (${onlineDiscrepancies.length})` },
          { id: 'declarations', label: `Declarations (${packagingDeclarations.length})` },
          { id: 'scans', label: `Scans (${scans.length})` },
          { id: 'reports', label: `Reports (${reports.length})` },
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

      {/* Tab Content Area */}
      <div>
        {activeTab === 'cases' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cases.length === 0 ? (
              <EmptyNotice label="No regulatory cases on record for this commodity." />
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
              <EmptyNotice label="No consumer complaints recorded for this commodity." />
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
              <EmptyNotice label="No statutory inspections conducted on this commodity." />
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
              <EmptyNotice label="No statutory violations recorded for this commodity." />
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
              <EmptyNotice label="No online marketplace discrepancies recorded for this commodity." />
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

        {activeTab === 'declarations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {packagingDeclarations.length === 0 ? (
              <EmptyNotice label="No extracted packaging declarations on record." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {packagingDeclarations.map((decl) => (
                  <Card key={decl.id}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {decl.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', margin: '4px 0' }}>
                      {decl.normalizedValue || decl.rawValue || 'Not Specified'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <span>Status: {decl.status}</span>
                      {decl.confidence != null && <span>Confidence: {(decl.confidence * 100).toFixed(0)}%</span>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'scans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scans.length === 0 ? (
              <EmptyNotice label="No packaging scans recorded." />
            ) : (
              scans.map((s) => (
                <Card key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Scan ID: {s.id}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Status: {s.status} · Packaging Images: {s.imagesCount}
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {formatDate(s.createdAt)}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.length === 0 ? (
              <EmptyNotice label="No official regulatory reports generated for this commodity." />
            ) : (
              reports.map((r) => (
                <Card key={r.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileCheck size={16} style={{ color: 'var(--brand-400)' }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                          {r.reportRef}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {r.title || 'Official Regulatory Inspection Report'} · Format: {r.format}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Generated: {formatDate(r.generatedAt)}
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
