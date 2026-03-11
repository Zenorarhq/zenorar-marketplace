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
        // Check ONLY cards-specific credentials (separate from gift cards)
        configured: !!(
          settings.reloadlyCardsSandboxClientId ||
          settings.reloadlyCardsProductionClientId
        )
      }
    }

    // Get enabled providers from database
    const providers = await getEnabledProviders()

    // Check if Reloadly Cards is enabled and configured (separate from gift cards)
    const reloadlyEnabled =
      settings.reloadlyCardsEnabled === true ||
      settings.reloadlyCardsEnabled === 'true'

    const reloadlyConfigured = !!(
      settings.reloadlyCardsSandboxClientId ||
      settings.reloadlyCardsProductionClientId
    )

    let instantCardOptions: any[] = []
    let reloadlyProvider = providers.find(p => p.provider === 'reloadly')

    // If Reloadly is enabled and configured, fetch instant card options
    if (reloadlyEnabled && reloadlyConfigured) {
      try {
        instantCardOptions = await reloadlyCardsProvider.getInstantCardOptions()
      } catch (err) {
        console.error('Error fetching instant card options:', err)
      }

      // If no reloadly provider in database, create a synthetic one using gift card markup
      if (!reloadlyProvider && instantCardOptions.length > 0) {
        const giftCardMarkup = parseFloat(settings.giftCardMarkupPercent) || 5
        reloadlyProvider = {
          provider: 'reloadly',
          displayName: 'Instant Card',
          cardType: 'instant',
          cardBrand: 'visa',
          isPremium: false,
          creationFee: 0,
          topUpFeePercent: 0,
          instantMarkupPercent: giftCardMarkup,
          minTopUp: 5,
          maxTopUp: 10000,
          minDenomination: 5,
          maxDenomination: 500,
          features: { instant: true },
          isEnabled: true
        }
      }
    }

    // Group providers by card type
    const virtualProviders = providers.filter(p => p.cardType === 'virtual')
    let instantProviders = providers.filter(p => p.cardType === 'instant')

    // Add synthetic reloadly provider if we have instant card options but no DB entry
    if (reloadlyProvider && !instantProviders.find(p => p.provider === 'reloadly') && instantCardOptions.length > 0) {
      instantProviders = [reloadlyProvider as any]
    }

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
          providers: {
            ...providerStatus,
            reloadly: {
              enabled: reloadlyEnabled,
              configured: reloadlyConfigured,
              hasProducts: instantCardOptions.length > 0
            }
          },
          anyVirtualEnabled: providerStatus.sudo.enabled || providerStatus.lithic.enabled,
          // Only mark as enabled if we actually have instant card products
          anyInstantEnabled: reloadlyEnabled && instantCardOptions.length > 0,
          anyConfigured: providerStatus.sudo.configured || providerStatus.lithic.configured || reloadlyConfigured
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
