'use client'

import React from 'react'
import { Table } from '@/components/ui/Table'
import { formatDateTime } from '@/lib/utils'

export interface RuleRow {
  id: string
  ruleNumber: string
  title: string
  requirement: string
  sourceDocument: string
  isActive: boolean
  effectiveDate: Date | string
}

interface RuleTableProps {
  rules: RuleRow[]
  loading?: boolean
}

export function RuleTable({ rules, loading }: RuleTableProps) {
  const columns = [
    {
      key: 'ruleNumber',
      label: 'Rule #',
      render: (rule: RuleRow) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--brand-300)' }}>
          {rule.ruleNumber}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (rule: RuleRow) => (
        <span style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
          {rule.title}
        </span>
      ),
    },
    {
      key: 'requirement',
      label: 'Requirement',
      render: (rule: RuleRow) => (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: 320, display: 'inline-block' }}>
          {rule.requirement}
        </span>
      ),
    },
    {
      key: 'sourceDocument',
      label: 'Source',
      render: (rule: RuleRow) => (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {rule.sourceDocument}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (rule: RuleRow) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--text-xs)',
            color: rule.isActive ? 'var(--color-success)' : 'var(--text-muted)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 'var(--radius-full)',
              background: rule.isActive ? 'var(--color-success)' : 'var(--border-strong)',
            }}
          />
          {rule.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'effectiveDate',
      label: 'Effective Date',
      render: (rule: RuleRow) => (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {formatDateTime(rule.effectiveDate)}
        </span>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      data={rules}
      keyExtractor={(r) => r.id}
      loading={loading}
      emptyMessage="No legal rules found. Rules will be populated in Phase 3 from Legal Metrology sources."
    />
  )
}
