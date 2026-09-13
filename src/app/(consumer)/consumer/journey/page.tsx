import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { JourneyPageClient } from './JourneyPageClient'

export const metadata = {
  title: 'BIS Compliance Journey | VeriQO PS107',
  description:
    'End-to-end BIS regulatory journey: Product identification, applicable Indian Standards, QCO orders, certification schemes, testing parameters, and accredited laboratories.',
}

interface JourneyPageProps {
  searchParams?: {
    product?: string
    category?: string
    brand?: string
    scanId?: string
    standard?: string
  }
}

export default function BisComplianceJourneyPage({ searchParams }: JourneyPageProps) {
  const initialProduct = searchParams?.product || (searchParams?.scanId ? '' : 'Stainless Steel Water Bottle')
  const initialCategory = searchParams?.category
  const initialBrand = searchParams?.brand
  const initialScanId = searchParams?.scanId
  const initialStandard = searchParams?.standard

  return (
    <div>
      <PageHeader
        title="BIS Compliance Journey"
        description="End-to-end regulatory pathway: from product identity to Indian Standards, mandatory QCO orders, certification schemes, required testing, and accredited laboratories."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'Compliance Journey' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="info">7-Step Unified Pipeline</Badge>
            <Badge variant="success">Source Grounded</Badge>
          </div>
        }
      />

      <JourneyPageClient
        initialProduct={initialProduct}
        initialCategory={initialCategory}
        initialBrand={initialBrand}
        initialScanId={initialScanId}
        initialStandard={initialStandard}
      />
    </div>
  )
}
