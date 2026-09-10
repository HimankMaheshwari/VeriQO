/**
 * GET & POST /api/v1/inspections/[id]/evidence — Evidence Management & Traceability
 */

import { requireRole, ok, badRequest, notFound, serverError, getIp } from '@/lib/api-helpers'
import { defaultInspectionService, InspectionAccessError } from '@/lib/inspections/inspection-service'
import { defaultEvidenceService, EvidenceValidationError } from '@/lib/inspections/evidence-service'
import { z } from 'zod'
import type { EvidenceType } from '@prisma/client'

const evidenceTypes: [EvidenceType, ...EvidenceType[]] = [
  'SCAN_IMAGE',
  'EXTRACTED_TEXT',
  'ONLINE_SOURCE',
  'OFFICER_NOTE',
  'OFFICER_OBSERVATION',
  'FIELD_MEASUREMENT',
  'COMPLIANCE_FINDING',
  'ONLINE_DISCREPANCY',
]

const evidenceSchema = z.object({
  type: z.enum(evidenceTypes),
  title: z.string().max(255).optional().nullable(),
  source: z.string().max(255).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  confidence: z.number().min(0).max(1).optional().default(1.0),
  scanImageId: z.string().optional().nullable(),
  extractedDeclarationId: z.string().optional().nullable(),
  onlineVerificationId: z.string().optional().nullable(),
  complianceCheckId: z.string().optional().nullable(),
  violationId: z.string().optional().nullable(),
  onlineDiscrepancyId: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as EvidenceType | null
    const complianceCheckId = searchParams.get('complianceCheckId') || undefined
    const violationId = searchParams.get('violationId') || undefined
    const onlineDiscrepancyId = searchParams.get('onlineDiscrepancyId') || undefined

    const evidenceList = await defaultEvidenceService.getInspectionEvidence(
      params.id,
      { id: session.user.id, role: session.user.role },
      {
        type: type ?? undefined,
        complianceCheckId,
        violationId,
        onlineDiscrepancyId,
      }
    )

    return ok(evidenceList)
  } catch (err: any) {
    console.error('Inspection evidence GET error:', err)
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    return serverError(err.message || 'Error fetching inspection evidence')
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const body = await request.json()
    const parse = evidenceSchema.safeParse(body)
    if (!parse.success) {
      return badRequest(parse.error.issues[0]?.message ?? 'Invalid evidence input')
    }

    const evidence = await defaultInspectionService.attachEvidence(
      params.id,
      { id: session.user.id, role: session.user.role },
      parse.data,
      getIp(request)
    )

    return ok(evidence)
  } catch (err: any) {
    console.error('Inspection evidence POST error:', err)
    if (err instanceof EvidenceValidationError) {
      return badRequest(err.message)
    }
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    return serverError(err.message || 'Error attaching evidence')
  }
}
