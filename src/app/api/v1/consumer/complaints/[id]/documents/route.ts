/**
 * GET /api/v1/consumer/complaints/[id]/documents
 * Lists all available official result documents for a consumer complaint.
 *
 * Security & IDOR Protection:
 * 1. Session authentication required.
 * 2. Strict ownership validation: consumerId must match session.user.id (or Authority/Admin).
 * 3. Unowned complaint returns 404 Not Found to prevent ID enumeration.
 * 4. Status-gated: lists availability status without leaking unfinalized documents.
 */

import { requireAuth, ok, notFound, forbidden, serverError } from '@/lib/api-helpers'
import {
  defaultConsumerDocumentService,
  ConsumerDocumentAccessError,
  ConsumerDocumentStatusGatedError,
} from '@/lib/consumer/consumer-document-service'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (session instanceof Response) return session

  try {
    const documentMeta = await defaultConsumerDocumentService.getAvailableDocuments(
      params.id,
      {
        id: session.user.id,
        role: session.user.role,
      }
    )

    return ok(documentMeta)
  } catch (err: any) {
    if (err instanceof ConsumerDocumentAccessError) {
      return notFound('Complaint not found')
    }
    if (err instanceof ConsumerDocumentStatusGatedError) {
      return forbidden(err.message)
    }
    console.error('Consumer documents GET error:', err)
    return serverError('Failed to retrieve document metadata')
  }
}
