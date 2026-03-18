export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { zenditTopupProvider } from '@/lib/phone-refills/provider'

/**
 * GET /api/phone-refills/operators
 * List available mobile operators/carriers
 * Optional query: ?country=US
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || undefined

    const operators = await zenditTopupProvider.getOperators(country)

    return NextResponse.json({
      success: true,
      data: operators,
    })
  } catch (error: any) {
    console.error('Error fetching phone refill operators:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch operators' },
      { status: 500 }
    )
  }
}
