import { requireRole, ok, notFound, serverError, getIp } from '@/lib/api-helpers'
import { defaultInspectionService, InspectionAccessError } from '@/lib/inspections/inspection-service'
import { defaultReportGenerator } from '@/lib/inspections/report-generator'
import { defaultPdfService } from '@/lib/inspections/pdf-service'
import { getStorageService } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    // 1. Verify inspection access via RBAC
    const inspection = await defaultInspectionService.getInspection(params.id, {
      id: session.user.id,
      role: session.user.role,
    })

    if (!inspection) return notFound('Inspection not found')

    // 2. Deterministically assemble report data from persisted DB records
    const reportData = await defaultReportGenerator.assembleReportData(params.id, {
      id: session.user.id,
      role: session.user.role,
    })

    // 3. Generate server-side PDF
    const pdfBuffer = await defaultPdfService.generateInspectionPdf(reportData)

    // 4. Store PDF via StorageService abstraction
    const storageKey = await getStorageService().upload(
      pdfBuffer,
      `reports/${params.id}/${reportData.reportRef}.pdf`,
      'application/pdf'
    )

    // 5. Persist Report record
    const report = await prisma.report.create({
      data: {
        inspectionId: params.id,
        generatedById: session.user.id,
        format: 'PDF',
        storageKey,
        reportRef: reportData.reportRef,
        title: `Official Legal Metrology Inspection Report — ${reportData.inspection.title}`,
        fileSizeBytes: pdfBuffer.length,
        metadata: {
          securityHash: reportData.securityHash,
          complianceChecksCount: reportData.complianceChecks.length,
          violationsCount: reportData.violations.length,
          evidenceCount: reportData.evidenceItems.length,
          decision: reportData.decision?.decision ?? null,
        },
      },
    })

    // 6. Audit log
    await audit({
      userId: session.user.id,
      action: 'REPORT_GENERATED',
      entityType: 'Inspection',
      entityId: params.id,
      metadata: {
        reportId: report.id,
        reportRef: report.reportRef,
        securityHash: reportData.securityHash,
        fileSizeBytes: pdfBuffer.length,
      },
      ipAddress: getIp(request),
    })

    return ok(report, 'Report generated successfully')
  } catch (err: any) {
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    console.error('Report POST error:', err)
    return serverError(err.message || 'Failed to generate report')
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    // 1. Verify inspection access via RBAC
    const inspection = await defaultInspectionService.getInspection(params.id, {
      id: session.user.id,
      role: session.user.role,
    })

    if (!inspection) return notFound('Inspection not found')

    const url = new URL(request.url)
    const reportRef = url.searchParams.get('reportRef')
    const isDownload = url.searchParams.get('download') === 'true'

    const report = await prisma.report.findFirst({
      where: {
        inspectionId: params.id,
        ...(reportRef ? { reportRef } : {}),
      },
      orderBy: { generatedAt: 'desc' },
      include: {
        generatedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    if (!report) {
      return notFound('No generated report found for this inspection')
    }

    if (isDownload) {
      const buffer = await getStorageService().getBuffer(report.storageKey)

      await audit({
        userId: session.user.id,
        action: 'REPORT_DOWNLOADED',
        entityType: 'Report',
        entityId: report.id,
        metadata: {
          reportRef: report.reportRef,
          inspectionId: params.id,
        },
        ipAddress: getIp(request),
      })

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${report.reportRef}.pdf"`,
          'Content-Length': String(buffer.length),
        },
      })
    }

    return ok(report)
  } catch (err: any) {
    if (err instanceof InspectionAccessError) {
      return notFound()
    }
    console.error('Report GET error:', err)
    return serverError('Failed to retrieve report')
  }
}
