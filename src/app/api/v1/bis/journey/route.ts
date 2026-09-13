import { NextRequest, NextResponse } from 'next/server'
import { defaultJourneyService } from '@/services/journey-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/bis/journey
 * Evaluates the full end-to-end BIS compliance journey for a given product or scan:
 * PRODUCT → STANDARD → WHY THIS STANDARD → QCO → CERTIFICATION → TESTING → LABORATORY → NEXT ACTION
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { productName, category, brand, scanId, standardNumber, rawOcrText } = body

    if (!productName && !scanId) {
      return NextResponse.json(
        { error: 'Either productName or scanId must be provided to evaluate the compliance journey.' },
        { status: 400 }
      )
    }

    const journeyResult = await defaultJourneyService.evaluateJourney({
      productName: productName || '',
      category,
      brand,
      scanId,
      standardNumber,
      rawOcrText,
    })

    return NextResponse.json({
      success: true,
      data: journeyResult,
    })
  } catch (err: any) {
    console.error('Error evaluating BIS compliance journey:', err)
    return NextResponse.json(
      { error: 'Internal server error while evaluating compliance journey.' },
      { status: 500 }
    )
  }
}
