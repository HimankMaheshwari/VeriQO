/**
 * POST /api/v1/bis/verify/crs
 * Verify a BIS Scheme-II Compulsory Registration Scheme (CRS) number.
 */

import { requireAuth, ok, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { defaultBisLicenseService } from '@/lib/bis/license-service'
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

  const registrationNumber = body.registrationNumber || body.licenseNumber
  if (!registrationNumber || typeof registrationNumber !== 'string' || !registrationNumber.trim()) {
    return badRequest('Registration number (registrationNumber) is required (e.g. R-41009876)')
  }

  const brand = typeof body.brand === 'string' ? body.brand.trim() : undefined

  try {
    const result = await defaultBisLicenseService.verifyCrs({
      registrationNumber: registrationNumber.trim(),
      brand,
    })

    // Audit CRS verification
    await audit({
      userId: session.user.id,
      action: 'BIS_LICENSE_VERIFIED',
      entityType: 'BisLicense',
      entityId: result.licenseNumber,
      metadata: {
        licenseType: 'CRS_REGISTRATION',
        registrationNumber: result.licenseNumber,
        isValid: result.isValid,
        status: result.status,
        standardNumber: result.standardNumber || null,
        isDemoRecord: result.isDemoRecord,
      },
      ipAddress: getIp(request),
    })

    return ok(result)
  } catch (err: unknown) {
    console.error('CRS verification error:', err)
    return serverError('Internal error verifying CRS registration')
  }
}
