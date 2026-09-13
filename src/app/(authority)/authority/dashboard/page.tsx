import { auth } from '@/lib/auth'
import { defaultAnalyticsService } from '@/lib/inspections/analytics-service'
import { defaultRiskService } from '@/lib/risk/risk-service'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  InspectionStatusBadge,
  AuthorityDecisionBadge,
  ViolationSeverityBadge,
} from '@/components/ui/Badge'
import Link from 'next/link'
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Plus,
  ArrowRight,
  Clock,
  Scale,
  Globe,
  TrendingUp,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Authority Dashboard — VeriQO' }

export default async function AuthorityDashboard() {
  const session = await auth()
  const user = {
    id: session!.user.id,
    role: session!.user.role,
  }

  const [analytics, riskData] = await Promise.all([
    defaultAnalyticsService.getAuthorityAnalytics(user),
    defaultRiskService.getRiskQueue(user, { pageSize: 5 }),
  ])

  return (
    <div>
      <PageHeader
        title="Authority Inspection & Legal Analytics"
        description={`Logged in as ${session!.user.role.replace(/_/g, ' ')} ${
          analytics.scope === 'GLOBAL' ? '• Global Supervisory Scope' : '• Assigned Inspections Scope'
        }`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              href="/authority/risk"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                textDecoration: 'none',
              }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} /> Risk Queue ({riskData.summary.criticalCount + riskData.summary.highCount})
            </Link>
            <Link
              href="/authority/inspections/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                background: 'var(--brand-600)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                textDecoration: 'none',
              }}
            >
              <Plus size={16} /> New Inspection
            </Link>
          </div>
        }
      />

      {/* Risk Prioritization Intelligence Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 'var(--radius-md)',
              background: riskData.summary.criticalCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
              color: riskData.summary.criticalCount > 0 ? 'var(--color-error)' : 'var(--color-warning)',
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Risk & Regulatory Intelligence Summary
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {riskData.summary.criticalCount} Critical and {riskData.summary.highCount} High risk dockets requiring investigative prioritization
            </div>
          </div>
        </div>

        <Link
          href="/authority/risk"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--text-xs)',
            color: 'var(--brand-400)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          View Risk Queue ({riskData.total}) <ArrowRight size={14} />
        </Link>
      </div>

      {/* Primary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <StatCard
          label="Total Inspections"
          value={analytics.totalInspections}
          icon={<ClipboardList size={22} />}
          accentColor="var(--brand-600)"
          iconBg="var(--brand-900)"
          iconColor="var(--brand-400)"
        />
        <StatCard
          label="Pending Review"
          value={analytics.inspectionsByStatus.PENDING_REVIEW}
          icon={<AlertTriangle size={22} />}
          accentColor="var(--color-warning)"
          iconBg="rgba(245,158,11,0.1)"
          iconColor="var(--color-warning)"
        />
        <StatCard
          label="Closed Inspections"
          value={analytics.inspectionsByStatus.CLOSED}
          icon={<CheckCircle2 size={22} />}
          accentColor="var(--color-success)"
          iconBg="rgba(16,185,129,0.1)"
          iconColor="var(--color-success)"
        />
        <StatCard
          label="Formal Violations Detected"
          value={analytics.violationsBySeverity.TOTAL}
          icon={<AlertOctagon size={22} />}
          accentColor="var(--color-error)"
          iconBg="rgba(239,68,68,0.1)"
          iconColor="var(--color-error)"
        />
      </div>

      {/* Analytics Breakdown Row: Decisions & Severity & Online */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Officer Decisions Distribution */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <Scale size={18} color="var(--brand-500)" />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)' }}>
              Officer Final Decisions
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Compliant</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-success)' }}>
                {analytics.officerDecisions.COMPLIANT}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Non-Compliant</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-error)' }}>
                {analytics.officerDecisions.NON_COMPLIANT}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Further Investigation</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>
                {analytics.officerDecisions.FURTHER_INVESTIGATION}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Dismissed</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>
                {analytics.officerDecisions.DISMISSED}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Pending Determination</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {analytics.officerDecisions.PENDING}
              </span>
            </div>
          </div>
        </div>

        {/* Violations by Severity */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <AlertOctagon size={18} color="var(--color-error)" />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)' }}>
              Formal Violations by Severity
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Critical</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-error)' }}>
                {analytics.violationsBySeverity.CRITICAL}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>High</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>
                {analytics.violationsBySeverity.HIGH}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Medium</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>
                {analytics.violationsBySeverity.MEDIUM}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Low</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--brand-400)' }}>
                {analytics.violationsBySeverity.LOW}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Advisory Warnings (Non-Violations)</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)', fontWeight: 600 }}>
                Advisory Only
              </span>
            </div>
          </div>
        </div>

        {/* E-Commerce Verification & Match Metrics */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <Globe size={18} color="var(--brand-400)" />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)' }}>
              Online Verification Metrics
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Listings Audited</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {analytics.onlineVerificationStats.totalChecked}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Matching Declarations</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-success)' }}>
                {analytics.onlineVerificationStats.matchedCount}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Listing Mismatches</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-warning)' }}>
                {analytics.onlineVerificationStats.mismatchCount}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Statutory Price Concerns</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-error)' }}>
                {analytics.onlineVerificationStats.statutoryConcernsCount}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Consistency Rate</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--brand-400)' }}>
                {analytics.onlineVerificationStats.matchRatePercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Top Violated Rules & Monthly Activity Trends */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Top Violated Legal Metrology Rules */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <Scale size={18} color="var(--brand-400)" />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)' }}>
              Top Violated Legal Metrology Rules
            </h3>
          </div>
          {analytics.topViolatedRules.length === 0 ? (
            <div style={{ padding: 'var(--space-6) 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No formal violations recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analytics.topViolatedRules.map((rule) => (
                <div
                  key={rule.ruleId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {rule.ruleNumber}
                    </div>
                    <div className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {rule.title}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <ViolationSeverityBadge severity={rule.severity} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {rule.count} {rule.count === 1 ? 'violation' : 'violations'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Activity Trends */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
            <TrendingUp size={18} color="var(--brand-400)" />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)' }}>
              Monthly Activity Trends (Last 6 Months)
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {analytics.monthlyTrends.map((trend) => (
              <div key={trend.month} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600 }}>{trend.label}</span>
                  <span>
                    Created: <strong>{trend.inspectionsCreated}</strong> | Closed: <strong>{trend.inspectionsClosed}</strong> | Violations: <strong style={{ color: 'var(--color-error)' }}>{trend.violationsDetected}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-subtle)' }}>
                  <div
                    style={{
                      width: `${Math.min(100, trend.inspectionsCreated * 15)}%`,
                      background: 'var(--brand-500)',
                    }}
                    title={`Created: ${trend.inspectionsCreated}`}
                  />
                  <div
                    style={{
                      width: `${Math.min(100, trend.violationsDetected * 20)}%`,
                      background: 'var(--color-error)',
                    }}
                    title={`Violations: ${trend.violationsDetected}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Inspections Table / List */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>Recent Inspection Activity</h2>
        <Link href="/authority/inspections" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-link)', display: 'flex', alignItems: 'center', gap: 4 }}>
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {analytics.recentActivity.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No inspections found"
          description="Create your first inspection to start tracking legal compliance and analytics."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {analytics.recentActivity.map((ins) => (
            <Link
              key={ins.id}
              href={`/authority/inspections/${ins.id}`}
              className="hover-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                  {ins.title}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <span>Product: <strong>{ins.productName}</strong></span>
                  <span>Officer: <strong>{ins.officerName}</strong></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {formatDate(ins.updatedAt)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {ins.decision && <AuthorityDecisionBadge decision={ins.decision} />}
                <InspectionStatusBadge status={ins.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
