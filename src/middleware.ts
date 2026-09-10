import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { Role } from '@/types/auth'

/**
 * Route-level RBAC enforcement — Layer 1 of 2.
 *
 * This middleware runs on EVERY request before any page or API handler.
 * It enforces role-based access based on URL prefix.
 *
 * Layer 2 (API handler level) independently re-validates roles in each route handler.
 * This dual-layer approach ensures unauthorized access is rejected even if middleware
 * is somehow bypassed.
 *
 * Auth flow:
 *  - Public routes: pass through without auth check
 *  - /consumer/*: requires any authenticated user
 *  - /authority/*: requires AUTHORITY_OFFICER, SENIOR_AUTHORITY, or ADMIN
 *  - /admin/*: requires ADMIN only
 *  - /api/v1/*: requires authenticated session; fine-grained role checks in route handlers
 *  - Unauthenticated → redirect to /login
 *  - Wrong role → redirect to /unauthorized (UI) or 403 JSON (API)
 */

const ROLE_HIERARCHY: Record<Role, number> = {
  CONSUMER: 1,
  AUTHORITY_OFFICER: 2,
  SENIOR_AUTHORITY: 3,
  ADMIN: 4,
}

function hasMinimumRole(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole]
}

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const pathname = nextUrl.pathname
  const isApi = pathname.startsWith('/api/v1')

  // ── Public routes — no auth required ──────────────────────────────────────
  const publicRoutes = ['/', '/login', '/register', '/api/auth', '/api/v1/users/register']
  if (publicRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next()
  }

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!session?.user) {
    if (isApi) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const userRole = session.user.role as Role

  // ── Admin portal ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!hasMinimumRole(userRole, 'ADMIN')) {
      return isApi
        ? Response.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/unauthorized', nextUrl.origin))
    }
  }

  // ── Authority portal ──────────────────────────────────────────────────────
  if (pathname.startsWith('/authority')) {
    if (!hasMinimumRole(userRole, 'AUTHORITY_OFFICER')) {
      return isApi
        ? Response.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/unauthorized', nextUrl.origin))
    }
  }

  // ── Consumer portal — any authenticated user ──────────────────────────────
  // (No role restriction here; all authenticated roles can access consumer features)

  // ── API v1 — require authentication (fine-grained checks in handlers) ──────
  if (isApi) {
    // Already confirmed session.user exists above
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
