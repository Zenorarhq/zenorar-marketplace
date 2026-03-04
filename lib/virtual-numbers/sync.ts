// Virtual Numbers Provider Sync Service
// Syncs countries and number availability from providers

import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

interface SyncResult {
  provider: string
  success: boolean
  synced: number
  updated: number
  errors: string[]
}

/**
 * Get Twilio credentials
 */
async function getTwilioCredentials(): Promise<{ accountSid: string; authToken: string } | null> {
  try {
    const settings = await getSiteSettingsByGroup('virtual-numbers')

    const isTestMode = settings.twilioTestMode === true || settings.twilioTestMode === 'true'

    let accountSid: string
    let authToken: string

    if (isTestMode) {
      accountSid = settings.twilioTestAccountSid || process.env.TWILIO_TEST_ACCOUNT_SID || ''
      authToken = settings.twilioTestAuthToken || process.env.TWILIO_TEST_AUTH_TOKEN || ''
    } else {
      accountSid = settings.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || ''
      authToken = settings.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || ''
    }

    if (!accountSid || !authToken) {
      return null
    }

    return { accountSid, authToken }
  } catch {
    // Fallback to env vars
    const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    const authToken = process.env.TWILIO_AUTH_TOKEN || ''

    if (!accountSid || !authToken) {
      return null
    }

    return { accountSid, authToken }
  }
}

/**
 * Sync available countries from Twilio
 */
async function syncTwilioCountries(): Promise<SyncResult> {
  const result: SyncResult = {
    provider: 'twilio',
    success: false,
    synced: 0,
    updated: 0,
    errors: []
  }

  try {
    const credentials = await getTwilioCredentials()
    if (!credentials) {
      result.errors.push('Twilio credentials not configured')
      return result
    }

    const { accountSid, authToken } = credentials

    // Fetch available countries from Twilio
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
        }
      }
    )

    if (!response.ok) {
      result.errors.push(`Twilio API error: ${response.status}`)
      return result
    }

    const data = await response.json()
    const countries = data.countries || []

    // Country name mapping for common codes
    const countryNames: Record<string, string> = {
      US: 'United States',
      GB: 'United Kingdom',
      CA: 'Canada',
      AU: 'Australia',
      DE: 'Germany',
      FR: 'France',
      NL: 'Netherlands',
      SE: 'Sweden',
      NO: 'Norway',
      DK: 'Denmark',
      FI: 'Finland',
      ES: 'Spain',
      IT: 'Italy',
      PT: 'Portugal',
      IE: 'Ireland',
      AT: 'Austria',
      CH: 'Switzerland',
      BE: 'Belgium',
      PL: 'Poland',
      CZ: 'Czech Republic',
      HU: 'Hungary',
      RO: 'Romania',
      BG: 'Bulgaria',
      GR: 'Greece',
      JP: 'Japan',
      SG: 'Singapore',
      HK: 'Hong Kong',
      IL: 'Israel',
      MX: 'Mexico',
      BR: 'Brazil',
      AR: 'Argentina',
      CL: 'Chile',
      CO: 'Colombia',
      PE: 'Peru',
      ZA: 'South Africa',
      NG: 'Nigeria',
      KE: 'Kenya',
      NZ: 'New Zealand',
      IN: 'India',
      PH: 'Philippines',
      ID: 'Indonesia',
      MY: 'Malaysia',
      TH: 'Thailand',
      VN: 'Vietnam',
      KR: 'South Korea',
      TW: 'Taiwan',
      AE: 'United Arab Emirates',
      SA: 'Saudi Arabia',
      EG: 'Egypt',
      TR: 'Turkey',
      RU: 'Russia',
      UA: 'Ukraine'
    }

    for (const country of countries) {
      const countryCode = country.country_code || country.country
      const countryName = countryNames[countryCode] || countryCode

      try {
        // Check if country exists
        const existing = await query(
          `SELECT id FROM virtual_number_countries WHERE iso_code = $1`,
          [countryCode]
        )

        if (existing.rows.length > 0) {
          // Update
          await query(
            `UPDATE virtual_number_countries
             SET is_active = true,
                 updated_at = NOW()
             WHERE id = $1`,
            [existing.rows[0].id]
          )
          result.updated++
        } else {
          // Insert
          await query(
            `INSERT INTO virtual_number_countries
               (name, iso_code, provider, is_active)
             VALUES ($1, $2, 'twilio', true)`,
            [countryName, countryCode]
          )
          result.synced++
        }
      } catch (err: any) {
        result.errors.push(`${countryCode}: ${err.message}`)
      }
    }

    result.success = true
  } catch (error: any) {
    result.errors.push(error.message)
  }

  return result
}

