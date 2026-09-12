/**
 * POST /api/v1/bis/verify/cml
 * Verify a BIS Scheme-I (ISI Mark) Certification Marks License (CML).
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

  const rawNumber = body.licenseNumber || body.cmlNumber
  if (!rawNumber || typeof rawNumber !== 'string' || !rawNumber.trim()) {
    return badRequest('License number (licenseNumber or cmlNumber) is required')
  }

  const standardNumber = typeof body.standardNumber === 'string' ? body.standardNumber.trim() : undefined

  try {
    const result = await defaultBisLicenseService.verifyCml({
      cmlNumber: rawNumber.trim(),
      standardNumber,
    })

    // Audit license verification
    await audit({
      userId: session.user.id,
      action: 'BIS_LICENSE_VERIFIED',
      entityType: 'BisLicense',
      entityId: result.licenseNumber,
      metadata: {
        licenseType: 'ISI_CML',
        licenseNumber: result.licenseNumber,
        isValid: result.isValid,
        status: result.status,
        standardNumber: result.standardNumber || null,
        isDemoRecord: result.isDemoRecord,
      },
      ipAddress: getIp(request),
    })

    return ok(result)
  } catch (err: unknown) {
    console.error('CML verification error:', err)
    return serverError('Internal error verifying CML license')
  }
}
