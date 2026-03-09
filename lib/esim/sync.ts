// eSIM Provider Sync Service
// Syncs plans from all configured eSIM providers

import { query } from '@/lib/db'
import { EsimProviderFactory } from './provider-factory'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

interface SyncResult {
  provider: string
  success: boolean
  synced: number
  updated: number
  errors: string[]
}

/**
 * Sync eSIM plans from a specific provider
 */
async function syncFromProvider(providerSlug: string): Promise<SyncResult> {
  const result: SyncResult = {
    provider: providerSlug,
    success: false,
    synced: 0,
    updated: 0,
    errors: []
  }

  try {
    const provider = EsimProviderFactory.getProvider(providerSlug)
    if (!provider) {
      result.errors.push(`Provider ${providerSlug} not found`)
      return result
    }

    // Health check first
    const isHealthy = await provider.healthCheck()
    if (!isHealthy) {
      result.errors.push(`Provider ${providerSlug} health check failed - check API credentials`)
      return result
    }

    // Get provider ID from database
    const providerResult = await query(
      `SELECT id FROM esim_providers WHERE slug = $1`,
      [providerSlug]
    )

    let providerId: string
    if (providerResult.rows.length === 0) {
      // Create provider record
      const insertResult = await query(
        `INSERT INTO esim_providers (name, slug, is_active, priority)
         VALUES ($1, $2, true, $3)
         RETURNING id`,
        [provider.name, providerSlug, providerSlug === 'airalo' ? 1 : providerSlug === 'esimgo' ? 2 : 3]
      )
      providerId = insertResult.rows[0].id
    } else {
      providerId = providerResult.rows[0].id
    }

    // Get plans from provider
    const plans = await provider.getPlans()

    for (const plan of plans) {
      try {
        // Generate slug
        const slug = `${providerSlug}-${plan.providerPlanId}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        // Find or create region
        let regionId: string | null = null
        if (plan.countries && plan.countries.length > 0) {
          // Try to match region based on countries
          const regionSlug = plan.countries.length > 5 ? 'global' :
            plan.countries.length === 1 ? plan.countries[0].toLowerCase() : 'regional'

          const regionResult = await query(
            `SELECT id FROM esim_regions WHERE slug = $1`,
            [regionSlug]
          )

          if (regionResult.rows.length > 0) {
            regionId = regionResult.rows[0].id
          }
        }

        // Check if plan exists
        const existing = await query(
          `SELECT id FROM esim_plans
           WHERE provider_id = $1 AND provider_plan_id = $2`,
          [providerId, plan.providerPlanId]
        )

        if (existing.rows.length > 0) {
          // Update existing
          await query(
            `UPDATE esim_plans
             SET name = $1,
                 description = $2,
                 data_amount_gb = $3,
                 data_amount_display = $4,
                 validity_days = $5,
                 is_unlimited = $6,
                 cost_price = $7,
                 retail_price = $8,
                 countries = $9,
                 network_type = $10,
                 supports_topup = $11,
                 stock_available = true,
                 updated_at = NOW()
             WHERE id = $12`,
            [
              plan.name,
              plan.description || '',
              plan.dataAmountGb,
              plan.dataAmountDisplay,
              plan.validityDays,
              plan.isUnlimited,
              plan.price * 0.7, // Estimated cost (70% of retail)
              plan.price,
              plan.countries || [],
              plan.networkType || '4g',
              plan.supportsTopup || false,
              existing.rows[0].id
            ]
          )
          result.updated++
        } else {
          // Insert new plan
          await query(
            `INSERT INTO esim_plans
               (name, slug, description, region_id, coverage_type, countries,
                data_amount_gb, data_amount_display, validity_days, is_unlimited,
                network_type, supports_topup, cost_price, retail_price, currency,
                provider_id, provider_plan_id, is_active, stock_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, true)`,
            [
              plan.name,
              slug,
              plan.description || '',
              regionId,
              plan.countries?.length === 1 ? 'single' : plan.countries?.length > 10 ? 'global' : 'regional',
              plan.countries || [],
              plan.dataAmountGb,
              plan.dataAmountDisplay,
              plan.validityDays,
              plan.isUnlimited,
              plan.networkType || '4g',
              plan.supportsTopup || false,
              plan.price * 0.7,
              plan.price,
              plan.currency || 'USD',
              providerId,
              plan.providerPlanId
            ]
          )
          result.synced++
        }
      } catch (err: any) {
        result.errors.push(`Plan ${plan.name}: ${err.message}`)
      }
    }

    result.success = true
  } catch (error: any) {
    result.errors.push(error.message)
  }

  return result
}

/**
 * Check which providers are enabled in settings
 */
async function getEnabledProviders(): Promise<string[]> {
  try {
    const settings = await getSiteSettingsByGroup('api')
    const enabled: string[] = []

    // Check Airalo
    if (settings.airaloEnabled === true || settings.airaloEnabled === 'true') {
      enabled.push('airalo')
    }

    // Check eSIM Go
    if (settings.esimGoEnabled === true || settings.esimGoEnabled === 'true') {
      enabled.push('esimgo')
    }

    // Check Mobimatter
    if (settings.mobimatterEnabled === true || settings.mobimatterEnabled === 'true') {
      enabled.push('mobimatter')
    }

    // Check eSIM.sm
    if (settings.esimSmEnabled === true || settings.esimSmEnabled === 'true') {
      enabled.push('esimsm')
    }

    return enabled
  } catch {
    // Default to checking env vars
    const enabled: string[] = []
    if (process.env.AIRALO_CLIENT_ID && process.env.AIRALO_CLIENT_SECRET) {
      enabled.push('airalo')
    }
    if (process.env.ESIMGO_API_KEY) {
      enabled.push('esimgo')
    }
    if (process.env.MOBIMATTER_API_KEY && process.env.MOBIMATTER_MERCHANT_ID) {
      enabled.push('mobimatter')
    }
    if (process.env.ESIMSM_API_KEY) {
      enabled.push('esimsm')
    }
    return enabled
  }
}

/**
 * Sync from all enabled eSIM providers
 */
export async function syncAllEsimProviders(): Promise<{
  success: boolean
  results: SyncResult[]
  totalSynced: number
  totalUpdated: number
}> {
  const enabledProviders = await getEnabledProviders()
  const results: SyncResult[] = []
  let totalSynced = 0
  let totalUpdated = 0

  for (const providerSlug of enabledProviders) {
    const result = await syncFromProvider(providerSlug)
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
 * Sync from a specific eSIM provider
 */
export async function syncEsimProvider(providerSlug: string): Promise<SyncResult> {
  return syncFromProvider(providerSlug)
}

export const esimSyncService = {
  syncAll: syncAllEsimProviders,
  syncProvider: syncEsimProvider,
  getEnabledProviders
}
