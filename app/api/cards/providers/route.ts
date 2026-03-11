export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getEnabledProviders } from '@/lib/cards/service'
import { reloadlyCardsProvider } from '@/lib/cards/providers/reloadly-cards'

/**
 * GET /api/cards/providers
 * List all enabled card providers with pricing
 */
export async function GET(request: NextRequest) {
  try {
    const providers = await getEnabledProviders()

    // For Reloadly, also get available instant card denominations
    const reloadlyProvider = providers.find(p => p.provider === 'reloadly')
    let instantCardOptions: any[] = []

    if (reloadlyProvider) {
      instantCardOptions = await reloadlyCardsProvider.getInstantCardOptions()
    }

    // Group providers by card type
    const virtualProviders = providers.filter(p => p.cardType === 'virtual')
    const instantProviders = providers.filter(p => p.cardType === 'instant')

    return NextResponse.json({
      success: true,
      data: {
        virtual: virtualProviders.map(p => ({
          ...p,
          displayName: p.isPremium ? 'Premium Visa' : 'Visa',
          description: p.isPremium
            ? '3D Secure enabled for enhanced security'
            : 'Standard virtual card for online payments'
        })),
        instant: instantProviders.map(p => ({
          ...p,
          displayName: 'Visa', // Or Mastercard based on availability
          description: 'One-time use card, instant delivery',
          denominations: instantCardOptions.map(o => ({
            value: o.denomination,
            totalPrice: o.denomination * (1 + p.instantMarkupPercent / 100),
            brand: o.brand
          }))
        }))
      }
    })
  } catch (error: any) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch providers' },
      { status: 500 }
    )
  }
}
