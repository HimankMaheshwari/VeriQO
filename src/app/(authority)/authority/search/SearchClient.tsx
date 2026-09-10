'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  X,
  Briefcase,
  FileText,
  ClipboardList,
  ShoppingBag,
  Building2,
  Tag,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  User,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import {
  CaseStatusBadge,
  CasePriorityBadge,
  InspectionStatusBadge,
  ComplaintStatusBadge,
  Badge,
} from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { NormalizedSearchResult, SearchEntityType } from '@/lib/search/types'

const ENTITY_TABS: Array<{ label: string; value: SearchEntityType; icon: React.ReactNode }> = [
  { label: 'All Records', value: 'ALL', icon: <Search size={14} /> },
  { label: 'Regulatory Cases', value: 'CASE', icon: <Briefcase size={14} /> },
  { label: 'Complaints', value: 'COMPLAINT', icon: <FileText size={14} /> },
  { label: 'Inspections', value: 'INSPECTION', icon: <ClipboardList size={14} /> },
  { label: 'Commodities', value: 'PRODUCT', icon: <ShoppingBag size={14} /> },
  { label: 'Manufacturers', value: 'MANUFACTURER', icon: <Building2 size={14} /> },
  { label: 'Brands', value: 'BRAND', icon: <Tag size={14} /> },
  { label: 'Violations', value: 'VIOLATION', icon: <AlertTriangle size={14} /> },
]

