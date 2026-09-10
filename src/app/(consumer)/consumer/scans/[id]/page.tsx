import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import ScanDetailClient from './ScanDetailClient'

export const metadata = {
  title: 'Scan Detail | VeriQO',
}

export default async function ScanDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  const scan = await prisma.productScan.findUnique({
    where: { id: params.id },
    include: {
      product: true,
      images: {
        orderBy: { uploadedAt: 'asc' },
      },
      extractedDeclarations: {
        orderBy: { fieldName: 'asc' },
      },
      user: {
        select: { id: true, name: true, role: true },
      },
    },
  })

  if (!scan) {
    notFound()
  }

  const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(
    session.user.role
  )
  if (!isAuthority && scan.userId !== session.user.id) {
    notFound()
  }

  // Serialize dates and ensure safe client transfer
  const serializedScan = {
    ...scan,
    createdAt: scan.createdAt.toISOString(),
    updatedAt: scan.updatedAt.toISOString(),
    images: scan.images.map((img) => ({
      ...img,
      uploadedAt: img.uploadedAt.toISOString(),
    })),
    extractedDeclarations: scan.extractedDeclarations.map((d) => ({
      id: d.id,
      fieldName: d.fieldName,
      rawValue: d.rawValue,
      normalizedValue: d.normalizedValue,
      confidence: d.confidence,
      detectionStatus: d.detectionStatus,
      sourceText: d.sourceText,
    })),
  }

  return <ScanDetailClient initialScan={serializedScan} />
}
