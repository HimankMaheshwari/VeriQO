'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConsumerSafeStatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { formatDate, shortId } from '@/lib/utils'
import type { ConsumerSafeStatusKey } from '@/lib/consumer/status-projection'
import {
  FileText,
  Plus,
  Clock,
  Search,
  Package,
  ScanLine,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react'

export interface SerializedConsumerComplaint {
  id: string
  complaintRef: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  statusKey: ConsumerSafeStatusKey
  statusLabel: string
  statusDescription: string
  badgeVariant: string
  isTerminal: boolean
  productName: string | null
  productBrand: string | null
  category: string | null
  scanId: string | null
  caseNumber: string | null
}

export default function ConsumerComplaintsList({
  initialComplaints,
}: {
  initialComplaints: SerializedConsumerComplaint[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'CONCLUDED'>('ALL')

  const filteredComplaints = useMemo(() => {
    return initialComplaints.filter((c) => {
      // Tab filter
      if (activeTab === 'ACTIVE' && c.isTerminal) return false
      if (activeTab === 'CONCLUDED' && !c.isTerminal) return false

      // Search query filter
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        c.title.toLowerCase().includes(q) ||
        c.complaintRef.toLowerCase().includes(q) ||
        (c.productName && c.productName.toLowerCase().includes(q)) ||
        (c.productBrand && c.productBrand.toLowerCase().includes(q)) ||
        (c.caseNumber && c.caseNumber.toLowerCase().includes(q))
      )
    })
  }, [initialComplaints, activeTab, searchQuery])

  const activeCount = initialComplaints.filter((c) => !c.isTerminal).length
  const concludedCount = initialComplaints.filter((c) => c.isTerminal).length

  return (
    <div>
      <PageHeader
        title="My Complaints"
        description="Track the real-time progress and official resolution of your submitted consumer complaints."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link
              href="/consumer/scan"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                textDecoration: 'none',
              }}
            >
              <ScanLine size={16} /> Scan Product First
            </Link>
            <Link
              href="/consumer/complaints/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                background: 'var(--brand-600)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-semibold)',
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
              id="new-complaint-btn"
            >
              <Plus size={16} /> File Complaint
            </Link>
          </div>
        }
      />

      {/* Control Bar: Search & Status Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {/* Filter Tabs */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '3px',
          }}
        >
          <button
            onClick={() => setActiveTab('ALL')}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'ALL' ? 'var(--brand-600)' : 'transparent',
              color: activeTab === 'ALL' ? 'white' : 'var(--text-secondary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-medium)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All ({initialComplaints.length})
          </button>
          <button
            onClick={() => setActiveTab('ACTIVE')}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'ACTIVE' ? 'var(--brand-600)' : 'transparent',
              color: activeTab === 'ACTIVE' ? 'white' : 'var(--text-secondary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-medium)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            In Progress ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('CONCLUDED')}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'CONCLUDED' ? 'var(--brand-600)' : 'transparent',
              color: activeTab === 'CONCLUDED' ? 'white' : 'var(--text-secondary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-medium)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Concluded ({concludedCount})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: 260, flexGrow: 1, maxWidth: 380 }}>
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, ref #, or product…"
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-xs)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Complaints List */}
      {initialComplaints.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} style={{ color: 'var(--brand-400)' }} />}
          title="No complaints filed yet"
          description="If you encountered a packaged commodity with missing declarations, altered MRP, or misleading labels, you can file a complaint for regulatory review."
          action={
            <Link
              href="/consumer/complaints/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 22px',
                background: 'var(--brand-600)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-semibold)',
                textDecoration: 'none',
              }}
            >
              <Plus size={16} /> File Your First Complaint
            </Link>
          }
        />
      ) : filteredComplaints.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No complaints match the selected filter or search term.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredComplaints.map((c) => (
            <Link
              key={c.id}
              href={`/consumer/complaints/${c.id}`}
              style={{
                display: 'block',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
                textDecoration: 'none',
                transition: 'border-color 0.2s ease, transform 0.1s ease',
              }}
              className="complaint-card-hover"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--brand-300)',
                        background: 'var(--brand-950)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--brand-800)',
                      }}
                    >
                      #{shortId(c.complaintRef).toUpperCase()}
                    </span>
                    {c.caseNumber && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-elevated)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        Docket: {c.caseNumber}
                      </span>
                    )}
                  </div>
                  <h3
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'var(--text-primary)',
                      margin: '2px 0 6px 0',
                    }}
                  >
                    {c.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      margin: '0 0 var(--space-3) 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {c.description}
                  </p>
                </div>

                <div style={{ flexShrink: 0 }}>
                  <ConsumerSafeStatusBadge status={c.statusKey} />
                </div>
              </div>

              {/* Bottom Metadata row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                  paddingTop: 'var(--space-3)',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {c.productName && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)' }}>
                      <Package size={13} style={{ color: 'var(--brand-400)' }} />
                      <strong>{c.productName}</strong>
                      {c.productBrand && <span>({c.productBrand})</span>}
                    </span>
                  )}
                  {c.scanId && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand-300)' }}>
                      <ScanLine size={13} />
                      Scan Linked
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> Filed {formatDate(c.createdAt)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Updated {formatDate(c.updatedAt)}
                  </span>
                </div>

                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--brand-400)',
                    fontWeight: 'var(--font-medium)',
                  }}
                >
                  Track Progress <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
