export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { zenditTopupProvider } from '@/lib/phone-refills/provider'

/**
 * POST /api/phone-refills/purchase
 * Purchase a mobile top-up via wallet
 * Body: { offerId, recipientPhone, value? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { offerId, recipientPhone, value } = await request.json()

    if (!offerId || !recipientPhone) {
      return NextResponse.json(
        { success: false, error: 'offerId and recipientPhone are required' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic check)
    const cleanPhone = recipientPhone.replace(/[^+\d]/g, '')
    if (cleanPhone.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    const result = await zenditTopupProvider.purchase({
      offerId,
      recipientPhone: cleanPhone,
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
    console.error('Error purchasing phone refill:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process top-up' },
      { status: 500 }
    )
  }
}
