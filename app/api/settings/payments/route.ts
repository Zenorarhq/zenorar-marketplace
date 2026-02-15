import { NextResponse } from 'next/server'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

// GET /api/settings/payments - Public endpoint for checkout page
// Returns which payment gateways are enabled (NO secret keys)
export async function GET() {
  try {
    const settings = await getSiteSettingsByGroup('payments')

    return NextResponse.json({
      success: true,
      data: {
        stripeEnabled: settings.stripeEnabled === true,
        paystackEnabled: settings.paystackEnabled === true,
        paypalEnabled: settings.paypalEnabled === true,
        cryptoEnabled: settings.cryptoEnabled === true,
      },
    })
  } catch (error) {
    console.error('Failed to fetch payment settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment settings' },
      { status: 500 }
    )
  }
}
