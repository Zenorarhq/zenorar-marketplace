// Gift Cards Unified Service
// Handles fallback between multiple providers

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { reloadlyProvider } from './providers/reloadly'
import { tangoProvider } from './providers/tango'
import { zenditGiftCardProvider } from './providers/zendit'
import type { GiftCardProvider, ProviderProduct, ProviderPurchaseResult } from './types'

type ProviderName = 'reloadly' | 'tango' | 'zendit'

const providerMap: Record<ProviderName, GiftCardProvider> = {
  reloadly: reloadlyProvider,
  tango: tangoProvider,
  zendit: zenditGiftCardProvider
}

/**
 * Get list of enabled gift card providers in priority order
 */
async function getEnabledProviders(): Promise<ProviderName[]> {
  try {
    const settings = await getSiteSettingsByGroup('api')
    const enabled: ProviderName[] = []

    // Check default provider first (highest priority)
    const defaultProvider = settings.giftCardDefaultProvider as ProviderName

    // Check Reloadly
    const reloadlyEnabled = settings.reloadlyEnabled === true || settings.reloadlyEnabled === 'true'
    const reloadlyHasCreds = settings.reloadlySandboxClientId || settings.reloadlyProductionClientId || settings.reloadlyClientId

    // Check Tango
    const tangoEnabled = settings.tangoEnabled === true || settings.tangoEnabled === 'true'
    const tangoHasCreds = settings.tangoSandboxPlatformName || settings.tangoProductionPlatformName || settings.tangoPlatformName

    // Check Zendit
    const zenditGiftCardsEnabled = settings.zenditGiftCardsEnabled === true || settings.zenditGiftCardsEnabled === 'true'
    const zenditHasCreds = settings.zenditSandboxApiKey || settings.zenditProductionApiKey

    // Add default provider first if enabled
    if (defaultProvider === 'reloadly' && (reloadlyEnabled || reloadlyHasCreds)) {
      enabled.push('reloadly')
    } else if (defaultProvider === 'tango' && (tangoEnabled || tangoHasCreds)) {
      enabled.push('tango')
    } else if (defaultProvider === 'zendit' && (zenditGiftCardsEnabled || zenditHasCreds)) {
      enabled.push('zendit')
    }

    // Add other enabled providers
    if (!enabled.includes('reloadly') && (reloadlyEnabled || reloadlyHasCreds)) {
      enabled.push('reloadly')
    }
    if (!enabled.includes('tango') && (tangoEnabled || tangoHasCreds)) {
      enabled.push('tango')
    }
    if (!enabled.includes('zendit') && (zenditGiftCardsEnabled || zenditHasCreds)) {
      enabled.push('zendit')
    }

    return enabled
  } catch (error) {
    console.error('Error getting enabled providers:', error)
    return []
  }
}

/**
 * Get products with fallback - tries each enabled provider until one returns products
 */
async function getProductsWithFallback(countryCode: string = 'US'): Promise<{
  products: ProviderProduct[]
  provider: ProviderName | null
  errors: string[]
}> {
  const enabledProviders = await getEnabledProviders()
  const errors: string[] = []

  for (const providerName of enabledProviders) {
    try {
      const provider = providerMap[providerName]
      console.log(`[Gift Card Service] Trying provider: ${providerName}`)

      const products = await provider.getProducts(countryCode)

      if (products.length > 0) {
        console.log(`[Gift Card Service] Got ${products.length} products from ${providerName}`)
        return { products, provider: providerName, errors }
      }

      errors.push(`${providerName}: No products returned`)
    } catch (error: any) {
      console.error(`[Gift Card Service] Error from ${providerName}:`, error)
      errors.push(`${providerName}: ${error.message || 'Unknown error'}`)
    }
  }

  console.log('[Gift Card Service] All providers failed or returned no products')
  return { products: [], provider: null, errors }
}

/**
 * Purchase gift card with fallback - tries each enabled provider until purchase succeeds
 */
