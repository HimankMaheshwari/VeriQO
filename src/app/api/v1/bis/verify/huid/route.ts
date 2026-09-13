/**
 * POST /api/v1/bis/verify/huid
 * Verify a 6-character Hallmarking Unique Identification (HUID) code.
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

  const rawHuid = body.huid || body.licenseNumber
  if (!rawHuid || typeof rawHuid !== 'string' || !rawHuid.trim()) {
    return badRequest('Hallmarking code (huid) is required (e.g. AB12CD)')
  }

  try {
    const result = await defaultBisLicenseService.verifyHuid({
      huid: rawHuid.trim(),
    })

    // Audit HUID verification
    await audit({
      userId: session.user.id,
      action: 'BIS_LICENSE_VERIFIED',
      entityType: 'BisLicense',
      entityId: result.licenseNumber,
      metadata: {
        licenseType: 'HALLMARK_HUID',
        huid: result.licenseNumber,
        isValid: result.isValid,
        status: result.status,
        isDemoRecord: result.isDemoRecord,
      },
      ipAddress: getIp(request),
    })

    return ok(result)
  } catch (err: unknown) {
    console.error('HUID verification error:', err)
    return serverError('Internal error verifying HUID code')
  }
}
