/**
 * POST /api/v1/bis/scans/[id]/standards-check
 * GET  /api/v1/bis/scans/[id]/standards-check
 *
 * Runs additive BIS & Indian Standards packaging verification over an existing ProductScan.
 *
 * SAFEGUARDS:
 * 1. Requires valid user session (401).
 * 2. Enforces ownership or authority RBAC (403).
 * 3. Consumes existing scan/OCR/declaration data — ZERO duplicate OCR.
 * 4. Preserves existing Legal Metrology (LMPC) compliance findings.
 * 5. Returns structured BIS findings with clear demo-data disclosures.
 * 6. Sanitized error handling with zero internal leakage.
 */

import { requireAuth, ok, notFound, forbidden, serverError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { defaultUnifiedInspectionService } from '@/lib/bis/inspection/unified-inspection-service'

interface RouteParams {
  params: { id: string }
}

async function handleStandardsCheck(request: Request, scanId: string) {
  // 1. Authenticate user
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    // 2. Load existing scan record with its extracted declarations and images
    const scan = await prisma.productScan.findUnique({
      where: { id: scanId },
      include: {
        images: true,
        extractedDeclarations: true,
        product: true,
        inspections: {
          include: {
            complianceChecks: true,
            violations: true,
          },
        },
      },
    })

    if (!scan) {
      return notFound('Scan not found')
    }

    // 3. Enforce scan ownership or authority role
    const isAuthority = ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'].includes(
      session.user.role
    )
    if (!isAuthority && scan.userId !== session.user.id) {
      return forbidden('You do not have permission to access or verify this scan')
    }

    // 4. Run additive dual-domain packaging verification (reusing existing OCR & declarations)
    const result = await defaultUnifiedInspectionService.evaluateScan({
      id: scan.id,
      rawOcrText: scan.rawOcrText,
      identifiedProductName: scan.identifiedProductName,
      identifiedBrand: scan.identifiedBrand,
      identifiedCategory: scan.identifiedCategory,
      identifiedManufacturer: scan.identifiedManufacturer,
      extractedDeclarations: scan.extractedDeclarations,
      images: scan.images,
      inspections: scan.inspections,
    })

    // 5. Audit log check execution
    await audit({
      userId: session.user.id,
      action: 'BIS_STANDARDS_SEARCH',
      entityType: 'ProductScan',
      entityId: scanId,
      metadata: {
        checkType: 'STANDARDS_CHECK',
        bisStatus: result.bis.status,
        overallStatus: result.overall.status,
        findingsCount: result.bis.findings.length,
        isDemoData: result.bis.isDemoData,
      },
    })

    return ok(result, 'BIS packaging standards verification completed successfully')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to execute BIS standards check'
    console.error(`[BIS Standards Check Error] Scan ID ${scanId}:`, err)
    return serverError(message)
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  return handleStandardsCheck(request, params.id)
}

export async function GET(request: Request, { params }: RouteParams) {
  return handleStandardsCheck(request, params.id)
}
