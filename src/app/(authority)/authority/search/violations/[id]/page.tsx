import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge, CaseStatusBadge, CasePriorityBadge, InspectionStatusBadge } from '@/components/ui/Badge'
import { defaultAuthoritySearchService } from '@/lib/search/search-service'
import { formatDate } from '@/lib/utils'
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Briefcase,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  Info,
  Hash,
} from 'lucide-react'

export const metadata = { title: 'Violation Investigation | VeriQO Authority' }

export default async function ViolationInvestigationPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session) notFound()

  const allowedRoles = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN']
  if (!allowedRoles.includes(session.user.role)) {
    notFound()
  }

  const dossier = await defaultAuthoritySearchService.getViolationInvestigation(
    params.id,
    { id: session.user.id, role: session.user.role as any }
  )

  if (!dossier) {
    notFound()
  }

  const {
    violation,
    complianceCheck,
    rule: statutoryRule,
    historicalRuleVersion: ruleVersion,
    inspection,
    case: linkedCase,
    relatedActiveCase,
    evidenceItems: evidenceTrace,
  } = dossier

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title={`Violation Investigation — ${violation.ruleNumber}`}
        description={`Statutory violation docket linked to Inspection #${inspection.id.slice(0, 8)}`}
        breadcrumbs={[
          { label: 'Search & Investigation', href: '/authority/search' },
          { label: 'Violations', href: '/authority/search?type=VIOLATION' },
          { label: violation.ruleNumber },
        ]}
      />

      {/* Neutral Legal Integrity Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 16px',
          background: 'rgba(234, 179, 8, 0.05)',
          border: '1px solid rgba(234, 179, 8, 0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <Info size={16} style={{ color: 'var(--color-warning-dark)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Historical Statutory Audit Record:</strong> This violation
          remains bound to the exact <em>RuleVersion</em> that was in legal effect when the statutory inspection was evaluated.
          Compliance evaluation was deterministic and is never recomputed or mutated during investigation search.
        </div>
      </div>

      {/* Primary Violation Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 'var(--font-bold)',
                  color: 'var(--color-error-dark)',
                  background: 'var(--color-error-bg)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {violation.ruleNumber}
              </span>
              <Badge variant={violation.severity === 'CRITICAL' ? 'error' : violation.severity === 'MAJOR' ? 'warning' : 'info'}>
                {violation.severity}
              </Badge>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Recorded: {formatDate(violation.createdAt)}
              </span>
            </div>
            <h2 style={{ margin: '8px 0', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
              {violation.description}
            </h2>
            {violation.remediation && (
              <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Required Statutory Remediation:</strong> {violation.remediation}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Statutory Rule & Historical RuleVersion Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookOpen size={18} style={{ color: 'var(--brand-400)' }} />
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
              Statutory Basis &amp; Act
            </h3>
          </div>
          {statutoryRule ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-xs)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Source Document:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{statutoryRule.sourceDocument}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Rule / Citation:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{statutoryRule.sourceReference || statutoryRule.ruleNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Rule Title:</span>{' '}
                <span>{statutoryRule.title}</span>
              </div>
              <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)', fontStyle: 'italic', marginTop: 4 }}>
                &quot;{statutoryRule.description}&quot;
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Direct statutory rule reference: {violation.ruleNumber}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-success-dark)' }} />
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
              Historical RuleVersion Trace
            </h3>
          </div>
          {ruleVersion ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-xs)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Enacted Version:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>Version {ruleVersion.versionNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Effective Date:</span>{' '}
                <span>{formatDate(ruleVersion.effectiveDate)}</span>
              </div>
              {ruleVersion.changeDescription && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Change Description:</span>{' '}
                  <span>{ruleVersion.changeDescription}</span>
                </div>
              )}
              {ruleVersion.snapshot && (
                <div style={{ background: 'var(--bg-base)', padding: 8, borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: '11px', overflowX: 'auto' }}>
                  {JSON.stringify(ruleVersion.snapshot, null, 2)}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Enacted under standard statutory parameters at the time of evaluation.
            </div>
          )}
        </Card>
      </div>

      {/* Compliance Check Outcome & Evaluation Details */}
      {complianceCheck && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-warning-dark)' }} />
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
              Deterministic Compliance Check Finding
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Evaluated Status</span>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-error)' }}>
                {complianceCheck.status}
              </div>
            </div>
            <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Target Field</span>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                {(complianceCheck.evaluationDetails as any)?.field || 'General Metrology Requirement'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Expected Statutory Value</span>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-success-dark)' }}>
                {(complianceCheck.evaluationDetails as any)?.expectedValue || '—'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-base)', padding: 10, borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Actual Physical Value</span>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-error)' }}>
                {(complianceCheck.evaluationDetails as any)?.actualValue || 'Missing / Non-compliant'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Linked Inspection, Case, and Evidence Trace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Linked Inspection Card */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={18} style={{ color: 'var(--brand-400)' }} />
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                Originating Inspection
              </h3>
            </div>
            <Link
              href={`/authority/inspections/${inspection.id}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--brand-400)', textDecoration: 'none' }}
            >
              Inspection Dossier <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                {inspection.title || `Inspection #${inspection.id.slice(0, 8)}`}
              </strong>
              <InspectionStatusBadge status={inspection.status} />
              {inspection.decision && (
                <Badge variant={inspection.decision.decision === 'NON_COMPLIANT' ? 'error' : 'success'}>
                  {inspection.decision.decision}
                </Badge>
              )}
            </div>
            <div>Inspector: {inspection.officerName}</div>
            <div>Date Conducted: {formatDate(inspection.createdAt)}</div>
          </div>
        </Card>

        {/* Linked Case Card */}
        {linkedCase ? (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={18} style={{ color: 'var(--brand-400)' }} />
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
                  Linked Regulatory Case
                </h3>
              </div>
              <Link
                href={`/authority/cases/${linkedCase.id}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--brand-400)', textDecoration: 'none' }}
              >
                Case Dossier <ExternalLink size={12} />
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-xs)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                  {linkedCase.caseNumber}
                </strong>
                <CaseStatusBadge status={linkedCase.status} />
                <CasePriorityBadge priority={linkedCase.priority} />
              </div>
              <div>Title: {linkedCase.title}</div>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={18} style={{ color: 'var(--text-secondary)' }} />
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  Historical Pre-Docket Inspection
                </h3>
              </div>
              <Badge variant="info">Pre-Docket</Badge>
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              This statutory inspection was concluded independently before a formal regulatory case docket existed.
            </div>

            {relatedActiveCase ? (
              <div
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--brand-400)' }}>
                    Related Active Case on Commodity
                  </span>
                  <Link
                    href={`/authority/cases/${relatedActiveCase.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 'var(--text-xs)',
                      color: 'var(--brand-400)',
                      textDecoration: 'none',
                      fontWeight: 'var(--font-medium)',
                    }}
                  >
                    View Active Case <ExternalLink size={12} />
                  </Link>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: 'var(--text-xs)' }}>
                    {relatedActiveCase.caseNumber}
                  </strong>
                  <CaseStatusBadge status={relatedActiveCase.status as any} />
                  <CasePriorityBadge priority={relatedActiveCase.priority as any} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  This inspection was completed independently prior to docket creation. An active regulatory case for this commodity is ongoing.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                No active regulatory case dockets currently exist for this commodity.
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Evidence Trace Chain */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Hash size={18} style={{ color: 'var(--brand-400)' }} />
          <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}>
            Cryptographic Evidence Trace ({evidenceTrace.length})
          </h3>
        </div>
        {evidenceTrace.length === 0 ? (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-base)', padding: 12, borderRadius: 'var(--radius-md)' }}>
            No cryptographic evidence files were attached directly to this inspection.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {evidenceTrace.map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                    {ev.title || `Evidence ${ev.id.slice(0, 8)}`} ({ev.type})
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px', marginTop: 2 }}>
                    SHA-256: {ev.sha256Hash}
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)' }}>
                  {formatDate(ev.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
