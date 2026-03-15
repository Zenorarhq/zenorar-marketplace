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

        // Find region via esim_countries lookup
        let regionId: string | null = null
        let countryName: string | null = null
        if (plan.countries && plan.countries.length > 0) {
          if (plan.countries.length > 5) {
            // Multi-country → global region
            const globalResult = await query(
              `SELECT id FROM esim_regions WHERE slug = 'global'`
            )
            if (globalResult.rows.length > 0) {
              regionId = globalResult.rows[0].id
            }
          } else {
            // Look up first country to find its region
            const countryResult = await query(
              `SELECT ec.name, ec.region_id FROM esim_countries ec WHERE ec.iso_code = $1`,
              [plan.countries[0].toUpperCase()]
            )
            if (countryResult.rows.length > 0) {
              regionId = countryResult.rows[0].region_id
              countryName = countryResult.rows[0].name
            }
          }
        }

        // Build descriptive plan name
        const planName = (plan.name && plan.name !== 'eSIM' && plan.name !== plan.dataAmountDisplay)
          ? plan.name
          : countryName
            ? `${countryName} ${plan.dataAmountDisplay} - ${plan.validityDays} Days`
            : `eSIM ${plan.dataAmountDisplay} - ${plan.validityDays} Days`

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
                 region_id = $12,
                 is_active = true,
                 stock_available = true,
                 updated_at = NOW()
             WHERE id = $13`,
            [
              planName,
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
              regionId,
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
              planName,
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

    // Check Zendit (default provider)
    if (settings.zenditEnabled === true || settings.zenditEnabled === 'true') {
      enabled.push('zendit')
    }

    // Check Airalo
    if (settings.airaloEnabled === true || settings.airaloEnabled === 'true') {
      enabled.push('airalo')
    }

    // Check eSIM Go
    if (settings.esimGoEnabled === true || settings.esimGoEnabled === 'true') {
      enabled.push('esimgo')
    }

    return enabled
  } catch {
    // Default to checking env vars
    const enabled: string[] = []
    if (process.env.ZENDIT_API_KEY || process.env.ZENDIT_SANDBOX_API_KEY) {
      enabled.push('zendit')
    }
    if (process.env.AIRALO_CLIENT_ID && process.env.AIRALO_CLIENT_SECRET) {
      enabled.push('airalo')
    }
    if (process.env.ESIMGO_API_KEY) {
      enabled.push('esimgo')
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
