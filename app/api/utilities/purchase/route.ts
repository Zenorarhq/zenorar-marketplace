export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { zenditUtilityProvider } from '@/lib/utilities/provider'

/**
 * POST /api/utilities/purchase
 * Purchase a utility/data top-up
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { offerId, recipientPhone, value } = body

    if (!offerId || !recipientPhone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: offerId, recipientPhone' },
        { status: 400 }
      )
    }

    const result = await zenditUtilityProvider.purchase({
      offerId,
      recipientPhone,
      value,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        status: result.status,
      },
    })
  } catch (error: any) {
    console.error('Error purchasing utility:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process purchase' },
      { status: 500 }
    )
  }
}
