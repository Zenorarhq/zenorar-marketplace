import { NextResponse } from 'next/server'
import { getSiteSetting } from '@/lib/db-helpers'

// GET /api/payments/stripe/config
// Returns the Stripe publishable key (NOT the secret key)
export async function GET() {
  try {
    const mode = (await getSiteSetting('stripeMode')) || 'test'
    const publishableKey = mode === 'live'
      ? await getSiteSetting('stripeLivePublicKey')
      : await getSiteSetting('stripeTestPublicKey')

    if (!publishableKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { publishableKey },
    })
  } catch (error) {
    console.error('Failed to fetch Stripe config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Stripe config' },
      { status: 500 }
    )
  }
}
