import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/Card'
import { Users, BookOpen, ClipboardList, ActivitySquare } from 'lucide-react'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboard() {
  const [userCount, ruleCount, inspectionCount, auditCount] = await Promise.all([
    prisma.user.count(),
    prisma.legalRule.count(),
    prisma.inspection.count(),
    prisma.auditLog.count(),
  ])

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="System overview and administration." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
        <StatCard label="Total Users" value={userCount} icon={<Users size={22} />} accentColor="var(--brand-600)" iconBg="var(--brand-900)" iconColor="var(--brand-400)" />
        <StatCard label="Legal Rules" value={ruleCount} icon={<BookOpen size={22} />} accentColor="var(--color-warning)" iconBg="rgba(245,158,11,0.1)" iconColor="var(--color-warning)" />
        <StatCard label="Inspections" value={inspectionCount} icon={<ClipboardList size={22} />} accentColor="var(--color-success)" iconBg="rgba(16,185,129,0.1)" iconColor="var(--color-success)" />
        <StatCard label="Audit Events" value={auditCount} icon={<ActivitySquare size={22} />} accentColor="var(--color-info)" iconBg="var(--color-info-bg)" iconColor="var(--color-info)" />
      </div>

      <div style={{ padding: 'var(--space-6)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', maxWidth: 640 }}>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>System Capabilities</h3>
        {[
          { label: 'Legal Rule Engine', status: 'Rule Engine · Available', color: 'var(--color-success)' },
          { label: 'OCR / AI Analysis', status: 'AI Extraction · Available', color: 'var(--color-success)' },
          { label: 'Online Verification', status: 'Online Verification · Available', color: 'var(--color-success)' },
          { label: 'Authentication', status: 'Authentication · Active', color: 'var(--color-success)' },
          { label: 'File Storage', status: 'Secure File Storage · Configured', color: 'var(--color-success)' },
          { label: 'Audit Logging', status: 'Audit Logging · Active', color: 'var(--color-success)' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontSize: 'var(--text-xs)', color: item.color, fontWeight: 'var(--font-medium)' }}>{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
