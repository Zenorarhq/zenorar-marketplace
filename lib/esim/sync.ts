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

// Map Zendit region names to our esim_regions slugs
const ZENDIT_REGION_MAP: Record<string, string> = {
  'Africa': 'africa',
  'Asia': 'asia-pacific',
  'Southeast Asia': 'asia-pacific',
  'Caribbean': 'south-america',
  'Central America': 'south-america',
  'Eastern Europe': 'europe',
  'Western Europe': 'europe',
  'Europe': 'europe',
  'North America': 'north-america',
  'South America': 'south-america',
  'Middle East': 'middle-east',
  'Middle East and North Africa': 'middle-east',
  'Oceania': 'asia-pacific',
  'Global': 'global',
}

// Fallback: ISO country code → region slug (for countries not in esim_countries table)
const ISO_TO_REGION: Record<string, string> = {
  // Europe
  ...Object.fromEntries([
    'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
    'IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT',
    'RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','VA','GE','AM','AZ',
  ].map(c => [c, 'europe'])),
  // North America
  ...Object.fromEntries(['US','CA','MX','BM','GL','PM'].map(c => [c, 'north-america'])),
  // South America + Caribbean + Central America
  ...Object.fromEntries([
    'AR','BO','BR','CL','CO','EC','FK','GF','GY','PY','PE','SR','UY','VE',
    'BZ','CR','SV','GT','HN','NI','PA','AG','BB','BS','CU','DM','DO','GD','HT','JM',
    'KN','LC','VC','TT','PR','AW','CW','TC','KY','VG','VI','MQ','GP','GI',
  ].map(c => [c, 'south-america'])),
  // Asia Pacific
  ...Object.fromEntries([
    'AF','BD','BT','BN','KH','CN','HK','IN','ID','JP','KZ','KG','LA','MO','MY','MV','MN',
    'MM','NP','KP','KR','PK','PH','SG','LK','TW','TJ','TH','TL','TM','UZ','VN','AU','NZ',
    'FJ','PG','WS','TO','VU','PF','NC','GU','MP',
  ].map(c => [c, 'asia-pacific'])),
  // Middle East
  ...Object.fromEntries([
    'AE','BH','IR','IQ','IL','JO','KW','LB','OM','PS','QA','SA','SY','YE','TR',
  ].map(c => [c, 'middle-east'])),
  // Africa
  ...Object.fromEntries([
    'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ',
    'ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU',
    'MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN',
    'UG','ZM','ZW',
  ].map(c => [c, 'africa'])),
}

