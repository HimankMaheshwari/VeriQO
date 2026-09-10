import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SearchClient } from './SearchClient'

export const metadata = {
  title: 'Authority Search & Investigation | VeriQO',
  description:
    'Unified cross-entity search and investigation across cases, complaints, inspections, products, and violations.',
}

export default function AuthoritySearchPage() {
  return (
    <div>
      <PageHeader
        title="Authority Search & Investigation"
        description="Unified discovery and investigation across regulatory cases, consumer complaints, inspections, products, manufacturers, brands, and recorded violations."
      />
      <Suspense
        fallback={
          <div
            style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Loading investigation search...
          </div>
        }
      >
        <SearchClient />
      </Suspense>
    </div>
  )
}
