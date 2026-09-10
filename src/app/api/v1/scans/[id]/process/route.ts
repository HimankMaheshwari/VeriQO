/**
 * POST /api/v1/scans/[id]/process
 * Triggers or re-triggers OCR extraction and AI product identification for a scan.
 */

import { requireAuth, ok, notFound, forbidden, serverError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { processScan } from '@/lib/pipeline/process-scan'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const scan = await prisma.productScan.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    })

    if (!scan) return notFound('Scan not found')

    const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(
      session.user.role
    )
    if (!isAuthority && scan.userId !== session.user.id) {
      return forbidden('You do not have permission to process this scan')
    }

    const result = await processScan(params.id)
    return ok(result, 'Scan processed successfully')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process scan'
    console.error(`Process scan error for ${params.id}:`, err)
    return serverError(message)
  }
}
