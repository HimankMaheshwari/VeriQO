/**
 * POST /api/v1/bis/verify/mark
 * Generic BIS mark verification endpoint.
 * Dispatches internally to CML, CRS, or HUID verifier.
 */

import { requireAuth, ok, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { defaultBisLicenseService } from '@/lib/bis/license-service'
import type { LicenseType, LicenseVerificationResult } from '@/types/bis'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  let body: any
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON payload')
  }

  const rawValue = typeof body.value === 'string' ? body.value.trim() : ''
  if (!rawValue) {
    return badRequest('Verification value (value) is required')
  }

  let markType: LicenseType | undefined = body.markType

  // Auto-detect markType if omitted
  if (!markType) {
    if (/^(?:CM\/L-?|CML-?)?\d{7}$/i.test(rawValue)) {
      markType = 'ISI_CML'
    } else if (/^(?:R-?)?\d{8}$/i.test(rawValue)) {
      markType = 'CRS_REGISTRATION'
    } else if (/^(?:HUID:?)?[A-Z0-9]{6}$/i.test(rawValue)) {
      markType = 'HALLMARK_HUID'
    } else {
      return badRequest(
        'Unable to detect markType automatically. Please provide markType: "ISI_CML" | "CRS_REGISTRATION" | "HALLMARK_HUID"'
      )
    }
  }

  try {
    let result: LicenseVerificationResult

    switch (markType) {
      case 'ISI_CML':
        result = await defaultBisLicenseService.verifyCml({
          cmlNumber: rawValue,
          standardNumber: body.standardNumber,
        })
        break

      case 'CRS_REGISTRATION':
        result = await defaultBisLicenseService.verifyCrs({
          registrationNumber: rawValue,
          brand: body.brand,
        })
        break

      case 'HALLMARK_HUID':
        result = await defaultBisLicenseService.verifyHuid({
          huid: rawValue,
        })
        break

      default:
        return badRequest(
          `Unsupported markType "${markType}". Supported types are: "ISI_CML", "CRS_REGISTRATION", "HALLMARK_HUID"`
        )
    }

    // Audit generic mark verification
    await audit({
      userId: session.user.id,
      action: 'BIS_LICENSE_VERIFIED',
      entityType: 'BisLicense',
      entityId: result.licenseNumber,
      metadata: {
        licenseType: result.licenseType,
        licenseNumber: result.licenseNumber,
        isValid: result.isValid,
        status: result.status,
        isDemoRecord: result.isDemoRecord,
      },
      ipAddress: getIp(request),
    })

    return ok(result)
  } catch (err: unknown) {
    console.error('Mark verification error:', err)
    return serverError('Internal error verifying BIS mark')
  }
}