/**
 * Seed default virtual number plans if none exist
 */
async function seedDefaultPlans(): Promise<{ synced: number }> {
  const result = { synced: 0 }

  const existingPlans = await query(`SELECT COUNT(*) FROM virtual_number_plans`)
  if (parseInt(existingPlans.rows[0].count) > 0) {
    return result
  }

  const defaultPlans = [
    { name: 'Basic Monthly', slug: 'basic-monthly', priceMonthly: 9.99, smsIncluded: 100, voiceMinutesIncluded: 50, validityDays: 30 },
    { name: 'Standard Monthly', slug: 'standard-monthly', priceMonthly: 14.99, smsIncluded: 500, voiceMinutesIncluded: 200, validityDays: 30 },
    { name: 'Premium Monthly', slug: 'premium-monthly', priceMonthly: 24.99, smsIncluded: 0, voiceMinutesIncluded: 0, validityDays: 30, isUnlimited: true },
    { name: 'Weekly', slug: 'weekly', priceMonthly: 4.99, smsIncluded: 50, voiceMinutesIncluded: 20, validityDays: 7 },
    { name: 'Daily', slug: 'daily', priceMonthly: 1.99, smsIncluded: 10, voiceMinutesIncluded: 5, validityDays: 1 }
  ]

  for (const plan of defaultPlans) {
    try {
      await query(
        `INSERT INTO virtual_number_plans
           (name, slug, price_monthly, sms_included, voice_minutes_included, validity_days, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [plan.name, plan.slug, plan.priceMonthly, plan.smsIncluded, plan.voiceMinutesIncluded, plan.validityDays]
      )
      result.synced++
    } catch {
      // Ignore duplicates
    }
  }

  return result
}

/**
 * Check which virtual number providers are enabled
 */
async function getEnabledProviders(): Promise<string[]> {
  try {
    const settings = await getSiteSettingsByGroup('virtual-numbers')
    const enabled: string[] = []

    if (settings.twilioEnabled === true || settings.twilioEnabled === 'true' ||
        settings.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID) {
      enabled.push('twilio')
    }

    return enabled
  } catch {
    const enabled: string[] = []
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      enabled.push('twilio')
    }
    return enabled
  }
}

/**
 * Sync from all enabled virtual number providers
 */
export async function syncAllVirtualNumberProviders(): Promise<{
  success: boolean
  results: SyncResult[]
  totalSynced: number
  totalUpdated: number
}> {
  const enabledProviders = await getEnabledProviders()
  const results: SyncResult[] = []
  let totalSynced = 0
  let totalUpdated = 0

  // Seed default plans first
  const planResult = await seedDefaultPlans()
  totalSynced += planResult.synced

  for (const providerName of enabledProviders) {
    let result: SyncResult

    switch (providerName) {
      case 'twilio':
        result = await syncTwilioCountries()
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
    success: results.length === 0 || results.some(r => r.success),
    results,
    totalSynced,
    totalUpdated
  }
}

export const virtualNumberSyncService = {
  syncAll: syncAllVirtualNumberProviders,
  syncTwilioCountries,
  seedDefaultPlans,
  getEnabledProviders
}
