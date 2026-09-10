import { requireRole, ok, created, notFound, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { defaultCaseService } from '@/lib/cases/case-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!complaint) {
      return notFound(`Complaint with ID ${params.id} not found`)
    }

    // Check if case already exists before getOrCreate
    const existingCase = await prisma.regulatoryCase.findUnique({
      where: { complaintId: params.id },
    })

    const caseRecord = await defaultCaseService.getOrCreateCaseForComplaint(
      params.id,
      getIp(request)
    )

    if (existingCase) {
      return ok(caseRecord, 'Existing regulatory case retrieved')
    }

    return created(caseRecord, 'Regulatory case initiated for complaint')
  } catch (err) {
    console.error('Complaint case intake error:', err)
    return serverError()
  }
}
