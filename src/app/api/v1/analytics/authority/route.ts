import { requireRole, ok, serverError } from '@/lib/api-helpers'
import { defaultAnalyticsService } from '@/lib/inspections/analytics-service'

export async function GET(_request: Request) {
  const session = await requireRole(['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'])
  if (session instanceof Response) return session

  try {
    const analytics = await defaultAnalyticsService.getAuthorityAnalytics({
      id: session.user.id,
      role: session.user.role,
    })

    return ok(analytics)
  } catch (err: any) {
    console.error('Authority analytics error:', err)
    return serverError('Failed to aggregate authority analytics')
  }
}
