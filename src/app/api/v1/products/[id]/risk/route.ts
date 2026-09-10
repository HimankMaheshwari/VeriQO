import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { defaultRiskService } from '@/lib/risk/risk-service'
import { CaseAccessError } from '@/lib/cases/types'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'CONSUMER') {
      return NextResponse.json(
        { error: 'Forbidden: Consumers cannot access commodity risk assessments' },
        { status: 403 }
      )
    }

    const assessment = await defaultRiskService.assessProductRisk(
      params.id,
      { id: session.user.id, role: session.user.role }
    )

    return NextResponse.json({ data: assessment })
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error(`Error assessing risk for product ${params.id}:`, err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
