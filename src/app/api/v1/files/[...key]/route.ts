/**
 * GET /api/v1/files/[...key]
 * Securely serves uploaded files from the StorageService.
 * Enforces session authentication and prevents directory traversal.
 */

import { requireAuth, notFound, badRequest, serverError } from '@/lib/api-helpers'
import { getStorageService } from '@/lib/storage'
import path from 'path'

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.pdf': 'application/pdf',
}

export async function GET(
  request: Request,
  { params }: { params: { key: string[] } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const rawKey = params.key?.join('/')
    if (!rawKey) return badRequest('File key is required')

    // Clean key and prevent path traversal
    const normalizedKey = path.normalize(rawKey).replace(/^(\.\.(\/|\\|$))+/, '')
    if (normalizedKey.includes('..')) {
      return badRequest('Invalid file key')
    }

    const storage = getStorageService()
    let buffer: Buffer
    try {
      buffer = await storage.getBuffer(normalizedKey)
    } catch {
      return notFound('File not found')
    }

    const ext = path.extname(normalizedKey).toLowerCase()
    const contentType = MIME_MAP[ext] || 'application/octet-stream'

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('File delivery error:', err)
    return serverError('Failed to serve file')
  }
}
