'use client'

import React, { useState } from 'react'
import { BisComplianceJourney } from '@/components/journey/BisComplianceJourney'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Search, Sparkles, RefreshCw, Layers } from 'lucide-react'

interface JourneyPageClientProps {
  initialProduct: string
  initialCategory?: string
  initialBrand?: string
  initialScanId?: string
  initialStandard?: string
}

const TEST_SCENARIOS = [
  {
    label: 'Stainless Steel Water Bottle',
    category: 'Mechanical & Consumer Goods',
    description: 'Domestic & commercial vacuum flasks under DPIIT Insulated Containers QCO',
  },
  {
    label: 'Vim Concentrated Gel Dishwash Liquid',
    category: 'Household / Dishwash Gel',
    description: 'Non-mandated consumer packaging (Legal Metrology compliant, voluntary BIS)',
  },
  {
    label: 'Plastic Toys / Infant Rattle',
    category: 'Toys and Play Goods',
    description: 'Mandatory Scheme-I ISI Mark under Toys (Quality Control) Order, 2020',
  },
  {
    label: '65W USB-C Laptop Power Adapter',
    category: 'Electronics & IT Goods',
    description: 'Mandatory Scheme-II CRS Registration under IT Goods Order',
  },
  {
    label: 'Handcrafted Wooden Bookmark',
    category: 'Artisan Crafts',
    description: 'Uncatalogued artisan commodity with insufficient evidence',
  },
]

export function JourneyPageClient({
  initialProduct,
  initialCategory,
  initialBrand,
  initialScanId,
  initialStandard,
}: JourneyPageClientProps) {
  const [productInput, setProductInput] = useState(initialProduct)
  const [categoryInput, setCategoryInput] = useState(initialCategory || '')
  const [brandInput, setBrandInput] = useState(initialBrand || '')
  const [activeScanId, setActiveScanId] = useState(initialScanId || '')
  const [activeStandard, setActiveStandard] = useState(initialStandard || '')

  // Key to force fresh re-mount of BisComplianceJourney when scenario changes
  const [journeyKey, setJourneyKey] = useState(0)

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setActiveScanId('')
    setActiveStandard('')
    setJourneyKey((k) => k + 1)
  }

  const handleScenarioClick = (scenario: (typeof TEST_SCENARIOS)[number]) => {
    setProductInput(scenario.label)
    setCategoryInput(scenario.category)
    setBrandInput('')
    setActiveScanId('')
    setActiveStandard('')
    setJourneyKey((k) => k + 1)
  }

  return (
    <div>
      {/* Search and Scenario Selector Header Card */}
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
        <form onSubmit={handleSearchSubmit}>
          <label
            htmlFor="journey-product-search"
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
            Enter Product or Commodity Name to Trace End-to-End BIS Compliance Pathway
          </label>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <div
              style={{
                flex: '1 1 320px',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '0 14px',
              }}
            >
              <Search size={18} style={{ color: 'var(--text-muted)', marginRight: 10, flexShrink: 0 }} />
              <input
                id="journey-product-search"
                type="text"
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                placeholder="e.g. Stainless Steel Water Bottle, Drinking Water, LED Bulb, Plastic Toy..."
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
            </div>

            <Button type="submit" variant="primary">
              <Sparkles size={16} style={{ marginRight: 6 }} />
              Trace Compliance Journey
            </Button>
          </div>
        </form>

        {/* Quick Scenario Chips */}
        <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            Try Quick Regulatory Scenarios:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TEST_SCENARIOS.map((sc) => (
              <button
                key={sc.label}
                type="button"
                onClick={() => handleScenarioClick(sc)}
                style={{
                  background:
                    productInput === sc.label ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-elevated)',
                  borderColor:
                    productInput === sc.label ? 'var(--brand-500)' : 'var(--border-default)',
                  color:
                    productInput === sc.label ? 'var(--brand-400)' : 'var(--text-secondary)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderRadius: 'var(--radius-md)',
                  padding: '5px 12px',
                  fontSize: 'var(--text-xs)',
                  cursor: 'pointer',
                  fontWeight: productInput === sc.label ? 600 : 500,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Central Visual Pipeline */}
      <BisComplianceJourney
        key={journeyKey}
        initialProductName={productInput}
        initialCategory={categoryInput}
        initialBrand={brandInput}
        initialScanId={activeScanId}
        initialStandardNumber={activeStandard}
      />
    </div>
  )
}
