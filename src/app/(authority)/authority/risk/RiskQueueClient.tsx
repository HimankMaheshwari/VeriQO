'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, StatCard } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { RiskBadge } from '@/components/risk/RiskBadge'
import { CaseStatusBadge, CasePriorityBadge } from '@/components/ui/Badge'
import { type RiskQueueResponse, type RiskLevel } from '@/lib/risk/types'
import { formatDate } from '@/lib/utils'
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Layers,
  Info,
} from 'lucide-react'

interface RiskQueueClientProps {
  initialData: RiskQueueResponse
  currentFilters: {
    level: string
    status: string
    sortBy: string
    sortOrder: string
    page: number
  }
}

export function RiskQueueClient({
  initialData,
  currentFilters,
}: RiskQueueClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { items, summary, total } = initialData

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'ALL') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset page on filter
    router.push(`/authority/risk?${params.toString()}`)
  }

  const levelTabs = [
    { label: 'All Prioritizations', value: 'ALL', count: total },
    { label: 'Critical', value: 'CRITICAL', count: summary.criticalCount },
    { label: 'High', value: 'HIGH', count: summary.highCount },
    { label: 'Medium', value: 'MEDIUM', count: summary.mediumCount },
    { label: 'Low', value: 'LOW', count: summary.lowCount },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Informational Guidance Ribbon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <Info size={16} style={{ color: 'var(--brand-400)', flexShrink: 0 }} />
        <div>
          <strong>Investigative Prioritization Tool:</strong> Risk scores highlight active regulatory dockets
          and commodities requiring priority inspection based on formal violations, repeat consumer grievances,
          and online discrepancies. Scores do NOT determine statutory compliance or replace officer discretion.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <StatCard
          label="Critical Risk Dockets"
          value={summary.criticalCount}
          icon={<AlertOctagon size={22} />}
          accentColor="#ef4444"
          iconBg="rgba(239, 68, 68, 0.12)"
          iconColor="#ef4444"
        />
        <StatCard
          label="High Risk Dockets"
          value={summary.highCount}
          icon={<AlertTriangle size={22} />}
          accentColor="#f97316"
          iconBg="rgba(249, 115, 22, 0.12)"
          iconColor="#f97316"
        />
        <StatCard
          label="Medium Risk Dockets"
          value={summary.mediumCount}
          icon={<ShieldAlert size={22} />}
          accentColor="#f59e0b"
          iconBg="rgba(245, 158, 11, 0.12)"
          iconColor="#f59e0b"
        />
        <StatCard
          label="Low Risk (Routine)"
          value={summary.lowCount}
          icon={<ShieldCheck size={22} />}
          accentColor="#10b981"
          iconBg="rgba(16, 185, 129, 0.12)"
          iconColor="#10b981"
        />
      </div>

      {/* Level Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid var(--border-default)',
          paddingBottom: 'var(--space-2)',
          overflowX: 'auto',
        }}
      >
        {levelTabs.map((tab) => {
          const isActive = currentFilters.level === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => handleFilterChange('level', tab.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: isActive ? 'var(--brand-600)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
              <span
                style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                }}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Secondary Filter & Sort Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* Case Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Status:</span>
          <select
            value={currentFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="ALL">All Lifecycle Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="INVESTIGATION">INVESTIGATION</option>
            <option value="DECISION_PENDING">DECISION_PENDING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Sort By:</span>
          <select
            value={`${currentFilters.sortBy}_${currentFilters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('_')
              const params = new URLSearchParams(searchParams.toString())
              params.set('sortBy', sortBy)
              params.set('sortOrder', sortOrder)
              router.push(`/authority/risk?${params.toString()}`)
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="score_desc">Risk Score (Highest First)</option>
            <option value="score_asc">Risk Score (Lowest First)</option>
            <option value="createdAt_desc">Date Created (Newest First)</option>
            <option value="createdAt_asc">Date Created (Oldest First)</option>
          </select>
        </div>
      </div>

      {/* Case Queue Items */}
      {items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={36} style={{ color: 'var(--brand-400)' }} />}
          title="No Regulatory Cases Match Criteria"
          description="There are currently no cases matching the selected risk level and lifecycle status filters."
          action={
            <button
              onClick={() => router.push('/authority/risk')}
              style={{
                padding: '8px 16px',
                background: 'var(--brand-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <Link
              key={item.caseId}
              href={`/authority/cases/${item.caseId}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '16px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              {/* Row 1: Docket Number, Risk Badge, Priority, Status */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-bold)',
                      color: 'var(--brand-400)',
                    }}
                  >
                    #{item.caseNumber}
                  </span>
                  <RiskBadge level={item.riskLevel} score={item.riskScore} />
                  <CasePriorityBadge priority={item.priority as any} />
                  <CaseStatusBadge status={item.status as any} />
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--brand-400)',
                    fontWeight: 500,
                  }}
                >
                  View Dossier <ArrowRight size={13} />
                </div>
              </div>

              {/* Row 2: Title & Commodity Context */}
              <div>
                <h4
                  style={{
                    margin: '0 0 4px',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {item.title}
                </h4>
                {(item.productName || item.brand || item.manufacturer) && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {item.productName && <span>Product: <strong style={{ color: 'var(--text-secondary)' }}>{item.productName}</strong></span>}
                    {item.brand && <span>Brand: <strong style={{ color: 'var(--text-secondary)' }}>{item.brand}</strong></span>}
                    {item.manufacturer && <span>Manufacturer: <strong style={{ color: 'var(--text-secondary)' }}>{item.manufacturer}</strong></span>}
                  </div>
                )}
              </div>

              {/* Row 3: Top Contributing Factors */}
              {item.topFactors.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-base)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Top Risk Drivers:</span>
                  {item.topFactors.map((factor, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'var(--bg-elevated)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      • {factor}
                    </span>
                  ))}
                </div>
              )}

              {/* Row 4: Assigned Inspector and Date */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 8,
                  marginTop: 2,
                }}
              >
                <span>Assigned Inspector: {item.assignedOfficer || 'Unassigned Intake'}</span>
                <span>Initiated: {formatDate(item.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
