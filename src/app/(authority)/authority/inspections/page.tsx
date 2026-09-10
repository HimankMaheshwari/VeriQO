import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { InspectionStatusBadge, AuthorityDecisionBadge, Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { ClipboardList, Plus, Clock, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Inspections' }

export default async function InspectionsPage() {
  const session = await auth()
  const inspections = await prisma.inspection.findMany({
    where: session!.user.role === 'AUTHORITY_OFFICER' ? { officerId: session!.user.id } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      product: true,
      officer: { select: { name: true } },
      decision: true,
      reports: { take: 1, orderBy: { generatedAt: 'desc' }, select: { reportRef: true } },
    },
  })

  return (
    <div>
      <PageHeader
        title="Inspections"
        description="Formal compliance inspections of packaged commodities."
        actions={
          <Link
            href="/authority/inspections/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', background: 'var(--brand-600)', color: 'white',
              borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', textDecoration: 'none',
            }}
          >
            <Plus size={16} /> New Inspection
          </Link>
        }
      />

      {inspections.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No inspections yet"
          description="Create an inspection to begin the compliance workflow."
          action={
            <Link
              href="/authority/inspections/new"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', background: 'var(--brand-600)', color: 'white',
                borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', textDecoration: 'none',
              }}
            >
              <Plus size={16} /> Create First Inspection
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {inspections.map((ins) => (
            <Link
              key={ins.id}
              href={`/authority/inspections/${ins.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-5)', background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', textDecoration: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {ins.title ?? ins.product?.name ?? 'Inspection #' + ins.id.slice(-6).toUpperCase()}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {formatDate(ins.createdAt)}</span>
                  <span>· Officer: {ins.officer.name}</span>
                  {ins.reports && ins.reports.length > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--brand-400)' }}>
                      <FileText size={11} /> PDF Report
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {ins.decision && <AuthorityDecisionBadge decision={ins.decision.decision} />}
                <InspectionStatusBadge status={ins.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
