export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { pricingService } from '@/lib/virtual-numbers/pricing'

/**
 * GET /api/virtual-numbers/pricing
 * Get calculated prices for virtual numbers
 * Public endpoint - no auth required
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const countryCode = searchParams.get('country') || 'US'
    const numberType = searchParams.get('type') || 'local'

    // Calculate prices based on settings and provider costs
    const prices = await pricingService.calculatePrices(countryCode, numberType)

    // Format for frontend consumption
    const formattedPrices = {
      basic: [
        {
          duration: 1,
          label: '24 Hours',
          price: prices.basic.day1.price,
          smsLimit: prices.basic.day1.smsLimit,
        },
        {
          duration: 7,
          label: '7 Days',
          price: prices.basic.day7.price,
          smsLimit: prices.basic.day7.smsLimit,
        },
        {
          duration: 30,
          label: '30 Days',
          price: prices.basic.day30.price,
          smsLimit: prices.basic.day30.smsLimit,
        },
      ],
      business: [
        {
          duration: 1,
          label: '24 Hours',
          price: prices.business.day1.price,
          features: prices.business.day1.features,
        },
        {
          duration: 7,
          label: '7 Days',
          price: prices.business.day7.price,
          features: prices.business.day7.features,
        },
        {
          duration: 30,
          label: '30 Days',
          price: prices.business.day30.price,
          features: prices.business.day30.features,
        },
      ],
      minuteTiers: prices.minuteTiers,
      startingPrice: prices.basic.day1.price,
      currency: prices.currency,
    }

    return NextResponse.json({
      success: true,
      data: formattedPrices,
    })
  } catch (error: any) {
    console.error('Error getting virtual number pricing:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get pricing' },
      { status: 500 }
    )
  }
}
