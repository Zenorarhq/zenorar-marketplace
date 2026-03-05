import { NextResponse } from 'next/server'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

// Helper: DB may store JSON booleans, strings, or wrapped values
function isTruthy(val: unknown): boolean {
  if (val === true || val === 'true') return true
  if (typeof val === 'object' && val !== null && 'value' in (val as any)) {
    return isTruthy((val as any).value)
  }
  return false
}

// GET /api/settings/payments - Public endpoint for checkout page
// Returns which payment gateways are enabled (NO secret keys)
export async function GET() {
  try {
    const settings = await getSiteSettingsByGroup('payments')
    console.log('[PAYMENTS DEBUG] Raw settings from DB:', JSON.stringify(settings).slice(0, 500))

    return NextResponse.json({
      success: true,
      data: {
        stripeEnabled: isTruthy(settings.stripeEnabled),
        paystackEnabled: isTruthy(settings.paystackEnabled),
        paypalEnabled: isTruthy(settings.paypalEnabled),
        cryptoEnabled: isTruthy(settings.cryptoEnabled),
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
