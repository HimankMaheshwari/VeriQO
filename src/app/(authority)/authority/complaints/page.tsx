import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ComplaintStatusBadge } from '@/components/ui/Badge'
import { FileText, Clock } from 'lucide-react'
import { formatDate, shortId } from '@/lib/utils'

import { ComplaintActionButtons } from './ComplaintActionButtons'

export const metadata = { title: 'Complaints — Authority' }

export default async function AuthorityComplaintsPage() {
  const complaints = await prisma.complaint.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      consumer: { select: { name: true } },
      case: { select: { id: true, caseNumber: true, status: true } },
    },
  })

  return (
    <div>
      <PageHeader title="All Complaints" description="Review and manage consumer complaints." />

      {complaints.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title="No complaints filed yet" description="Consumer complaints will appear here once submitted." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {complaints.map((c) => (
            <div
              key={c.id}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-5)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {c.title}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {formatDate(c.createdAt)}</span>
                  <span>· By: {c.consumer.name}</span>
                  <span>· Ref: <span style={{ fontFamily: 'var(--font-mono)' }}>#{shortId(c.complaintRef)}</span></span>
                  {c.scanId && (
                    <span>· Scan: <span style={{ fontFamily: 'var(--font-mono)' }}>#{shortId(c.scanId)}</span></span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ComplaintStatusBadge status={c.status} />
                <ComplaintActionButtons
                  complaintId={c.id}
                  caseId={c.case?.id}
                  caseNumber={c.case?.caseNumber}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
