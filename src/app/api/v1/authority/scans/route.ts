/**
 * POST /api/v1/authority/scans
 * Authority Product Scanner — Image Upload & Scan Creation
 * Layer 2 RBAC: AUTHORITY_OFFICER, SENIOR_AUTHORITY, ADMIN
 */

import { requireRole, created, badRequest, notFound, forbidden, serverError, getIp } from '@/lib/api-helpers'
import { getStorageService } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { canUserAccessInspection } from '@/lib/inspections/types'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  // Layer 2 RBAC: Authority roles only
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const inspectionIdRaw = formData.get('inspectionId')
    const inspectionId = typeof inspectionIdRaw === 'string' && inspectionIdRaw.trim() ? inspectionIdRaw.trim() : null

    if (!files || files.length === 0) {
      return badRequest('At least one image is required')
    }

    if (files.length > 10) {
      return badRequest('Maximum 10 images per upload')
    }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    const MAX_SIZE = 20 * 1024 * 1024 // 20MB

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return badRequest(`Unsupported file type: ${file.type}. Allowed formats: JPG, PNG, WebP, HEIC`)
      }
      if (file.size > MAX_SIZE) {
        return badRequest(`File "${file.name}" exceeds maximum size of 20MB`)
      }
    }

    // If an inspectionId is provided, validate inspection access and invariants
    let targetInspection = null
    if (inspectionId) {
      targetInspection = await prisma.inspection.findUnique({
        where: { id: inspectionId },
        select: { id: true, officerId: true, status: true },
      })

      if (!targetInspection) {
        return notFound(`Inspection with ID "${inspectionId}" not found`)
      }

      if (!canUserAccessInspection(session.user.role, session.user.id, targetInspection.officerId)) {
        return forbidden('You do not have permission to attach scans to this inspection')
      }

      if (targetInspection.status === 'CLOSED') {
        return badRequest('Cannot attach scans to a closed inspection. The inspection must be reopened first.')
      }
    }

    const storage = getStorageService()

    // 1. Create ProductScan session with officer ownership
    const scan = await prisma.productScan.create({
      data: {
        userId: session.user.id,
        status: 'PENDING',
      },
    })

    // 2. Upload images to StorageService and create ScanImage records
    const savedImages = []
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.name.split('.').pop() ?? 'jpg'
      const key = `scans/${scan.id}/${randomUUID()}.${ext}`
      await storage.upload(buffer, key, file.type)

      const image = await prisma.scanImage.create({
        data: {
          scanId: scan.id,
          storageKey: key,
          originalFilename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      })
      savedImages.push(image)
    }

    // 3. Link scan to target inspection if specified
    if (targetInspection) {
      await prisma.inspection.update({
        where: { id: targetInspection.id },
        data: { scanId: scan.id },
      })

      await audit({
        userId: session.user.id,
        action: 'INSPECTION_UPDATED',
        entityType: 'Inspection',
        entityId: targetInspection.id,
        metadata: {
          scanId: scan.id,
          action: 'SCAN_ATTACHED',
          imageCount: savedImages.length,
        },
        ipAddress: getIp(request),
      })
    }

    // 4. Audit upload action
    await audit({
      userId: session.user.id,
      action: 'FILE_UPLOAD',
      entityType: 'ProductScan',
      entityId: scan.id,
      metadata: {
        imageCount: savedImages.length,
        inspectionId: targetInspection?.id ?? null,
      },
      ipAddress: getIp(request),
    })

    return created(
      {
        scanId: scan.id,
        imagesCount: savedImages.length,
        inspectionId: targetInspection?.id ?? null,
      },
      'Packaging images uploaded successfully'
    )
  } catch (err: unknown) {
    console.error('Authority scan upload error:', err)
    return serverError('Failed to process authority commodity upload')
  }
}
