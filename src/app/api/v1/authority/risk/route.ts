import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { defaultRiskService } from '@/lib/risk/risk-service'
import { CaseAccessError } from '@/lib/cases/types'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'CONSUMER') {
      return NextResponse.json(
        { error: 'Forbidden: Consumers cannot access authority risk intelligence' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const level = searchParams.get('level') as any
    const status = searchParams.get('status') || undefined
    const sortBy = (searchParams.get('sortBy') as any) || 'score'
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc'
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1
    const pageSize = searchParams.get('pageSize')
      ? parseInt(searchParams.get('pageSize')!, 10)
      : 20

    const queueData = await defaultRiskService.getRiskQueue(
      { id: session.user.id, role: session.user.role },
      {
        level: level && level !== 'ALL' ? level : undefined,
        status: status && status !== 'ALL' ? status : undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      }
    )

    return NextResponse.json({ data: queueData })
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error('Error fetching risk queue:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
