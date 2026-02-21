import { NextRequest, NextResponse } from 'next/server'
import { getSiteSetting } from '@/lib/db-helpers'

/**
 * GET /api/payments/paystack/config
 * Returns Paystack public key for client-side initialization
 */
export async function GET(request: NextRequest) {
  try {
    const mode = (await getSiteSetting('paystackMode')) || 'test'
    const publicKey = mode === 'live'
      ? await getSiteSetting('paystackLivePublicKey')
      : await getSiteSetting('paystackTestPublicKey')

    if (!publicKey) {
      return NextResponse.json({
        success: false,
        error: 'Paystack is not configured',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        publicKey,
        mode,
      },
    })
  } catch (error: any) {
    console.error('Paystack config error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get Paystack config' },
      { status: 500 }
    )
  }
}
