import { NextRequest, NextResponse } from 'next/server'
import { getSiteSetting } from '@/lib/db-helpers'

/**
 * GET /api/payments/stripe/config
 * Returns Stripe publishable key for client-side initialization
 */
export async function GET(request: NextRequest) {
  try {
    const mode = (await getSiteSetting('stripeMode')) || 'test'
    const publishableKey = mode === 'live'
      ? await getSiteSetting('stripeLivePublicKey')
      : await getSiteSetting('stripeTestPublicKey')

    if (!publishableKey) {
      return NextResponse.json({
        success: false,
        error: 'Stripe is not configured',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        publishableKey,
        mode,
      },
    })
  } catch (error: any) {
    console.error('Stripe config error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get Stripe config' },
      { status: 500 }
    )
  }
}
