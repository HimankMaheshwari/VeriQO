/**
 * POST /api/v1/authority/scans/[id]/process
 * Authority Product Scanner — Process OCR, AI Extraction & Deterministic Rule Engine
 * Layer 2 RBAC: AUTHORITY_OFFICER, SENIOR_AUTHORITY, ADMIN
 */

import { requireRole, ok, notFound, forbidden, serverError, getIp } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { processScan } from '@/lib/pipeline/process-scan'
import { defaultInspectionService } from '@/lib/inspections/inspection-service'
import { runScanRuleEngine } from '@/lib/rules/rule-engine'
import { canUserAccessInspection } from '@/lib/inspections/types'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const scan = await prisma.productScan.findUnique({
      where: { id: params.id },
      include: {
        inspections: {
          select: { id: true, officerId: true, status: true, productId: true },
        },
      },
    })

    if (!scan) return notFound(`ProductScan with ID "${params.id}" not found`)

    // Validate access to linked inspection(s) if any
    if (scan.inspections.length > 0) {
      for (const ins of scan.inspections) {
        if (!canUserAccessInspection(session.user.role, session.user.id, ins.officerId)) {
          return forbidden('You do not have permission to process scans for this inspection file')
        }
      }
    }

    // 1. Run core OCR extraction & AI package declaration parsing
    const processResult = await processScan(params.id)

    // 2. Deterministic Compliance Evaluation
    let complianceSummary: any = null
    let linkedInspectionData: any = null

    if (scan.inspections.length > 0) {
      const targetInspection = scan.inspections[0]

      // Auto-inherit productId to inspection if not yet set
      if (!targetInspection.productId && processResult.scan.productId) {
        await prisma.inspection.update({
          where: { id: targetInspection.id },
          data: { productId: processResult.scan.productId },
        })
      }

      // If inspection is active, execute statutory compliance analysis
      if (targetInspection.status !== 'CLOSED') {
        complianceSummary = await defaultInspectionService.runComplianceAnalysis(
          targetInspection.id,
          { id: session.user.id, role: session.user.role },
          getIp(request)
        )
      }

      linkedInspectionData = {
        id: targetInspection.id,
        status: targetInspection.status,
      }
    } else {
      // Standalone scan: Compute deterministic rule evaluation preview WITHOUT persisting formal violations
      // (Enforces Constraint 9: Standalone scans must NOT automatically create a formal inspection)
      const dryRunResult = await runScanRuleEngine(params.id, { persist: false })
      complianceSummary = {
        scanId: dryRunResult.scanId,
        inspectionId: null,
        totalRulesEvaluated: dryRunResult.totalEvaluated,
        passedCount: dryRunResult.passedCount,
        warningCount: dryRunResult.warningCount,
        failedCount: dryRunResult.failedCount,
        notApplicableCount: dryRunResult.notApplicableCount,
        reviewCount: dryRunResult.reviewCount,
        results: dryRunResult.results,
        violations: dryRunResult.violations,
        isDryRun: true,
      }
    }

    return ok(
      {
        scan: processResult.scan,
        ocrProvider: processResult.ocrProvider,
        aiProvider: processResult.aiProvider,
        warnings: processResult.warnings,
        compliance: complianceSummary,
        linkedInspection: linkedInspectionData,
      },
      'Authority scan processed and evaluated successfully'
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process authority scan'
    console.error(`Authority scan process error for ${params.id}:`, err)
    return serverError(message)
  }
}
