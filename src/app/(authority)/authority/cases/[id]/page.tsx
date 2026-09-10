import React from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { CaseStatusBadge, CasePriorityBadge } from '@/components/ui/Badge'
import { RiskBadge } from '@/components/risk/RiskBadge'
import { defaultCaseService, CaseAccessError } from '@/lib/cases/case-service'
import { defaultRiskService } from '@/lib/risk/risk-service'
import { CaseDetailClient } from './CaseDetailClient'

export const metadata = { title: 'Regulatory Case File | VeriQO Authority' }

export default async function AuthorityCaseDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session) notFound()

  let caseData: any = null
  let timeline: any[] = []
  let riskAssessment: any = null

  try {
    caseData = await defaultCaseService.getCase(params.id, {
      id: session.user.id,
      role: session.user.role as any,
    })

    if (caseData) {
      timeline = await defaultCaseService.getCaseTimeline(params.id, {
        id: session.user.id,
        role: session.user.role as any,
      })

      riskAssessment = await defaultRiskService.assessCaseRisk(params.id, {
        id: session.user.id,
        role: session.user.role as any,
      })
    }
  } catch (err) {
    if (err instanceof CaseAccessError) notFound()
    throw err
  }

  if (!caseData) notFound()

  // Eligible officers for assignment
  const officers = await prisma.user.findMany({
    where: {
      role: { in: ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY'] },
      isActive: true,
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <PageHeader
        title="Regulatory Case File"
        description={`Docket: #${caseData.caseNumber}`}
        breadcrumbs={[
          { label: 'Cases', href: '/authority/cases' },
          { label: caseData.caseNumber },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {riskAssessment && (
              <RiskBadge level={riskAssessment.level} score={riskAssessment.score} />
            )}
            <CasePriorityBadge priority={caseData.priority} />
            <CaseStatusBadge status={caseData.status} />
          </div>
        }
      />

      <CaseDetailClient
        caseData={caseData}
        timeline={timeline}
        riskAssessment={riskAssessment}
        officers={officers}
        userRole={session.user.role}
        userId={session.user.id}
      />
    </div>
  )
}
