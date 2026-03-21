// Gift Card Provider Sync Service
// Syncs products from all configured gift card providers

import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { reloadlyProvider } from './providers/reloadly'
import { tangoProvider } from './providers/tango'
import { zenditGiftCardProvider } from './providers/zendit'
import type { ProviderProduct, GiftCardProvider } from './types'

/**
 * Get the current mode for a provider from settings
 */
async function getProviderMode(providerName: ProviderName): Promise<'sandbox' | 'live'> {
  try {
    const settings = await getSiteSettingsByGroup('api')

    switch (providerName) {
      case 'reloadly': {
        const isSandbox = settings.reloadlyMode === 'sandbox' ||
                          settings.reloadlySandbox === true ||
                          settings.reloadlySandbox === 'true'
        return isSandbox ? 'sandbox' : 'live'
      }
      case 'tango': {
        const isSandbox = settings.tangoMode === 'sandbox' ||
                          settings.tangoSandbox === true ||
                          settings.tangoSandbox === 'true'
        return isSandbox ? 'sandbox' : 'live'
      }
      case 'zendit': {
        const isSandbox = settings.zenditMode === 'sandbox'
        return isSandbox ? 'sandbox' : 'live'
      }
      default:
        return 'sandbox'
    }
  } catch {
    return 'sandbox'
  }
}

interface SyncResult {
  provider: string
  success: boolean
  synced: number
  updated: number
  errors: string[]
}

type ProviderName = 'reloadly' | 'tango' | 'zendit'

const providerMap: Record<ProviderName, GiftCardProvider> = {
  reloadly: reloadlyProvider,
  tango: tangoProvider,
  zendit: zenditGiftCardProvider
}

/**
 * Derive a normalized redeem_type from raw provider text or subType keywords.
 * Returns 'online', 'instore', 'both', or null (no label shown).
 */
function normalizeRedeemType(note?: string): 'online' | 'instore' | 'both' | null {
  if (!note) return null
  const n = note.toLowerCase()
  const hasOnline = /online|e-commerce|ecommerce|website|web|digital|internet|app|\.com/.test(n)
  const hasInstore = /in.?store|physical|brick|retail|location|store|offline/.test(n)
  if (hasOnline && hasInstore) return 'both'
  if (hasInstore) return 'instore'
  if (hasOnline) return 'online'
  return null
}

/**
 * Sync products from a provider to the database
 */
async function syncProductsToDb(
  providerName: ProviderName,
  products: ProviderProduct[],
  syncMode?: 'sandbox' | 'live'
): Promise<{ synced: number; updated: number; errors: string[] }> {
  let synced = 0
  let updated = 0
  const errors: string[] = []

  for (const product of products) {
    // Build provider_data with sync mode + any provider-specific metadata
    const providerDataObj: Record<string, unknown> = {
      ...(syncMode ? { synced_mode: syncMode, synced_at: new Date().toISOString() } : {}),
      ...(product.providerMeta || {}),
    }
    const providerData = Object.keys(providerDataObj).length > 0 ? JSON.stringify(providerDataObj) : null
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
        // Update existing - also update provider_data with current mode
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
               provider_data = COALESCE($9::jsonb, provider_data),
               redeem_type = COALESCE($11, redeem_type),
               updated_at = NOW()
           WHERE id = $10`,
          [
            product.brand,
            product.category,
            product.description,
            product.imageUrl,
            JSON.stringify(product.denominations),
            product.minAmount,
            product.maxAmount,
            product.discountPercent || 0,
            providerData,
            existing.rows[0].id,
            normalizeRedeemType(product.redeemNote)
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

        // Insert new with provider_data containing sync mode
        await query(
          `INSERT INTO gift_cards
             (brand, slug, category, description, image_url, denominations,
              min_custom_amount, max_custom_amount, discount_percent,
              provider, provider_product_id, provider_data, redeem_type, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, true)`,
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
            product.productId,
            providerData,
            normalizeRedeemType(product.redeemNote)
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

    // Get current mode to store with synced products
    const currentMode = await getProviderMode('reloadly')
    console.log(`[Sync] Syncing Reloadly products in ${currentMode} mode`)

    // Get products from Reloadly
    const products = await reloadlyProvider.getProducts(countryCode)

    if (products.length === 0) {
      result.errors.push('No products returned from Reloadly')
      return result
    }

    // Pass the mode to syncProductsToDb so it's stored with each product
    const dbResult = await syncProductsToDb('reloadly', products, currentMode)
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
    // Get current mode to store with synced products
    const currentMode = await getProviderMode('tango')
    console.log(`[Sync] Syncing Tango products in ${currentMode} mode`)

    // Get products from Tango
    const products = await tangoProvider.getProducts()

    if (products.length === 0) {
      result.errors.push('No products returned from Tango Card (not configured or no products)')
      return result
    }

    const dbResult = await syncProductsToDb('tango', products, currentMode)
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
 * Sync gift cards from Zendit
 */
async function syncFromZendit(countryCode: string = 'US'): Promise<SyncResult> {
  const result: SyncResult = {
    provider: 'zendit',
    success: false,
    synced: 0,
    updated: 0,
    errors: []
  }

  try {
    // Get current mode to store with synced products
    const currentMode = await getProviderMode('zendit')
    console.log(`[Sync] Syncing Zendit gift card products in ${currentMode} mode`)

    // Delete old Zendit gift cards before re-syncing to prevent inactive clutter
    await query(
      `DELETE FROM gift_cards WHERE provider = 'zendit'`
    )

    // Get products from Zendit voucher API
    const products = await zenditGiftCardProvider.getProducts(countryCode)

    if (products.length === 0) {
      result.errors.push('No products returned from Zendit (not configured or no products)')
      return result
    }

    const dbResult = await syncProductsToDb('zendit', products, currentMode)
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

    // Check Reloadly - toggle flag is the sole gate
    if (settings.reloadlyEnabled === true || settings.reloadlyEnabled === 'true') {
      enabled.push('reloadly')
    }

    // Check Tango - toggle flag is the sole gate
    if (settings.tangoEnabled === true || settings.tangoEnabled === 'true') {
      enabled.push('tango')
    }

    // Check Zendit - uses same API credentials as eSIM, separate enable flag for gift cards
    if (settings.zenditGiftCardsEnabled === true || settings.zenditGiftCardsEnabled === 'true') {
      enabled.push('zendit')
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
    if (process.env.ZENDIT_API_KEY) {
      enabled.push('zendit')
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

  // Deactivate cards from any provider that is no longer enabled
  const allProviders: ProviderName[] = ['reloadly', 'tango', 'zendit']
  for (const p of allProviders) {
    if (!enabledProviders.includes(p)) {
      await query(`UPDATE gift_cards SET is_active = false WHERE provider = $1 AND is_active = true`, [p])
    }
  }

  for (const providerName of enabledProviders) {
    let result: SyncResult

    switch (providerName) {
      case 'reloadly':
        result = await syncFromReloadly(countryCode)
        break
      case 'tango':
        result = await syncFromTango(countryCode)
        break
      case 'zendit':
        result = await syncFromZendit(countryCode)
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
    case 'zendit':
      return syncFromZendit(countryCode)
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
