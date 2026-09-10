/**
 * API helper utilities for route handlers.
 * Every protected API route must call requireAuth() or requireRole() first.
 * This ensures server-side RBAC is enforced independently of middleware.
 */

import { auth } from '@/lib/auth'
import type { Role } from '@/types/auth'

/** Standard API error response shape */
export interface ApiError {
  error: string
  code?: string
}

/** Standard API success response shape */
export interface ApiResponse<T = unknown> {
  data: T
  message?: string
}

/** Return a 401 JSON response */
export function unauthorized(message = 'Unauthorized'): Response {
  return Response.json({ error: message } satisfies ApiError, { status: 401 })
}

/** Return a 403 JSON response */
export function forbidden(message = 'Forbidden'): Response {
  return Response.json({ error: message } satisfies ApiError, { status: 403 })
}

/** Return a 400 JSON response */
export function badRequest(message: string): Response {
  return Response.json({ error: message } satisfies ApiError, { status: 400 })
}

/** Return a 404 JSON response */
export function notFound(message = 'Not found'): Response {
  return Response.json({ error: message } satisfies ApiError, { status: 404 })
}

/** Return a 500 JSON response */
export function serverError(message = 'Internal server error'): Response {
  return Response.json({ error: message } satisfies ApiError, { status: 500 })
}

/** Return a 200 JSON success response */
export function ok<T>(data: T, message?: string): Response {
  return Response.json({ data, message } satisfies ApiResponse<T>, { status: 200 })
}

/** Return a 201 JSON created response */
export function created<T>(data: T, message?: string): Response {
  return Response.json({ data, message } satisfies ApiResponse<T>, { status: 201 })
}

/**
 * Require an authenticated session.
 * Returns the session or a 401 Response if not authenticated.
 * Pattern: const result = await requireAuth(); if (result instanceof Response) return result;
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) return unauthorized()
  return session
}

/**
 * Require authentication AND one of the specified roles.
 * Returns the session or a 401/403 Response.
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth()
  if (!session?.user) return unauthorized()
  if (!allowedRoles.includes(session.user.role)) return forbidden()
  return session
}

/** Get IP address from a request (best-effort) */
export function getIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