/**
 * Sync eSIM plans from a specific provider.
 * Uses batch operations to avoid timeout with large catalogs (5K+ plans).
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

    // --- Pre-load lookup tables into memory (2 queries instead of per-plan) ---
    const [regionsResult, countriesResult, existingPlansResult] = await Promise.all([
      query(`SELECT id, slug FROM esim_regions`),
      query(`SELECT iso_code, name, region_id FROM esim_countries`),
      query(`SELECT id, provider_plan_id FROM esim_plans WHERE provider_id = $1`, [providerId])
    ])

    // Build lookup maps
    const regionsBySlug = new Map<string, string>()
    for (const r of regionsResult.rows) regionsBySlug.set(r.slug, r.id)

    const countriesByIso = new Map<string, { name: string; regionId: string }>()
    const countriesByRegion = new Map<string, string[]>()
    for (const c of countriesResult.rows) {
      countriesByIso.set(c.iso_code, { name: c.name, regionId: c.region_id })
      const existing = countriesByRegion.get(c.region_id) || []
      existing.push(c.iso_code)
      countriesByRegion.set(c.region_id, existing)
    }

    const existingPlanIds = new Map<string, string>()
    for (const p of existingPlansResult.rows) {
      existingPlanIds.set(p.provider_plan_id, p.id)
    }

    const globalRegionId = regionsBySlug.get('global') || null

    // Get plans from provider
    const plans = await provider.getPlans()
    console.log(`[Sync] ${providerSlug}: ${plans.length} plans fetched, processing in batches...`)

    // Log first 3 plans for debugging
    for (let i = 0; i < Math.min(3, plans.length); i++) {
      console.log(`[Sync] Sample plan ${i}:`, JSON.stringify({
        name: plans[i].name,
        price: plans[i].price,
        countries: plans[i].countries,
        dataAmountGb: plans[i].dataAmountGb,
        dataAmountDisplay: plans[i].dataAmountDisplay,
      }))
    }

    // --- Process plans in batches using upsert ---
    const BATCH_SIZE = 50
    for (let batchStart = 0; batchStart < plans.length; batchStart += BATCH_SIZE) {
      const batch = plans.slice(batchStart, batchStart + BATCH_SIZE)

      for (const plan of batch) {
        try {
          const slug = `${providerSlug}-${plan.providerPlanId}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

          // Resolve region using in-memory maps (no DB queries)
          const isoCodes = (plan.countries || []).filter(c => c.length === 2)
          const regionNames = (plan.countries || []).filter(c => c.length > 2)

          let regionId: string | null = null
          let countryName: string | null = null

          if (isoCodes.length > 0) {
            if (isoCodes.length > 5) {
              regionId = globalRegionId
            } else {
              // Try each ISO code until we find one in our DB
              for (const iso of isoCodes) {
                const country = countriesByIso.get(iso.toUpperCase())
                if (country) {
                  regionId = country.regionId
                  if (isoCodes.length === 1) countryName = country.name
                  break
                }
              }
              // Fallback: if no ISO code matched in esim_countries, use ISO_TO_REGION map
              if (!regionId) {
                const fallbackSlug = ISO_TO_REGION[isoCodes[0].toUpperCase()]
                if (fallbackSlug) {
                  regionId = regionsBySlug.get(fallbackSlug) || null
                }
              }
              // Last resort for multi-country plans: global
              if (!regionId && isoCodes.length > 1) {
                regionId = globalRegionId
              }
            }
          } else if (regionNames.length > 0) {
            const mappedSlug = ZENDIT_REGION_MAP[regionNames[0]]
            if (mappedSlug) {
              regionId = regionsBySlug.get(mappedSlug) || null
            }
          }

          // Populate countries: use ISO codes if available, otherwise resolve from region
          const dbCountries = isoCodes.length > 0
            ? isoCodes
            : regionId
              ? (countriesByRegion.get(regionId) || [])
              : []

          // Build descriptive plan name
          const planName = (plan.name && plan.name !== 'eSIM' && plan.name !== plan.dataAmountDisplay)
            ? plan.name
            : countryName
              ? `${countryName} ${plan.dataAmountDisplay} - ${plan.validityDays} Days`
              : `eSIM ${plan.dataAmountDisplay} - ${plan.validityDays} Days`

          const coverageType = isoCodes.length === 1 ? 'single' : isoCodes.length > 10 ? 'global' : 'regional'
          const existingId = existingPlanIds.get(plan.providerPlanId)

          // Debug: log price being written for first 3 plans
          if (result.synced + result.updated < 3) {
            console.log(`[Sync] DB write for "${planName}": retail_price=${plan.price}, cost_price=${plan.costPrice || plan.price * 0.7}, existingId=${existingId || 'NEW'}`)
          }

          if (existingId) {
            await query(
              `UPDATE esim_plans
               SET name = $1, description = $2, data_amount_gb = $3,
                   data_amount_display = $4, validity_days = $5, is_unlimited = $6,
                   cost_price = $7, retail_price = $8, countries = $9,
                   network_type = $10, supports_topup = $11, region_id = $12,
                   is_active = true, stock_available = true, updated_at = NOW()
               WHERE id = $13`,
              [
                planName, plan.description || '', plan.dataAmountGb,
                plan.dataAmountDisplay, plan.validityDays, plan.isUnlimited,
                plan.costPrice || plan.price * 0.7, plan.price, dbCountries,
                plan.networkType || '4g', plan.supportsTopup || false, regionId,
                existingId
              ]
            )
            result.updated++
          } else {
            await query(
              `INSERT INTO esim_plans
                 (name, slug, description, region_id, coverage_type, countries,
                  data_amount_gb, data_amount_display, validity_days, is_unlimited,
                  network_type, supports_topup, cost_price, retail_price, currency,
                  provider_id, provider_plan_id, is_active, stock_available)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, true)`,
              [
                planName, slug, plan.description || '', regionId, coverageType, dbCountries,
                plan.dataAmountGb, plan.dataAmountDisplay, plan.validityDays, plan.isUnlimited,
                plan.networkType || '4g', plan.supportsTopup || false,
                plan.costPrice || plan.price * 0.7, plan.price, plan.currency || 'USD',
                providerId, plan.providerPlanId
              ]
            )
            result.synced++
          }
        } catch (err: any) {
          if (result.errors.length < 10) {
            result.errors.push(`Plan ${plan.name}: ${err.message}`)
          }
        }
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
