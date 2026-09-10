import React from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { canUserAccessInspection } from '@/lib/inspections/types'
import { AuthorityScanClient } from './AuthorityScanClient'

export const metadata = {
  title: 'Authority Product Scanner | VeriQO',
  description: 'Statutory on-site packaged commodity scanning and compliance analysis for Legal Metrology officers.',
}

export default async function AuthorityScanPage({
  searchParams,
}: {
  searchParams: { inspectionId?: string }
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const userRole = session.user.role
  const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(userRole)
  if (!isAuthority) {
    redirect('/unauthorized')
  }

  let linkedInspection = null
  if (searchParams.inspectionId) {
    const inspection = await prisma.inspection.findUnique({
      where: { id: searchParams.inspectionId },
      include: {
        product: true,
        officer: { select: { id: true, name: true, role: true } },
      },
    })

    if (!inspection) {
      notFound()
    }

    if (!canUserAccessInspection(userRole as any, session.user.id, inspection.officerId)) {
      notFound()
    }

    linkedInspection = {
      id: inspection.id,
      title: inspection.title ?? 'Statutory Commodity Inspection',
      status: inspection.status,
      officerName: inspection.officer.name,
      officerId: inspection.officerId,
      productId: inspection.productId,
      productName: inspection.product?.name ?? null,
      createdAt: inspection.createdAt.toISOString(),
    }
  }

  // Fetch recent active inspections owned by this officer (or all if senior authority/admin)
  const activeInspections = await prisma.inspection.findMany({
    where: {
      status: { in: ['DRAFT', 'IN_PROGRESS'] },
      ...(userRole === 'AUTHORITY_OFFICER' ? { officerId: session.user.id } : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      product: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 15,
  })

  const serializedActiveInspections = activeInspections.map((ins) => ({
    id: ins.id,
    title: ins.title ?? 'Inspection File',
    status: ins.status,
    productName: ins.product?.name ?? null,
    updatedAt: ins.updatedAt.toISOString(),
  }))

  return (
    <AuthorityScanClient
      initialInspection={linkedInspection}
      activeInspections={serializedActiveInspections}
      userRole={userRole}
    />
  )
}
