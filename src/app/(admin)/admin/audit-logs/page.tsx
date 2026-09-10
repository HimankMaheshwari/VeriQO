import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActivitySquare } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: 'Audit Logs' }

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Sign In',
  LOGOUT: 'Sign Out',
  REGISTER: 'Registration',
  PRODUCT_SCAN: 'Product Scan',
  INSPECTION_CREATED: 'Inspection Created',
  INSPECTION_UPDATED: 'Inspection Updated',
  COMPLIANCE_ANALYSIS: 'Compliance Analysis',
  RULE_CHANGED: 'Rule Changed',
  COMPLAINT_SUBMITTED: 'Complaint Submitted',
  COMPLAINT_CHANGED: 'Complaint Updated',
  REPORT_GENERATED: 'Report Generated',
  AUTHORITY_DECISION: 'Authority Decision',
  ADMIN_ACTION: 'Admin Action',
  USER_CREATED: 'User Created',
  USER_UPDATED: 'User Updated',
  FILE_UPLOAD: 'File Upload',
}

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  })

  return (
    <div>
      <PageHeader title="Audit Logs" description="System-wide audit trail of all important actions." />

      {logs.length === 0 ? (
        <EmptyState icon={<ActivitySquare size={28} />} title="No audit events yet" description="System events will appear here as users interact with VeriQO." />
      ) : (
        <div
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {logs.map((log, i) => (
            <div
              key={log.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 160px 120px',
                gap: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: i < logs.length - 1 ? '1px solid var(--border-default)' : 'none',
                background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                alignItems: 'center',
                fontSize: 'var(--text-xs)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {formatDateTime(log.createdAt)}
              </span>
              <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                {ACTION_LABELS[log.action] ?? log.action}
                {log.entityType && (
                  <span style={{ color: 'var(--text-muted)', fontWeight: 'var(--font-normal)' }}>
                    {' '}· {log.entityType}
                  </span>
                )}
              </span>
              <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                {log.user?.name ?? 'System'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {log.ipAddress ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
