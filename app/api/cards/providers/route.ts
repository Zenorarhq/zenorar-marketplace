export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, getSiteSettingsByGroup } from '@/lib/db-helpers'
import { getEnabledProviders } from '@/lib/cards/service'
import { reloadlyCardsProvider } from '@/lib/cards/providers/reloadly-cards'

/**
 * GET /api/cards/providers
 * List all enabled card providers with pricing and configuration status
 */
export async function GET(request: NextRequest) {
  try {
    // Get all provider pricing info (enabled or not)
    const allPricingResult = await executeQuery<any>(
      'SELECT * FROM card_pricing ORDER BY provider'
    )

    // Get settings to check which providers are enabled
    const settings = await getSiteSettingsByGroup('api')

    // Determine provider status
    const providerStatus = {
      sudo: {
        enabled: settings.sudoCardsEnabled === true || settings.sudoCardsEnabled === 'true',
        configured: !!(settings.sudoSandboxApiKey || settings.sudoProductionApiKey)
      },
      lithic: {
        enabled: settings.lithicCardsEnabled === true || settings.lithicCardsEnabled === 'true',
        configured: !!(settings.lithicSandboxApiKey || settings.lithicProductionApiKey)
      },
      reloadly: {
        enabled: settings.reloadlyCardsEnabled === true || settings.reloadlyCardsEnabled === 'true',
        // Check both dedicated cards settings and shared Reloadly credentials
        configured: !!(
          settings.reloadlySandboxClientId ||
          settings.reloadlyProductionClientId ||
          settings.reloadlyClientId ||
          process.env.RELOADLY_CLIENT_ID
        )
      }
    }

    // Get enabled providers
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

    // Check if any providers exist in the database
    const hasProviderConfig = allPricingResult.rows.length > 0

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
        })),
        status: {
          hasProviderConfig,
          providers: providerStatus,
          anyVirtualEnabled: providerStatus.sudo.enabled || providerStatus.lithic.enabled,
          anyInstantEnabled: providerStatus.reloadly.enabled,
          anyConfigured: providerStatus.sudo.configured || providerStatus.lithic.configured || providerStatus.reloadly.configured
        }
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
