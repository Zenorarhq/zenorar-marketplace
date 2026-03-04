// Gift Card Provider Sync Service
// Syncs products from all configured gift card providers

import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { reloadlyProvider } from './providers/reloadly'

interface SyncResult {
  provider: string
  success: boolean
  synced: number
  updated: number
  errors: string[]
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
           WHERE provider = 'reloadly' AND provider_product_id = $1`,
          [product.productId]
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
          result.updated++
        } else {
          // Check if slug exists
          const slugCheck = await query(
            `SELECT id FROM gift_cards WHERE slug = $1`,
            [slug]
          )

          const finalSlug = slugCheck.rows.length > 0
            ? `${slug}-${product.productId}`
            : slug

          // Insert new
          await query(
            `INSERT INTO gift_cards
               (brand, slug, category, description, image_url, denominations,
                min_custom_amount, max_custom_amount, discount_percent,
                provider, provider_product_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'reloadly', $10, true)`,
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
              product.productId
            ]
          )
          result.synced++
        }
      } catch (err: any) {
        result.errors.push(`${product.brand}: ${err.message}`)
      }
    }

    result.success = true
  } catch (error: any) {
    result.errors.push(error.message)
  }

  return result
}

/**
 * Check which gift card providers are enabled
 */
async function getEnabledProviders(): Promise<string[]> {
  try {
    const settings = await getSiteSettingsByGroup('gift-cards')
    const enabled: string[] = []

    if (settings.reloadlyEnabled === true || settings.reloadlyEnabled === 'true') {
      enabled.push('reloadly')
    }

    if (settings.tangoEnabled === true || settings.tangoEnabled === 'true') {
      enabled.push('tango')
    }

    if (settings.ezpinEnabled === true || settings.ezpinEnabled === 'true') {
      enabled.push('ezpin')
    }

    return enabled
  } catch {
    // Default to checking env vars
    const enabled: string[] = []
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
      // Add other providers here when implemented
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
