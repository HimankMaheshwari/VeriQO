import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { StandardsDiscoveryClient } from '@/components/standards/StandardsDiscoveryClient'

export const metadata = {
  title: 'Indian Standards Directory | VeriQO PS107',
  description:
    'Search and browse Indian Standards (IS codes), mandatory Quality Control Orders (QCOs), testing specifications, and accredited laboratories.',
}

export default function StandardsPage() {
  return (
    <div>
      <PageHeader
        title="Indian Standards Directory"
        description="Search, explore, and verify Bureau of Indian Standards (BIS) specifications, mandatory Quality Control Orders (QCOs), and conformity testing requirements."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'Indian Standards' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="info">20,000+ Standards</Badge>
            <Badge variant="warning">QCO Enforced</Badge>
          </div>
        }
      />

      {/* Main Interactive Standards Discovery Experience */}
      <StandardsDiscoveryClient />
    </div>
  )
}
