import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { defaultRiskService } from '@/lib/risk/risk-service'
import { RiskQueueClient } from './RiskQueueClient'
import { ShieldAlert } from 'lucide-react'

export const metadata = {
  title: 'Authority Risk Queue — VeriQO',
  description: 'Investigative prioritization and risk intelligence queue for regulatory cases',
}

export default async function AuthorityRiskPage({
  searchParams,
}: {
  searchParams: {
    level?: string
    status?: string
    sortBy?: 'score' | 'createdAt' | 'priority'
    sortOrder?: 'asc' | 'desc'
    page?: string
  }
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role === 'CONSUMER') {
    redirect('/unauthorized')
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
  }

  const level = searchParams.level as any
  const status = searchParams.status || undefined
  const sortBy = searchParams.sortBy || 'score'
  const sortOrder = searchParams.sortOrder || 'desc'
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1

  const initialQueue = await defaultRiskService.getRiskQueue(user, {
    level: level && level !== 'ALL' ? level : undefined,
    status: status && status !== 'ALL' ? status : undefined,
    sortBy,
    sortOrder,
    page,
    pageSize: 25,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Regulatory Risk & Intelligence Queue"
        description="Deterministic, evidence-grounded risk scoring for investigative dispatch and surveillance prioritization"
        breadcrumbs={[
          { label: 'Authority', href: '/authority/dashboard' },
          { label: 'Risk Queue' },
        ]}
      />

      <RiskQueueClient
        initialData={initialQueue}
        currentFilters={{
          level: level || 'ALL',
          status: status || 'ALL',
          sortBy,
          sortOrder,
          page,
        }}
      />
    </div>
  )
}
