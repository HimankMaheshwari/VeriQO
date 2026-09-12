'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  STANDARDS_CATEGORIES,
  type StandardDiscoveryItem,
  type StandardsCategory,
  type QcoFilterOption,
  type SortOption,
} from '@/types/standards'
import { standardsDiscoveryService } from '@/services/standards-service'
import { StandardCard } from '@/components/standards/StandardCard'
import { StandardDetailModal } from '@/components/standards/StandardDetailModal'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Search,
  X,
  Sparkles,
  Filter,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  Layers,
  ShieldAlert,
} from 'lucide-react'

const QUICK_EXAMPLES = [
  { label: 'Packaged drinking water (20L jar)', query: 'drinking water jar', category: 'Food & Agriculture' },
  { label: '22 Karat gold hallmarked jewellery', query: 'gold jewellery 22k', category: 'Jewellery & Precious Metals' },
  { label: 'Self-ballasted LED bulb 9W B22', query: 'LED bulb lamp', category: 'Electronics & IT' },
  { label: 'Plastic toy / infant rattle', query: 'toy choking safety', category: 'Textiles & Garments' },
  { label: 'Phenolic disinfectant floor cleaner', query: 'disinfectant fluid phenyl', category: 'Chemicals & Plastics' },
  { label: 'Ordinary Portland Cement 43 grade', query: 'OPC cement concrete', category: 'Civil Engineering & Cement' },
  { label: '16A domestic plug & socket', query: 'plugs socket outlet', category: 'Electronics & IT' },
]

export interface StandardsDiscoveryClientProps {
  initialQuery?: string
  initialCategory?: string
  initialDescription?: string
}