export function SearchClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [selectedType, setSelectedType] = useState<SearchEntityType>(
    (searchParams.get('type') as SearchEntityType) || 'ALL'
  )
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '')
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || '')
  const [officerFilter, setOfficerFilter] = useState(searchParams.get('officer') || '')
  const [brandFilter, setBrandFilter] = useState(searchParams.get('brand') || '')
  const [manufacturerFilter, setManufacturerFilter] = useState(searchParams.get('manufacturer') || '')
  const [fromDate, setFromDate] = useState(searchParams.get('from') || '')
  const [toDate, setToDate] = useState(searchParams.get('to') || '')

  const [page, setPage] = useState(Number(searchParams.get('page') || '1'))
  const [pageSize] = useState(12)

  const [results, setResults] = useState<NormalizedSearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const executeSearch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (selectedType && selectedType !== 'ALL') params.set('type', selectedType)
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (severityFilter) params.set('severity', severityFilter)
      if (officerFilter) params.set('officer', officerFilter)
      if (brandFilter) params.set('brand', brandFilter)
      if (manufacturerFilter) params.set('manufacturer', manufacturerFilter)
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await fetch(`/api/v1/authority/search?${params.toString()}`)
      const data = await res.json()
      if (res.ok && data.data) {
        setResults(data.data.results || [])
        setTotalCount(data.data.pagination.totalCount || 0)
        setTotalPages(data.data.pagination.totalPages || 1)
      } else {
        setResults([])
        setTotalCount(0)
        setTotalPages(1)
      }
    } catch {
      setResults([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [
    query,
    selectedType,
    statusFilter,
    priorityFilter,
    severityFilter,
    officerFilter,
    brandFilter,
    manufacturerFilter,
    fromDate,
    toDate,
    page,
    pageSize,
  ])

  useEffect(() => {
    executeSearch()
  }, [executeSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    executeSearch()
  }

  const clearAllFilters = () => {
    setQuery('')
    setSelectedType('ALL')
    setStatusFilter('')
    setPriorityFilter('')
    setSeverityFilter('')
    setOfficerFilter('')
    setBrandFilter('')
    setManufacturerFilter('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const activeFiltersCount = [
    statusFilter,
    priorityFilter,
    severityFilter,
    officerFilter,
    brandFilter,
    manufacturerFilter,
    fromDate,
    toDate,
  ].filter(Boolean).length

  const renderEntityBadge = (item: NormalizedSearchResult) => {
    switch (item.type) {
      case 'CASE':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'var(--brand-950)', border: '1px solid var(--brand-700)', color: 'var(--brand-200)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' }}>
            <Briefcase size={11} /> Case
          </span>
        )
      case 'COMPLAINT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#ca8a04', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' }}>
            <FileText size={11} /> Complaint
          </span>
        )
      case 'INSPECTION':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', color: '#0284c7', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' }}>
            <ClipboardList size={11} /> Inspection
          </span>
        )
      case 'PRODUCT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#6366f1', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' }}>
            <ShoppingBag size={11} /> Commodity
          </span>
        )
      case 'MANUFACTURER':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#a855f7', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' }}>
            <Building2 size={11} /> Manufacturer
          </span>
        )
      case 'BRAND':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', color: '#ec4899', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' }}>
            <Tag size={11} /> Brand
          </span>
        )
      case 'VIOLATION':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)' }}>
            <AlertTriangle size={11} /> Violation
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Search Header & Main Input */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-sm)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by case number, complaint ref, product, brand, manufacturer, officer, rule…"
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
              }}
              id="authority-search-input"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setPage(1); }}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 16px',
              background: showFilters || activeFiltersCount > 0 ? 'var(--brand-950)' : 'var(--bg-elevated)',
              border: '1px solid',
              borderColor: showFilters || activeFiltersCount > 0 ? 'var(--brand-600)' : 'var(--border-default)',
              color: showFilters || activeFiltersCount > 0 ? 'var(--brand-200)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              cursor: 'pointer',
            }}
            id="toggle-filters-btn"
          >
            <Filter size={15} />
            <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
          </button>

          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 20px',
              background: 'var(--brand-600)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              cursor: 'pointer',
            }}
            id="execute-search-btn"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>Search</span>
          </button>
        </form>

        {/* Entity Category Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', overflowX: 'auto', paddingBottom: 4 }}>
          {ENTITY_TABS.map((tab) => {
            const active = selectedType === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setSelectedType(tab.value)
                  setPage(1)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  borderColor: active ? 'var(--brand-600)' : 'var(--border-default)',
                  background: active ? 'var(--brand-600)' : 'var(--bg-elevated)',
                  color: active ? 'white' : 'var(--text-muted)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: active ? 'var(--font-semibold)' : 'var(--font-medium)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                id={`tab-${tab.value.toLowerCase()}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Extended Filter Panel */}
        {showFilters && (
          <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-default)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                Status
              </label>
              <input
                type="text"
                placeholder="e.g. INVESTIGATION, CLOSED"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}
                id="filter-status-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}
                id="filter-priority-select"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                Severity
              </label>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}
                id="filter-severity-select"
              >
                <option value="">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                Inspecting Officer
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                value={officerFilter}
                onChange={(e) => { setOfficerFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}
                id="filter-officer-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                Brand
              </label>
              <input
                type="text"
                placeholder="e.g. HYPHEN, Parle"
                value={brandFilter}
                onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}
                id="filter-brand-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                Manufacturer
              </label>
              <input
                type="text"
                placeholder="e.g. Aelius Parallel"
                value={manufacturerFilter}
                onChange={(e) => { setManufacturerFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}
                id="filter-mfg-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}
                id="filter-from-date"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-muted)', marginBottom: 4 }}>
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}
                id="filter-to-date"
              />
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Active Filters:</span>
            {statusFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>
                Status: {statusFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('')} />
              </span>
            )}
            {priorityFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>
                Priority: {priorityFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setPriorityFilter('')} />
              </span>
            )}
            {severityFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>
                Severity: {severityFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSeverityFilter('')} />
              </span>
            )}
            {officerFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>
                Officer: {officerFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setOfficerFilter('')} />
              </span>
            )}
            {brandFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>
                Brand: {brandFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setBrandFilter('')} />
              </span>
            )}
            {manufacturerFilter && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>
                Mfg: {manufacturerFilter} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setManufacturerFilter('')} />
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              style={{ background: 'none', border: 'none', color: 'var(--brand-400)', fontSize: 'var(--text-xs)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Results Header & Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={14} className="animate-spin" /> Searching regulatory database…
            </span>
          ) : (
            <span>
              Found <strong>{totalCount}</strong> matching record{totalCount === 1 ? '' : 's'}
              {query && <span> for &ldquo;{query}&rdquo;</span>}
            </span>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{ padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              style={{ padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Results List */}
      {results.length === 0 && !loading ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-12)', textAlign: 'center' }}>
          <Search size={36} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-muted)', opacity: 0.5 }} />
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 8 }}>
            No regulatory records match your search
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto var(--space-4)', lineHeight: 1.5 }}>
            Try searching with broader terms, clearing specific filters, or searching across specific case numbers (e.g. <code style={{ fontFamily: 'var(--font-mono)' }}>CASE-2026-V47P1W</code>), complaint references (e.g. <code style={{ fontFamily: 'var(--font-mono)' }}>#VWRIHETR</code>), or product names.
          </p>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--brand-600)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', cursor: 'pointer' }}
            >
              <RefreshCw size={13} /> Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {results.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-4) var(--space-5)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                gap: 'var(--space-4)',
                transition: 'border-color 0.15s ease',
              }}
              className="hover:border-brand-500"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4, flexWrap: 'wrap' }}>
                  {renderEntityBadge(item)}
                  {item.status && (
                    item.type === 'CASE' ? <CaseStatusBadge status={item.status as any} /> :
                    item.type === 'COMPLAINT' ? <ComplaintStatusBadge status={item.status as any} /> :
                    item.type === 'INSPECTION' ? <InspectionStatusBadge status={item.status as any} /> :
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.status}</span>
                  )}
                  {item.priority && <CasePriorityBadge priority={item.priority as any} />}
                  {item.createdAt && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
                      <Calendar size={11} /> {formatDate(item.createdAt)}
                    </span>
                  )}
                </div>

                <div className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 2 }}>
                  {item.title}
                </div>

                {item.subtitle && (
                  <div className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                    {item.subtitle}
                  </div>
                )}

                {/* Metadata Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {item.metadata.assignedOfficer && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <User size={11} /> {item.metadata.assignedOfficer}
                    </span>
                  )}
                  {item.metadata.officerName && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <User size={11} /> Officer: {item.metadata.officerName}
                    </span>
                  )}
                  {item.metadata.brand && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Tag size={11} /> Brand: {item.metadata.brand}
                    </span>
                  )}
                  {item.metadata.manufacturer && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Building2 size={11} /> Mfg: {item.metadata.manufacturer}
                    </span>
                  )}
                  {item.metadata.decision && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Shield size={11} /> Decision: {item.metadata.decision}
                    </span>
                  )}
                  {item.metadata.ruleNumber && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <AlertTriangle size={11} /> Rule: {item.metadata.ruleNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={item.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-medium)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
                id={`open-result-${item.type.toLowerCase()}-${item.id}`}
              >
                <span>Investigate</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
