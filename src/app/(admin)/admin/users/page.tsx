import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Table } from '@/components/ui/Table'
import { RoleBadge } from '@/components/ui/Badge'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { Users } from 'lucide-react'

export const metadata = { title: 'User Management' }

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage all VeriQO user accounts and roles."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <Users size={14} /> {users.length} users
          </div>
        }
      />

      <Table
        columns={[
          { key: 'name', label: 'Name', render: (u) => <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{u.name}</span> },
          { key: 'email', label: 'Email', render: (u) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{u.email}</span> },
          { key: 'role', label: 'Role', render: (u) => <RoleBadge role={u.role} /> },
          { key: 'isActive', label: 'Status', render: (u) => <Badge variant={u.isActive ? 'success' : 'muted'}>{u.isActive ? 'Active' : 'Inactive'}</Badge> },
          { key: 'createdAt', label: 'Joined', render: (u) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</span> },
        ]}
        data={users}
        keyExtractor={(u) => u.id}
        emptyMessage="No users found"
      />
    </div>
  )
}
