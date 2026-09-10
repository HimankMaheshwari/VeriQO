'use client'

import React from 'react'
import { Table } from '@/components/ui/Table'
import { RoleBadge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'
import type { Role } from '@/types/auth'

export interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  createdAt: Date | string
}

interface UserTableProps {
  users: UserRow[]
  onToggleActive?: (user: UserRow) => void
  loading?: boolean
}

export function UserTable({ users, onToggleActive, loading }: UserTableProps) {
  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (user: UserRow) => (
        <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
          {user.name}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (user: UserRow) => (
        <span style={{ color: 'var(--text-secondary)' }}>{user.email}</span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (user: UserRow) => <RoleBadge role={user.role} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (user: UserRow) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--text-xs)',
            color: user.isActive ? 'var(--color-success)' : 'var(--text-muted)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 'var(--radius-full)',
              background: user.isActive ? 'var(--color-success)' : 'var(--border-strong)',
            }}
          />
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (user: UserRow) => (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {formatDateTime(user.createdAt)}
        </span>
      ),
    },
    ...(onToggleActive
      ? [
          {
            key: 'action',
            label: 'Action',
            render: (user: UserRow) => (
              <button
                type="button"
                onClick={() => onToggleActive(user)}
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--brand-400)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {user.isActive ? 'Deactivate' : 'Activate'}
              </button>
            ),
          },
        ]
      : []),
  ]

  return (
    <Table
      columns={columns}
      data={users}
      keyExtractor={(u) => u.id}
      loading={loading}
      emptyMessage="No users found."
    />
  )
}
