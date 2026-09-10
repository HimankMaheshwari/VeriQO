import React from 'react'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InspectionStatusBadge,
  AuthorityDecisionBadge,
} from '@/components/ui/Badge'
import { defaultInspectionService, InspectionAccessError } from '@/lib/inspections/inspection-service'
import { defaultEvidenceService } from '@/lib/inspections/evidence-service'
import { InspectionReviewContent } from './InspectionReviewContent'

export const metadata = { title: 'Inspection Detail | VeriQO Authority' }

export default async function InspectionDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) notFound()

  let inspection: any
  let timeline: any[] = []
  try {
    inspection = await defaultInspectionService.getInspection(params.id, {
      id: session.user.id,
      role: session.user.role as any,
    })

    if (inspection) {
      timeline = await defaultEvidenceService.getInspectionTimeline(params.id, {
        id: session.user.id,
        role: session.user.role as any,
      })
    }
  } catch (err) {
    if (err instanceof InspectionAccessError) notFound()
    throw err
  }

  if (!inspection) notFound()

  const scan = inspection.scan
  const productName =
    scan?.identifiedProductName ||
    inspection.product?.name ||
    'Unidentified Commodity'
  const brandName =
    scan?.identifiedBrand || inspection.product?.brand || '—'

  const complianceChecks = inspection.complianceChecks || []
  const violations = inspection.violations || []
  const onlineVerifications = scan?.onlineVerifications || []
  const evidenceList = inspection.evidence || []
  const decision = inspection.decision

  return (
    <div>
      <PageHeader
        title="Inspection File &amp; Regulatory Review"
        description={`Reference: ${inspection.id}`}
        breadcrumbs={[
          { label: 'Inspections', href: '/authority/inspections' },
          { label: inspection.title ?? 'Inspection' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {inspection.case && (
              <Link
                href={`/authority/cases/${inspection.case.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  textDecoration: 'none',
                }}
              >
                <Briefcase size={12} /> Case: #{inspection.case.caseNumber}
              </Link>
            )}
            <InspectionStatusBadge status={inspection.status} />
            {decision && <AuthorityDecisionBadge decision={decision.decision} />}
          </div>
        }
      />

      <InspectionReviewContent
        inspection={inspection}
        productName={productName}
        brandName={brandName}
        scan={scan}
        complianceChecks={complianceChecks}
        violations={violations}
        onlineVerifications={onlineVerifications}
        evidenceList={evidenceList}
        decision={decision}
        userRole={session.user.role}
        initialTimeline={timeline}
      />
    </div>
  )
}
