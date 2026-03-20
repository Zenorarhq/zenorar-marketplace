export const revalidate = 600 // Cache operators for 10 minutes

import { NextResponse } from 'next/server'
import { zenditTopupProvider } from '@/lib/phone-refills/provider'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

/**
 * GET /api/phone-refills/operators
 * List available mobile operators/carriers
 * Optional query: ?country=US
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country') || undefined

    const operators = await zenditTopupProvider.getOperators(country)

    // Get phone refill markup percentage from settings
    let markupPercent = 0
    try {
      const markupSettings = await getSiteSettingsByGroup('markup')
      markupPercent = Number(markupSettings.phoneRefillMarkupPercent) || 0
    } catch {
      // Default to no markup if settings unavailable
    }

    // Apply markup to all offer prices
    if (markupPercent > 0) {
      const multiplier = 1 + markupPercent / 100
      for (const operator of operators) {
        for (const offer of operator.offers) {
          // Prefer cost (wholesale) as base; fall back to price if cost unavailable
          const base = offer.cost !== null ? offer.cost : offer.price
          offer.price = Math.round(base * multiplier * 100) / 100

          // Apply to range bounds too
          if (offer.priceMin !== undefined) {
            offer.priceMin = Math.round(offer.priceMin * multiplier * 100) / 100
          }
          if (offer.priceMax !== undefined) {
            offer.priceMax = Math.round(offer.priceMax * multiplier * 100) / 100
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: operators,
    })
  } catch (error: any) {
    console.error('Error fetching phone refill operators:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch operators' },
      { status: 500 }
    )
  }
}
