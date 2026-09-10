/**
 * POST /api/v1/upload
 * Upload product images — delegates to StorageService (Layer 2 RBAC enforced here)
 * Phase 1: Saves files, creates ProductScan + ScanImage records
 * Phase 2: Will trigger OCR/AI analysis pipeline
 */

import { requireAuth, ok, badRequest, serverError, getIp } from '@/lib/api-helpers'
import { getStorageService } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  // ── Layer 2 RBAC: re-validate session independently of middleware ──────────
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

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
        return badRequest(`Unsupported file type: ${file.type}`)
      }
      if (file.size > MAX_SIZE) {
        return badRequest(`File "${file.name}" exceeds maximum size of 20MB`)
      }
    }

    const storage = getStorageService()

    // Create scan session
    const scan = await prisma.productScan.create({
      data: {
        userId: session.user.id,
        status: 'PENDING',
      },
    })

    // Upload each file
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

    await audit({
      userId: session.user.id,
      action: 'FILE_UPLOAD',
      entityType: 'ProductScan',
      entityId: scan.id,
      metadata: { imageCount: files.length },
      ipAddress: getIp(request),
    })

    return ok({ scanId: scan.id, images: savedImages.length }, 'Images uploaded successfully')
  } catch (err) {
    console.error('Upload error:', err)
    return serverError('Failed to process upload')
  }
}
