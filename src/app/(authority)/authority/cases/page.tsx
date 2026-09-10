import { auth } from '@/lib/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { CaseStatusBadge, CasePriorityBadge, Badge } from '@/components/ui/Badge'
import { RiskBadge } from '@/components/risk/RiskBadge'
import { defaultCaseService } from '@/lib/cases/case-service'
import { defaultRiskService } from '@/lib/risk/risk-service'
import Link from 'next/link'
import { Briefcase, Clock, FileText, UserCheck, AlertTriangle, Search, ChevronRight, Shield } from 'lucide-react'
import { formatDate, shortId } from '@/lib/utils'

export const metadata = { title: 'Regulatory Cases | VeriQO Authority' }

interface CasesPageProps {
  searchParams: {
    status?: string
    priority?: string
    search?: string
  }
}

export default async function AuthorityCasesPage({ searchParams }: CasesPageProps) {
  const session = await auth()
  if (!session) return null

  const user = { id: session.user.id, role: session.user.role as any }
  const rawCases = await defaultCaseService.listCases(
    user,
    {
      status: searchParams.status as any,
      priority: searchParams.priority as any,
      search: searchParams.search,
    }
  )

  const cases = await Promise.all(
    rawCases.map(async (c) => {
      try {
        const risk = await defaultRiskService.assessCaseRisk(c.id, user)
        return { ...c, riskLevel: risk.level, riskScore: risk.score }
      } catch {
        return { ...c, riskLevel: null, riskScore: null }
      }
    })
  )

  const activeStatus = searchParams.status || 'ALL'
  const activePriority = searchParams.priority || 'ALL'

  return (
    <div>
      <PageHeader
        title="Regulatory Cases"
        description="Official authority docket connecting consumer complaints, investigations, and statutory enforcement."
      />

      {/* Filter / Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          alignItems: 'center',
          padding: 'var(--space-4)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <form
          method="GET"
          style={{ display: 'flex', flex: 1, minWidth: 260, gap: 'var(--space-2)' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              name="search"
              defaultValue={searchParams.search ?? ''}
              placeholder="Search by case #, complaint ref, product..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            />
          </div>
          {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
          {searchParams.priority && <input type="hidden" name="priority" value={searchParams.priority} />}
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-medium)',
              cursor: 'pointer',
            }}
          >
            Filter
          </button>
        </form>

        {/* Quick status tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { label: 'All', value: 'ALL' },
            { label: 'Submitted', value: 'SUBMITTED' },
            { label: 'Assigned', value: 'ASSIGNED' },
            { label: 'Investigation', value: 'INVESTIGATION' },
            { label: 'Resolved', value: 'RESOLVED' },
            { label: 'Closed', value: 'CLOSED' },
          ].map((tab) => {
            const isSelected = activeStatus === tab.value
            const url =
              tab.value === 'ALL'
                ? `/authority/cases`
                : `/authority/cases?status=${tab.value}${searchParams.search ? '&search=' + encodeURIComponent(searchParams.search) : ''}`
            return (
              <Link
                key={tab.value}
                href={url}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: isSelected ? 'var(--font-semibold)' : 'var(--font-normal)',
                  background: isSelected ? 'var(--brand-600)' : 'var(--bg-elevated)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  border: isSelected ? '1px solid var(--brand-500)' : '1px solid var(--border-subtle)',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Case List */}
      {cases.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={28} />}
          title="No regulatory cases found"
          description="Cases created from consumer complaints or ex-officio surveillance will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {cases.map((c) => {
            const hasViolations = c.inspections.some((ins) => ins.violations.length > 0)
            const inspectionCount = c.inspections.length

            return (
              <Link
                key={c.id}
                href={`/authority/cases/${c.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-5)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--brand-400)',
                        fontWeight: 'var(--font-semibold)',
                      }}
                    >
                      {c.caseNumber}
                    </span>
                    <CasePriorityBadge priority={c.priority} />
                    <CaseStatusBadge status={c.status} />
                    {c.riskLevel && <RiskBadge level={c.riskLevel} score={c.riskScore ?? undefined} />}
                  </div>

                  <div
                    className="truncate"
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'var(--text-primary)',
                      marginBottom: 6,
                    }}
                  >
                    {c.title}
                  </div>

                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {formatDate(c.createdAt)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserCheck size={11} />{' '}
                      {c.assignedOfficer ? c.assignedOfficer.name : 'Unassigned'}
                    </span>
                    {c.complaint && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={11} /> Complaint: #{shortId(c.complaint.complaintRef)}
                      </span>
                    )}
                    {c.productScan && c.productScan.identifiedProductName && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        · Product: {c.productScan.identifiedProductName}
                      </span>
                    )}
                    {inspectionCount > 0 && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: hasViolations ? 'var(--color-error)' : 'var(--brand-400)',
                        }}
                      >
                        {hasViolations ? <AlertTriangle size={11} /> : <Shield size={11} />}
                        {inspectionCount} Inspection{inspectionCount > 1 ? 's' : ''}
                        {hasViolations && ' (Violations Detected)'}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                  <ChevronRight size={18} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
