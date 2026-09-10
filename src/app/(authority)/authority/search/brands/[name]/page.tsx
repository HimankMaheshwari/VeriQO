import React from 'react'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { defaultAuthoritySearchService } from '@/lib/search/search-service'
import { EntityInvestigationClient } from '../../EntityInvestigationClient'

export const metadata = { title: 'Brand Regulatory Profile | VeriQO Authority' }

export default async function BrandInvestigationPage({
  params,
}: {
  params: { name: string }
}) {
  const session = await auth()
  if (!session) notFound()

  const allowedRoles = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN']
  if (!allowedRoles.includes(session.user.role)) {
    notFound()
  }

  const decodedName = decodeURIComponent(params.name)
  const summary = await defaultAuthoritySearchService.getBrandInvestigation(
    decodedName,
    { id: session.user.id, role: session.user.role as any }
  )

  if (!summary) {
    notFound()
  }

  return (
    <div>
      <PageHeader
        title="Brand Regulatory Profile"
        description={`Historical regulatory footprint and compliance record for ${decodedName}`}
        breadcrumbs={[
          { label: 'Search & Investigation', href: '/authority/search' },
          { label: 'Brands', href: '/authority/search?type=BRAND' },
          { label: decodedName },
        ]}
      />

      <EntityInvestigationClient entity={summary} />
    </div>
  )
}
