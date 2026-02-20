import { NextResponse } from 'next/server'
import { getSiteSetting } from '@/lib/db-helpers'

// GET /api/payments/paystack/config
// Returns the Paystack public key (NOT the secret key)
export async function GET() {
  try {
    const mode = (await getSiteSetting('paystackMode')) || 'test'
    const publicKey = mode === 'live'
      ? await getSiteSetting('paystackLivePublicKey')
      : await getSiteSetting('paystackTestPublicKey')

    if (!publicKey) {
      return NextResponse.json(
        { success: false, error: 'Paystack is not configured' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { publicKey },
    })
  } catch (error) {
    console.error('Failed to fetch Paystack config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Paystack config' },
      { status: 500 }
    )
  }
}
