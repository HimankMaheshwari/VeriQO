import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { defaultRiskService } from '@/lib/risk/risk-service'
import { CaseAccessError } from '@/lib/cases/types'
import { audit } from '@/lib/audit'

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
        { error: 'Forbidden: Consumers cannot access regulatory risk assessments' },
        { status: 403 }
      )
    }

    const assessment = await defaultRiskService.assessCaseRisk(
      params.id,
      { id: session.user.id, role: session.user.role }
    )

    // Optional audit log for risk assessment generation/viewing
    await audit({
      userId: session.user.id,
      action: 'ADMIN_ACTION',
      entityType: 'RiskAssessment',
      entityId: params.id,
      metadata: {
        score: assessment.score,
        level: assessment.level,
        factorsCount: assessment.factors.length,
      },
    })

    return NextResponse.json({ data: assessment })
  } catch (err: any) {
    if (err instanceof CaseAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error(`Error assessing risk for case ${params.id}:`, err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
