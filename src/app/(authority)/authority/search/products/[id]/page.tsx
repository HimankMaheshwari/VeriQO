import React from 'react'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { RiskBadge } from '@/components/risk/RiskBadge'
import { defaultAuthoritySearchService } from '@/lib/search/search-service'
import { defaultRiskService } from '@/lib/risk/risk-service'
import { ProductInvestigationClient } from './ProductInvestigationClient'

export const metadata = { title: 'Product Regulatory Footprint | VeriQO Authority' }

export default async function ProductInvestigationPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session) notFound()

  const allowedRoles = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN']
  if (!allowedRoles.includes(session.user.role)) {
    notFound()
  }

  const [dossier, riskAssessment] = await Promise.all([
    defaultAuthoritySearchService.getProductInvestigation(
      params.id,
      { id: session.user.id, role: session.user.role as any }
    ),
    defaultRiskService.assessProductRisk(
      params.id,
      { id: session.user.id, role: session.user.role as any }
    ).catch(() => null),
  ])

  if (!dossier) {
    notFound()
  }

  return (
    <div>
      <PageHeader
        title="Commodity Regulatory Footprint"
        description={`Historical regulatory footprint and compliance record for ${dossier.product.name}`}
        breadcrumbs={[
          { label: 'Search & Investigation', href: '/authority/search' },
          { label: 'Commodities', href: '/authority/search?type=PRODUCT' },
          { label: dossier.product.name },
        ]}
        actions={
          riskAssessment ? (
            <RiskBadge level={riskAssessment.level} score={riskAssessment.score} size="md" />
          ) : undefined
        }
      />

      <ProductInvestigationClient dossier={dossier} riskAssessment={riskAssessment} />
    </div>
  )
}