async function purchaseWithFallback(
  productId: string,
  denomination: number,
  providerProductIds?: Record<ProviderName, string>
): Promise<{
  result: ProviderPurchaseResult
  provider: ProviderName | null
  errors: string[]
}> {
  const enabledProviders = await getEnabledProviders()
  const errors: string[] = []

  for (const providerName of enabledProviders) {
    try {
      const provider = providerMap[providerName]
      console.log(`[Gift Card Service] Trying purchase with provider: ${providerName}`)

      // Use provider-specific product ID if available
      const pid = providerProductIds?.[providerName] || productId

      const result = await provider.purchaseCard(pid, denomination)

      if (result.success) {
        console.log(`[Gift Card Service] Purchase successful with ${providerName}`)
        return { result, provider: providerName, errors }
      }

      // Don't retry on certain errors (insufficient funds, invalid product)
      if (result.error?.toLowerCase().includes('insufficient') ||
          result.error?.toLowerCase().includes('invalid') ||
          result.error?.toLowerCase().includes('not found')) {
        console.log(`[Gift Card Service] ${providerName} returned non-retryable error: ${result.error}`)
        errors.push(`${providerName}: ${result.error}`)
        // Continue to next provider for "not found" but stop for insufficient balance
        if (result.error?.toLowerCase().includes('insufficient')) {
          return { result, provider: providerName, errors }
        }
      } else {
        errors.push(`${providerName}: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error(`[Gift Card Service] Error purchasing from ${providerName}:`, error)
      errors.push(`${providerName}: ${error.message || 'Unknown error'}`)
    }
  }

  console.log('[Gift Card Service] All providers failed to complete purchase')
  return {
    result: {
      success: false,
      error: errors.length > 0 ? errors.join('; ') : 'No enabled providers available'
    },
    provider: null,
    errors
  }
}

/**
 * Check stock with fallback - returns combined stock from all providers
 */
async function checkStockWithFallback(
  productId: string,
  denomination: number,
  providerProductIds?: Record<ProviderName, string>
): Promise<{
  totalStock: number
  byProvider: Record<ProviderName, number>
}> {
  const enabledProviders = await getEnabledProviders()
  const byProvider: Partial<Record<ProviderName, number>> = {}
  let totalStock = 0

  await Promise.all(
    enabledProviders.map(async (providerName) => {
      try {
        const provider = providerMap[providerName]
        const pid = providerProductIds?.[providerName] || productId
        const stock = await provider.checkStock(pid, denomination)
        byProvider[providerName] = stock
        totalStock += stock
      } catch (error) {
        console.error(`[Gift Card Service] Stock check error for ${providerName}:`, error)
        byProvider[providerName] = 0
      }
    })
  )

  return { totalStock, byProvider: byProvider as Record<ProviderName, number> }
}

/**
 * Test all enabled provider connections
 */
async function testAllConnections(): Promise<Record<ProviderName, { success: boolean; mode?: string; error?: string }>> {
  const enabledProviders = await getEnabledProviders()
  const results: Partial<Record<ProviderName, { success: boolean; mode?: string; error?: string }>> = {}

  await Promise.all(
    enabledProviders.map(async (providerName) => {
      try {
        if (providerName === 'reloadly') {
          const testResult = await reloadlyProvider.testConnection()
          results[providerName] = testResult
        } else {
          // For providers without testConnection, try getting products
          const provider = providerMap[providerName]
          const products = await provider.getProducts()
          // Read actual mode from settings
          const settings = await getSiteSettingsByGroup('api')
          let mode = 'live'
          if (providerName === 'tango') {
            mode = (settings.tangoMode === 'sandbox' || settings.tangoSandbox === true || settings.tangoSandbox === 'true') ? 'sandbox' : 'live'
          } else if (providerName === 'zendit') {
            mode = settings.zenditMode === 'sandbox' ? 'sandbox' : 'live'
          }
          results[providerName] = {
            success: products.length > 0,
            mode,
            error: products.length === 0 ? 'No products returned' : undefined
          }
        }
      } catch (error: any) {
        results[providerName] = {
          success: false,
          error: error.message || 'Connection test failed'
        }
      }
    })
  )

  return results as Record<ProviderName, { success: boolean; mode?: string; error?: string }>
}

export const giftCardService = {
  getEnabledProviders,
  getProductsWithFallback,
  purchaseWithFallback,
  checkStockWithFallback,
  testAllConnections,
  providers: providerMap
}
