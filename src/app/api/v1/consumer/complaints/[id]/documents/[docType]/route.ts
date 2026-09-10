/**
 * GET /api/v1/consumer/complaints/[id]/documents/[docType]
 * Streams a consumer-safe official PDF document (Compliance Report or Regulatory Order).
 *
 * Security & IDOR Enforcement:
 * 1. Session authentication required.
 * 2. Strict ownership validation: consumerId must match session.user.id (or Authority/Admin).
 * 3. Unowned complaint returns 404 Not Found to prevent ID enumeration.
 * 4. Status-gated: Returns 403 Forbidden if case is in-flight or lacks finalized decision.
 * 5. Full audit logging for every document download.
 */

import { requireAuth, notFound, forbidden, badRequest, serverError, getIp } from '@/lib/api-helpers'
import {
  defaultConsumerDocumentService,
  ConsumerDocumentAccessError,
  ConsumerDocumentStatusGatedError,
  type ConsumerDocType,
} from '@/lib/consumer/consumer-document-service'
import { audit } from '@/lib/audit'

export async function GET(
  request: Request,
  { params }: { params: { id: string; docType: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  const validDocTypes: ConsumerDocType[] = ['compliance-report', 'regulatory-order']
  if (!validDocTypes.includes(params.docType as ConsumerDocType)) {
    return badRequest(
      `Invalid document type '${params.docType}'. Supported types: ${validDocTypes.join(', ')}`
    )
  }

  const docType = params.docType as ConsumerDocType
  const url = new URL(request.url)
  const isDownload = url.searchParams.get('download') === 'true'

  try {
    const docResult = await defaultConsumerDocumentService.generateDocument(
      params.id,
      docType,
      {
        id: session.user.id,
        role: session.user.role,
      }
    )

    // Audit log
    await audit({
      userId: session.user.id,
      action: 'REPORT_DOWNLOADED',
      entityType: 'Complaint',
      entityId: params.id,
      metadata: {
        documentType: docType,
        documentRef: docResult.documentRef,
        securityHash: docResult.securityHash,
        fileSizeBytes: docResult.buffer.length,
        isDownload,
      },
      ipAddress: getIp(request),
    })

    const disposition = isDownload
      ? `attachment; filename="${docResult.filename}"`
      : `inline; filename="${docResult.filename}"`

    return new Response(new Uint8Array(docResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': docResult.contentType,
        'Content-Disposition': disposition,
        'Content-Length': String(docResult.buffer.length),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    })
  } catch (err: any) {
    if (err instanceof ConsumerDocumentAccessError) {
      return notFound('Complaint not found')
    }
    if (err instanceof ConsumerDocumentStatusGatedError) {
      return forbidden(err.message)
    }
    console.error('Consumer document stream GET error:', err)
    return serverError('Failed to generate official document')
  }
}
