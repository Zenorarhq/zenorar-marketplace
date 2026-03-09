// Gift Card Provider Sync Service
// Syncs products from all configured gift card providers

import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { reloadlyProvider } from './providers/reloadly'
import { tangoProvider } from './providers/tango'
import { ezPinProvider } from './providers/ezpin'
import type { ProviderProduct, GiftCardProvider } from './types'

interface SyncResult {
  provider: string
  success: boolean
  synced: number
  updated: number
  errors: string[]
}

type ProviderName = 'reloadly' | 'tango' | 'ezpin'

const providerMap: Record<ProviderName, GiftCardProvider> = {
  reloadly: reloadlyProvider,
  tango: tangoProvider,
  ezpin: ezPinProvider
}

/**
 * Sync products from a provider to the database
 */
async function syncProductsToDb(
  providerName: ProviderName,
  products: ProviderProduct[]
): Promise<{ synced: number; updated: number; errors: string[] }> {
  let synced = 0
  let updated = 0
  const errors: string[] = []

  for (const product of products) {
    try {
      // Generate slug from brand name
      const slug = product.brand
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Check if product already exists
      const existing = await query(
        `SELECT id FROM gift_cards
         WHERE provider = $1 AND provider_product_id = $2`,
        [providerName, product.productId]
      )

      if (existing.rows.length > 0) {
        // Update existing
        await query(
          `UPDATE gift_cards
           SET brand = $1,
               category = $2,
               description = $3,
               image_url = $4,
               denominations = $5,
               min_custom_amount = $6,
               max_custom_amount = $7,
               discount_percent = $8,
               is_active = true,
               updated_at = NOW()
           WHERE id = $9`,
          [
            product.brand,
            product.category,
            product.description,
            product.imageUrl,
            JSON.stringify(product.denominations),
            product.minAmount,
            product.maxAmount,
            product.discountPercent || 0,
            existing.rows[0].id
          ]
        )
        updated++
      } else {
        // Check if slug exists
        const slugCheck = await query(
          `SELECT id FROM gift_cards WHERE slug = $1`,
          [slug]
        )

        const finalSlug = slugCheck.rows.length > 0
          ? `${slug}-${providerName}-${product.productId}`
          : slug

        // Insert new
        await query(
          `INSERT INTO gift_cards
             (brand, slug, category, description, image_url, denominations,
              min_custom_amount, max_custom_amount, discount_percent,
              provider, provider_product_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
          [
            product.brand,
            finalSlug,
            product.category,
            product.description,
            product.imageUrl,
            JSON.stringify(product.denominations),
            product.minAmount,
            product.maxAmount,
            product.discountPercent || 0,
            providerName,
            product.productId
          ]
        )
        synced++
      }
    } catch (err: any) {
      errors.push(`${product.brand}: ${err.message}`)
    }
  }

  return { synced, updated, errors }
}

/**
 * Sync gift cards from Reloadly
 */
async function syncFromReloadly(countryCode: string = 'US'): Promise<SyncResult> {
  const result: SyncResult = {
    provider: 'reloadly',
    success: false,
    synced: 0,
    updated: 0,
    errors: []
  }

  try {
    // Test connection first
    const connectionTest = await reloadlyProvider.testConnection()
    if (!connectionTest.success) {
      result.errors.push(`Reloadly connection failed: ${connectionTest.error || 'Not configured'}`)
      return result
    }

    // Get products from Reloadly
    const products = await reloadlyProvider.getProducts(countryCode)

    if (products.length === 0) {
      result.errors.push('No products returned from Reloadly')
      return result
    }

    const dbResult = await syncProductsToDb('reloadly', products)
    result.synced = dbResult.synced
    result.updated = dbResult.updated
    result.errors.push(...dbResult.errors)
    result.success = true
  } catch (error: any) {
    result.errors.push(error.message)
  }

  return result
}

/**
 * Sync gift cards from Tango Card
 */
async function syncFromTango(countryCode: string = 'US'): Promise<SyncResult> {
  const result: SyncResult = {
    provider: 'tango',
    success: false,
    synced: 0,
    updated: 0,
    errors: []
  }

  try {
    // Get products from Tango
    const products = await tangoProvider.getProducts()

    if (products.length === 0) {
      result.errors.push('No products returned from Tango Card (not configured or no products)')
      return result
    }

    const dbResult = await syncProductsToDb('tango', products)
    result.synced = dbResult.synced
    result.updated = dbResult.updated
    result.errors.push(...dbResult.errors)
    result.success = true
  } catch (error: any) {
    result.errors.push(error.message)
  }

  return result
}

/**
 * Sync gift cards from EZ Pin
 */
async function syncFromEzPin(countryCode: string = 'US'): Promise<SyncResult> {
  const result: SyncResult = {
    provider: 'ezpin',
    success: false,
    synced: 0,
    updated: 0,
    errors: []
  }

  try {
    // Get products from EZ Pin
    const products = await ezPinProvider.getProducts()

    if (products.length === 0) {
      result.errors.push('No products returned from EZ Pin (not configured or no products)')
      return result
    }

    const dbResult = await syncProductsToDb('ezpin', products)
    result.synced = dbResult.synced
    result.updated = dbResult.updated
    result.errors.push(...dbResult.errors)
    result.success = true
  } catch (error: any) {
    result.errors.push(error.message)
  }

  return result
}

/**
 * Check which gift card providers are enabled
 */
async function getEnabledProviders(): Promise<ProviderName[]> {
  try {
    // Settings are saved under 'api' group by admin settings page
    const settings = await getSiteSettingsByGroup('api')
    const enabled: ProviderName[] = []

    // Check Reloadly - using new split credential fields or legacy fields
    if (settings.reloadlyEnabled === true || settings.reloadlyEnabled === 'true' ||
        settings.reloadlySandboxClientId || settings.reloadlyProductionClientId ||
        settings.reloadlyClientId) {
      enabled.push('reloadly')
    }

    // Check Tango - using new split credential fields or legacy fields
    if (settings.tangoEnabled === true || settings.tangoEnabled === 'true' ||
        settings.tangoSandboxPlatformName || settings.tangoProductionPlatformName ||
        settings.tangoPlatformName) {
      enabled.push('tango')
    }

    // Check EZ Pin - using new split credential fields or legacy fields
    if (settings.ezpinEnabled === true || settings.ezpinEnabled === 'true' ||
        settings.ezpinSandboxApiKey || settings.ezpinProductionApiKey ||
        settings.ezpinApiKey) {
      enabled.push('ezpin')
    }

    return enabled
  } catch {
    // Default to checking env vars
    const enabled: ProviderName[] = []
    if (process.env.RELOADLY_CLIENT_ID && process.env.RELOADLY_CLIENT_SECRET) {
      enabled.push('reloadly')
    }
    if (process.env.TANGO_PLATFORM_NAME && process.env.TANGO_PLATFORM_KEY) {
      enabled.push('tango')
    }
    if (process.env.EZPIN_API_KEY && process.env.EZPIN_API_SECRET) {
      enabled.push('ezpin')
    }
    return enabled
  }
}

/**
 * Sync from all enabled gift card providers
 */
export async function syncAllGiftCardProviders(countryCode: string = 'US'): Promise<{
  success: boolean
  results: SyncResult[]
  totalSynced: number
  totalUpdated: number
}> {
  const enabledProviders = await getEnabledProviders()
  const results: SyncResult[] = []
  let totalSynced = 0
  let totalUpdated = 0

  for (const providerName of enabledProviders) {
    let result: SyncResult

    switch (providerName) {
      case 'reloadly':
        result = await syncFromReloadly(countryCode)
        break
      case 'tango':
        result = await syncFromTango(countryCode)
        break
      case 'ezpin':
        result = await syncFromEzPin(countryCode)
        break
      default:
        result = {
          provider: providerName,
          success: false,
          synced: 0,
          updated: 0,
          errors: [`Provider ${providerName} sync not implemented`]
        }
    }

    results.push(result)
    totalSynced += result.synced
    totalUpdated += result.updated
  }

  return {
    success: results.some(r => r.success),
    results,
    totalSynced,
    totalUpdated
  }
}

/**
 * Sync from a specific gift card provider
 */
export async function syncGiftCardProvider(providerName: string, countryCode: string = 'US'): Promise<SyncResult> {
  switch (providerName) {
    case 'reloadly':
      return syncFromReloadly(countryCode)
    case 'tango':
      return syncFromTango(countryCode)
    case 'ezpin':
      return syncFromEzPin(countryCode)
    default:
      return {
        provider: providerName,
        success: false,
        synced: 0,
        updated: 0,
        errors: [`Provider ${providerName} not supported`]
      }
  }
}

export const giftCardSyncService = {
  syncAll: syncAllGiftCardProviders,
  syncProvider: syncGiftCardProvider,
  getEnabledProviders
}
