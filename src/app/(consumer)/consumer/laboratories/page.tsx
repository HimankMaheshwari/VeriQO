import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { AUTHENTIC_LABORATORIES as SAMPLE_LABS } from '@/services/laboratories-service'
import { LaboratoriesDirectoryClient } from './LaboratoriesDirectoryClient'

export const metadata = {
  title: 'Testing Laboratories Directory | VeriQO PS107',
  description: 'Search and locate BIS Central, Regional, and NABL-accredited testing laboratories across India.',
}

interface PageProps {
  searchParams?: Promise<{ q?: string; state?: string }> | { q?: string; state?: string }
}

export default async function LaboratoriesPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {}
  const initialQuery = resolvedParams.q || ''
  const initialState = resolvedParams.state || ''

  return (
    <div>
      <PageHeader
        title="Testing Laboratories Directory"
        description="Locate BIS Central, Regional, and NABL-accredited testing facilities in India authorized for conformity testing of certified commodities."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'Testing Laboratories' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="warning">DEMO SEEDED DATA</Badge>
            <Badge variant="success">Accredited Network</Badge>
            <Badge variant="info">All-India Coverage</Badge>
          </div>
        }
      />

      <LaboratoriesDirectoryClient
        initialLabs={SAMPLE_LABS}
        initialQuery={initialQuery}
        initialState={initialState}
      />
    </div>
  )
}
