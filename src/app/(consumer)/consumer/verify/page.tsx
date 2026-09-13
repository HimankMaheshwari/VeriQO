import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { BisVerificationClient } from './BisVerificationClient'

export const metadata = {
  title: 'BIS License & Mark Verification | VeriQO PS107',
  description:
    'Verify ISI Marks (CM/L), Compulsory Registration (CRS R-Number), and Gold Hallmarking (HUID) registered with the Bureau of Indian Standards.',
}

export default function BisVerificationPage() {
  return (
    <div>
      <PageHeader
        title="BIS License & Standard Mark Verification"
        description="Verify the statutory authenticity of ISI Marks (Scheme I), CRS Registrations (Scheme II), and Gold/Silver Hallmarking (HUID) registered with the Bureau of Indian Standards."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'BIS Verification' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="success">Official Schemes</Badge>
            <Badge variant="info">All-India Registry</Badge>
          </div>
        }
      />

      <BisVerificationClient />
    </div>
  )
}
