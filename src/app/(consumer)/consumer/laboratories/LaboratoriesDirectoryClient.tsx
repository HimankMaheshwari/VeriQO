'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type TestingLaboratory } from '@/types/standards'
import {
  FlaskConical,
  Search,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  ShieldAlert,
  Info,
} from 'lucide-react'

interface LaboratoriesDirectoryClientProps {
  initialLabs: TestingLaboratory[]
  initialQuery?: string
  initialState?: string
}

export function LaboratoriesDirectoryClient({
  initialLabs,
  initialQuery = '',
  initialState = '',
}: LaboratoriesDirectoryClientProps) {
  const [query, setQuery] = useState(initialQuery)
  const [selectedState, setSelectedState] = useState(initialState)
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null)

  // Derive unique states from available authentic records
  const availableStates = useMemo(() => {
    return Array.from(new Set(initialLabs.map((lab) => lab.state))).sort()
  }, [initialLabs])

  // Filter records strictly against existing authentic dataset
  const filteredLabs = useMemo(() => {
    return initialLabs.filter((lab) => {
      // State filter
      if (selectedState && selectedState !== 'ALL') {
        const labStateNorm = lab.state.toLowerCase()
        const selectedStateNorm = selectedState.toLowerCase()
        if (!labStateNorm.includes(selectedStateNorm) && !selectedStateNorm.includes(labStateNorm)) {
          return false
        }
      }

      // Query filter (Name, City, State, Reg Number, or Tested Standards)
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const qCompact = q.replace(/\s+/g, '')

        const nameMatch = lab.name.toLowerCase().includes(q)
        const cityMatch = lab.city.toLowerCase().includes(q)
        const stateMatch = lab.state.toLowerCase().includes(q)
        const regMatch = lab.registrationNumber.toLowerCase().includes(q)
        const stdMatch = lab.supportedStandards.some((std) => {
          const stdLower = std.toLowerCase()
          return stdLower.includes(q) || stdLower.replace(/\s+/g, '').includes(qCompact)
        })

        if (!nameMatch && !cityMatch && !stateMatch && !regMatch && !stdMatch) {
          return false
        }
      }

      return true
    })
  }, [initialLabs, query, selectedState])

  const hasActiveFilters = Boolean(query.trim() || selectedState)

  const handleClearFilters = () => {
    setQuery('')
    setSelectedState('')
  }

  const toggleExpandLab = (labId: string) => {
    setExpandedLabId((prev) => (prev === labId ? null : labId))
  }

  return (
    <div>
      {/* Search and State Filter Toolbar */}
      <div
        role="search"
        aria-label="Laboratory Directory Search and Filters"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div className="responsive-lab-filter">
          {/* Search Input with Search Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '0 14px',
              position: 'relative',
            }}
          >
            <label htmlFor="lab-search-input" className="sr-only">
              Search by IS standard code, laboratory name, or city
            </label>
            <Search size={18} style={{ color: 'var(--text-muted)', marginRight: 10, flexShrink: 0 }} />
            <input
              id="lab-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by IS code (e.g. IS 14543), laboratory name, or city..."
              aria-label="Search by IS code, laboratory name, or city"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                padding: '10px 0',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search query"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* State Dropdown Filter */}
          <div>
            <label htmlFor="lab-state-select" className="sr-only">
              Filter by State or Union Territory
            </label>
            <select
              id="lab-state-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              aria-label="Filter by State"
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                padding: '10px 12px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All States / UTs ({initialLabs.length} facilities)</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Reset / Status Button */}
          {hasActiveFilters ? (
            <Button
              variant="secondary"
              onClick={handleClearFilters}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <X size={14} /> Clear Filters
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {}}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Search size={14} /> Search Labs
            </Button>
          )}
        </div>

        {/* Filter Summary Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredLabs.length}</strong> of{' '}
            {initialLabs.length} authorized laboratory facilities
            {hasActiveFilters && ' (filtered)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={12} style={{ color: 'var(--brand-400)' }} />
            <span>Sample facilities grounded in BIS official testing scope records</span>
          </div>
        </div>
      </div>

      {/* Empty State: Distinguish NO RESULTS from Error */}
      {filteredLabs.length === 0 && (
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-3)',
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-full)',
                background: 'rgba(234, 179, 8, 0.1)',
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlaskConical size={22} />
            </div>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Matching Laboratories Found
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              No laboratory records in the authentic sample registry match your search criteria{' '}
              {query && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-300)' }}>&ldquo;{query}&rdquo;</span>}
              {selectedState && <span> in {selectedState}</span>}. Unknown or unverified facilities are not fabricated.
            </div>
            <Button variant="secondary" size="sm" onClick={handleClearFilters} style={{ marginTop: 'var(--space-2)' }}>
              Clear Search Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Labs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {filteredLabs.map((lab) => {
          const isExpanded = expandedLabId === lab.id
          return (
            <Card key={lab.id} className="hover-card" style={{ border: '1px solid var(--border-default)' }}>
              <CardBody style={{ padding: 'var(--space-5)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                      <Badge variant={lab.labType === 'BIS_CENTRAL' ? 'policy' : 'info'}>
                        {lab.labType.replace(/_/g, ' ')}
                      </Badge>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        Reg: {lab.registrationNumber}
                      </span>
                      {lab.isDemoData && (
                        <Badge variant="warning">SAMPLE RECORD</Badge>
                      )}
                    </div>

                    <h3
                      style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                        marginBottom: 6,
                      }}
                    >
                      {lab.name}
                    </h3>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        marginBottom: 10,
                      }}
                    >
                      <MapPin size={14} style={{ color: 'var(--brand-400)', flexShrink: 0 }} />
                      <span>
                        {lab.address}, {lab.city}, {lab.state} — {lab.pincode}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Tested Standards:</span>
                      {lab.supportedStandards.map((std) => (
                        <button
                          key={std}
                          type="button"
                          onClick={() => setQuery(std)}
                          aria-label={`Filter laboratories by ${std}`}
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 8px',
                            background:
                              query.trim() && std.toLowerCase().includes(query.trim().toLowerCase())
                                ? 'var(--brand-600)'
                                : 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            color:
                              query.trim() && std.toLowerCase().includes(query.trim().toLowerCase())
                                ? '#ffffff'
                                : 'var(--brand-300)',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                          }}
                        >
                          {std}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    {lab.contactPhone && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Phone size={12} /> <span>{lab.contactPhone}</span>
                      </div>
                    )}
                    {lab.contactEmail && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-link)',
                        }}
                      >
                        <Mail size={12} />{' '}
                        <a
                          href={`mailto:${lab.contactEmail}`}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {lab.contactEmail}
                        </a>
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleExpandLab(lab.id)}
                      aria-expanded={isExpanded}
                      aria-label={`Toggle testing scope for ${lab.name}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}
                    >
                      {isExpanded ? (
                        <>
                          Hide Scope <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          View Testing Scope <ChevronDown size={14} />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expandable Testing Scope & Facility Details */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 'var(--space-4)',
                      paddingTop: 'var(--space-4)',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      background: 'var(--bg-elevated)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Authoritative Testing Scope &amp; Accredited Capabilities:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                      {lab.supportedStandards.map((std) => (
                        <div
                          key={std}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: 'var(--text-xs)',
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand-400)' }}>
                            {std}
                          </span>
                          <Link
                            href={`/consumer/standards?q=${encodeURIComponent(std)}`}
                            style={{
                              color: 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              textDecoration: 'none',
                              fontSize: '11px',
                            }}
                          >
                            Explore IS <ExternalLink size={10} />
                          </Link>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginTop: 4,
                      }}
                    >
                      <span>
                        Accreditation Validity:{' '}
                        {lab.validUntil
                          ? lab.validUntil instanceof Date
                            ? lab.validUntil.toLocaleDateString()
                            : String(lab.validUntil)
                          : 'Permanent Official Facility'}
                      </span>
                      <span style={{ color: 'var(--color-success)' }}>Status: {lab.status}</span>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