export function StandardsDiscoveryClient({
  initialQuery = '',
  initialCategory,
  initialDescription = '',
}: StandardsDiscoveryClientProps = {}) {
  const validCategory =
    initialCategory && (STANDARDS_CATEGORIES as readonly string[]).includes(initialCategory)
      ? initialCategory
      : 'All Sectors'

  // Filter & Search states
  const [query, setQuery] = useState(initialQuery)
  const [productDescription, setProductDescription] = useState(initialDescription)
  const [selectedCategory, setSelectedCategory] = useState<string>(validCategory)
  const [qcoFilter, setQcoFilter] = useState<QcoFilterOption>('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('RELEVANCE')

  // Results & UI states
  const [results, setResults] = useState<StandardDiscoveryItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeModalStandard, setActiveModalStandard] = useState<StandardDiscoveryItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Execute Search
  const performSearch = useCallback(
    async (overrideParams?: {
      q?: string
      desc?: string
      cat?: string
      qco?: QcoFilterOption
      sort?: SortOption
    }) => {
      setIsLoading(true)
      try {
        const res = await standardsDiscoveryService.searchStandards({
          query: overrideParams?.q !== undefined ? overrideParams.q : query,
          productDescription: overrideParams?.desc !== undefined ? overrideParams.desc : productDescription,
          category: overrideParams?.cat !== undefined ? overrideParams.cat : selectedCategory,
          qcoType: overrideParams?.qco !== undefined ? overrideParams.qco : qcoFilter,
          sortBy: overrideParams?.sort !== undefined ? overrideParams.sort : sortBy,
        })
        setResults(res.items)
        setTotalCount(res.totalCount)
      } catch (err) {
        console.error('Error fetching standards:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [query, productDescription, selectedCategory, qcoFilter, sortBy]
  )

  // Initial load
  useEffect(() => {
    performSearch()
  }, [performSearch])

  // Handle category change
  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat)
    performSearch({ cat })
  }

  // Handle QCO change
  const handleQcoSelect = (qco: QcoFilterOption) => {
    setQcoFilter(qco)
    performSearch({ qco })
  }

  // Handle Sort change
  const handleSortSelect = (sort: SortOption) => {
    setSortBy(sort)
    performSearch({ sort })
  }

  // Handle Quick Example Click
  const handleQuickExampleClick = (example: (typeof QUICK_EXAMPLES)[number]) => {
    setProductDescription(example.label)
    setQuery(example.query)
    setSelectedCategory(example.category)
    performSearch({
      q: example.query,
      desc: example.label,
      cat: example.category,
    })
  }

  // Handle Clear Search
  const handleClearAll = () => {
    setQuery('')
    setProductDescription('')
    setSelectedCategory('All Sectors')
    setQcoFilter('ALL')
    setSortBy('RELEVANCE')
    performSearch({
      q: '',
      desc: '',
      cat: 'All Sectors',
      qco: 'ALL',
      sort: 'RELEVANCE',
    })
  }

  // Handle Modal Open
  const handleViewDetails = (standard: StandardDiscoveryItem) => {
    setActiveModalStandard(standard)
    setIsModalOpen(true)
  }

  const isFiltered = Boolean(
    query ||
      productDescription ||
      (selectedCategory && selectedCategory !== 'All Sectors') ||
      qcoFilter !== 'ALL'
  )

  return (
    <div>
      {/* 1. Multi-Modal Search & Natural Language Product Input */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Main Search Bar */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label
            htmlFor="standards-search"
            style={{
              display: 'block',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Search by IS Code, Title, or Commodity Keyword
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '0 14px',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <Search size={18} style={{ color: 'var(--text-muted)', marginRight: 10, flexShrink: 0 }} />
              <input
                id="standards-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                placeholder="e.g. IS 14543, drinking water, LED lamp, gold jewellery, cement, toys..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  padding: '12px 0',
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    performSearch({ q: '' })
                  }}
                  aria-label="Clear query"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <Button
              variant="primary"
              onClick={() => performSearch()}
              style={{ padding: '0 24px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Search size={16} /> Search
            </Button>
          </div>
        </div>

        {/* Natural Language Product Description Box */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: 'var(--brand-400)' }} />
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--brand-300)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Natural Language Product Discovery
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              AI/Algorithmic Matching Engine
            </span>
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 var(--space-3) 0' }}>
            Describe the item you manufacture, sell, or purchase to find applicable BIS standards, QCO orders, and mandatory certification schemes:
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <input
              type="text"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
              placeholder="e.g. We are manufacturing bottled mineral water in 1-litre PET containers with screw caps..."
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <Button
              variant="secondary"
              onClick={() => performSearch()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              <Sparkles size={14} style={{ color: 'var(--brand-400)' }} /> Find Applicable Standards
            </Button>
          </div>

          {/* Quick Example Pills */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              <Lightbulb size={13} style={{ color: 'var(--color-warning)' }} />
              <span>Or click a sample product to test matching:</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => handleQuickExampleClick(ex)}
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--brand-500)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sector Category Filters */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Sector Filter
            </span>
            {selectedCategory !== 'All Sectors' && (
              <button
                type="button"
                onClick={() => handleCategorySelect('All Sectors')}
                style={{
                  fontSize: '11px',
                  color: 'var(--brand-400)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Reset Sector
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STANDARDS_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  style={{
                    fontSize: 'var(--text-xs)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: isSelected ? 'var(--brand-600)' : 'var(--bg-elevated)',
                    color: isSelected ? 'var(--neutral-0)' : 'var(--text-secondary)',
                    border: `1px solid ${isSelected ? 'var(--brand-500)' : 'var(--border-default)'}`,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* QCO Mandatory Toggle & Sort Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* QCO Mandatory Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
              Regulatory Mandate:
            </span>
            {(
              [
                { id: 'ALL', label: 'All Standards' },
                { id: 'MANDATORY', label: 'Mandatory QCO Only' },
                { id: 'VOLUNTARY', label: 'Voluntary Only' },
              ] as const
            ).map((opt) => {
              const active = qcoFilter === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleQcoSelect(opt.id)}
                  style={{
                    fontSize: '11px',
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    color: active ? 'var(--brand-300)' : 'var(--text-muted)',
                    border: `1px solid ${active ? 'var(--brand-500)' : 'var(--border-default)'}`,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
              Sort:
            </span>
            <select
              value={sortBy}
              aria-label="Sort standards by"
              onChange={(e) => handleSortSelect(e.target.value as SortOption)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                padding: '4px 10px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="RELEVANCE">Relevance / Match Score</option>
              <option value="STANDARD_ASC">Standard Number (A-Z)</option>
              <option value="YEAR_DESC">Revision Year (Newest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Results Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Found {totalCount} Applicable {totalCount === 1 ? 'Standard' : 'Standards'}
          </span>
          {isFiltered && (
            <Badge variant="info">Filtered View</Badge>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-400)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <RefreshCw size={12} /> Clear all filters
            </Button>
          )}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Official BIS Registry Database Sync
          </span>
        </div>
      </div>

      {/* 3. Standards Cards Stream or Loading/Empty State */}
      {isLoading ? (
        <Card>
          <CardBody
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-16)',
              gap: 'var(--space-4)',
            }}
          >
            <Spinner size="lg" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                Consulting Indian Standards Directory...
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                Evaluating specifications, Quality Control Orders, and test requirements
              </div>
            </div>
          </CardBody>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<BookOpen size={28} />}
              title="No matching Indian Standards found"
              description={
                query || productDescription
                  ? `No standards matched your query "${query || productDescription}". Try searching by commodity name (e.g. "drinking water", "cement", "LED", "gold") or resetting sector filters.`
                  : 'No standards match the selected category and QCO filters.'
              }
              action={
                <Button variant="primary" onClick={handleClearAll}>
                  Reset All Filters
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {results.map((std) => (
            <StandardCard
              key={std.id}
              standard={std}
              onViewDetails={handleViewDetails}
              showReasoningInitially={Boolean(query || productDescription)}
            />
          ))}
        </div>
      )}

      {/* 4. Detailed Standard Specifications Modal */}
      <StandardDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        standard={activeModalStandard}
      />
    </div>
  )
}
