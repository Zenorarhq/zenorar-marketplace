export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { zenditUtilityProvider } from '@/lib/utilities/provider'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

/**
 * GET /api/utilities/data
 * List available mobile data + bundle operators (merged)
 * Optional query: ?country=US
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || undefined

    const operators = await zenditUtilityProvider.getDataOperators(country)

    // Apply markup
    let markupPercent = 0
    try {
      const markupSettings = await getSiteSettingsByGroup('markup')
      markupPercent = Number(markupSettings.utilityMarkupPercent) || 0
    } catch {
      // Default to no markup
    }

    if (markupPercent > 0) {
      const multiplier = 1 + markupPercent / 100
      for (const operator of operators) {
        for (const offer of operator.offers) {
          const base = offer.cost !== null ? offer.cost : offer.price
          offer.price = Math.round(base * multiplier * 100) / 100
          if (offer.priceMin !== undefined) {
            offer.priceMin = Math.round(offer.priceMin * multiplier * 100) / 100
          }
          if (offer.priceMax !== undefined) {
            offer.priceMax = Math.round(offer.priceMax * multiplier * 100) / 100
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: operators })
  } catch (error: any) {
    console.error('Error fetching data operators:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch operators' },
      { status: 500 }
    )
  }
}
