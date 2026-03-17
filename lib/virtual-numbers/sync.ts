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

// Country metadata for sync — name, dial code, flag emoji, default retail price
const countryMeta: Record<string, { name: string; dialCode: string; flag: string; retail: number }> = {
  US: { name: 'United States', dialCode: '+1', flag: '🇺🇸', retail: 5.00 },
  GB: { name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', retail: 6.00 },
  CA: { name: 'Canada', dialCode: '+1', flag: '🇨🇦', retail: 5.00 },
  AU: { name: 'Australia', dialCode: '+61', flag: '🇦🇺', retail: 7.00 },
  DE: { name: 'Germany', dialCode: '+49', flag: '🇩🇪', retail: 6.00 },
  FR: { name: 'France', dialCode: '+33', flag: '🇫🇷', retail: 6.00 },
  NL: { name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', retail: 6.00 },
  SE: { name: 'Sweden', dialCode: '+46', flag: '🇸🇪', retail: 6.00 },
  NO: { name: 'Norway', dialCode: '+47', flag: '🇳🇴', retail: 7.00 },
  DK: { name: 'Denmark', dialCode: '+45', flag: '🇩🇰', retail: 6.00 },
  FI: { name: 'Finland', dialCode: '+358', flag: '🇫🇮', retail: 6.00 },
  ES: { name: 'Spain', dialCode: '+34', flag: '🇪🇸', retail: 6.00 },
  IT: { name: 'Italy', dialCode: '+39', flag: '🇮🇹', retail: 6.00 },
  PT: { name: 'Portugal', dialCode: '+351', flag: '🇵🇹', retail: 6.00 },
  IE: { name: 'Ireland', dialCode: '+353', flag: '🇮🇪', retail: 6.00 },
  AT: { name: 'Austria', dialCode: '+43', flag: '🇦🇹', retail: 6.00 },
  CH: { name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', retail: 8.00 },
  BE: { name: 'Belgium', dialCode: '+32', flag: '🇧🇪', retail: 6.00 },
  PL: { name: 'Poland', dialCode: '+48', flag: '🇵🇱', retail: 5.00 },
  CZ: { name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿', retail: 5.00 },
  HU: { name: 'Hungary', dialCode: '+36', flag: '🇭🇺', retail: 5.00 },
  RO: { name: 'Romania', dialCode: '+40', flag: '🇷🇴', retail: 5.00 },
  BG: { name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬', retail: 5.00 },
  GR: { name: 'Greece', dialCode: '+30', flag: '🇬🇷', retail: 6.00 },
  JP: { name: 'Japan', dialCode: '+81', flag: '🇯🇵', retail: 8.00 },
  SG: { name: 'Singapore', dialCode: '+65', flag: '🇸🇬', retail: 7.00 },
  HK: { name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', retail: 7.00 },
  IL: { name: 'Israel', dialCode: '+972', flag: '🇮🇱', retail: 6.00 },
  MX: { name: 'Mexico', dialCode: '+52', flag: '🇲🇽', retail: 5.00 },
  BR: { name: 'Brazil', dialCode: '+55', flag: '🇧🇷', retail: 5.00 },
  AR: { name: 'Argentina', dialCode: '+54', flag: '🇦🇷', retail: 5.00 },
  CL: { name: 'Chile', dialCode: '+56', flag: '🇨🇱', retail: 5.00 },
  CO: { name: 'Colombia', dialCode: '+57', flag: '🇨🇴', retail: 5.00 },
  PE: { name: 'Peru', dialCode: '+51', flag: '🇵🇪', retail: 5.00 },
  ZA: { name: 'South Africa', dialCode: '+27', flag: '🇿🇦', retail: 5.00 },
  NG: { name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', retail: 5.00 },
  KE: { name: 'Kenya', dialCode: '+254', flag: '🇰🇪', retail: 5.00 },
  NZ: { name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', retail: 7.00 },
  IN: { name: 'India', dialCode: '+91', flag: '🇮🇳', retail: 4.00 },
  PH: { name: 'Philippines', dialCode: '+63', flag: '🇵🇭', retail: 5.00 },
  ID: { name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', retail: 5.00 },
  MY: { name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', retail: 5.00 },
  TH: { name: 'Thailand', dialCode: '+66', flag: '🇹🇭', retail: 5.00 },
  VN: { name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', retail: 5.00 },
  KR: { name: 'South Korea', dialCode: '+82', flag: '🇰🇷', retail: 7.00 },
  TW: { name: 'Taiwan', dialCode: '+886', flag: '🇹🇼', retail: 6.00 },
  AE: { name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', retail: 7.00 },
  SA: { name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', retail: 7.00 },
  EG: { name: 'Egypt', dialCode: '+20', flag: '🇪🇬', retail: 5.00 },
  TR: { name: 'Turkey', dialCode: '+90', flag: '🇹🇷', retail: 5.00 },
  RU: { name: 'Russia', dialCode: '+7', flag: '🇷🇺', retail: 5.00 },
  UA: { name: 'Ukraine', dialCode: '+380', flag: '🇺🇦', retail: 5.00 },
}

// Legacy alias for backward compatibility
const countryNames: Record<string, string> = Object.fromEntries(
  Object.entries(countryMeta).map(([k, v]) => [k, v.name])
)

/**
 * Get Twilio credentials
 */
async function getTwilioCredentials(): Promise<{ accountSid: string; authToken: string } | null> {
  try {
    // Settings are saved under 'api' group by admin settings page
    const settings = await getSiteSettingsByGroup('api')

    const isTestMode = settings.twilioMode === 'test'

    let accountSid: string
    let authToken: string

    if (isTestMode) {
      accountSid = settings.twilioTestAccountSid || process.env.TWILIO_TEST_ACCOUNT_SID || ''
      authToken = settings.twilioTestAuthToken || process.env.TWILIO_TEST_AUTH_TOKEN || ''
    } else {
      accountSid = settings.twilioLiveAccountSid || process.env.TWILIO_ACCOUNT_SID || ''
      authToken = settings.twilioLiveAuthToken || process.env.TWILIO_AUTH_TOKEN || ''
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
 * Get Plivo credentials
 */
async function getPlivoCredentials(): Promise<{ authId: string; authToken: string } | null> {
  try {
    const settings = await getSiteSettingsByGroup('api')
    const authId = settings.plivoAuthId || process.env.PLIVO_AUTH_ID || ''
    const authToken = settings.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || ''

    if (!authId || !authToken) {
      return null
    }

    return { authId, authToken }
  } catch {
    const authId = process.env.PLIVO_AUTH_ID || ''
    const authToken = process.env.PLIVO_AUTH_TOKEN || ''

    if (!authId || !authToken) {
      return null
    }

    return { authId, authToken }
  }
}

/**
 * Get Vonage credentials
 */
async function getVonageCredentials(): Promise<{ apiKey: string; apiSecret: string } | null> {
  try {
    const settings = await getSiteSettingsByGroup('api')
    const apiKey = settings.vonageApiKey || process.env.VONAGE_API_KEY || ''
    const apiSecret = settings.vonageApiSecret || process.env.VONAGE_API_SECRET || ''

    if (!apiKey || !apiSecret) {
      return null
    }

    return { apiKey, apiSecret }
  } catch {
    const apiKey = process.env.VONAGE_API_KEY || ''
    const apiSecret = process.env.VONAGE_API_SECRET || ''

    if (!apiKey || !apiSecret) {
      return null
    }

    return { apiKey, apiSecret }
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

    for (const country of countries) {
      const countryCode = country.country_code || country.country
      const meta = countryMeta[countryCode]
      const countryName = meta?.name || countryCode

      try {
        // Check if country exists
        const existing = await query(
          `SELECT id FROM virtual_number_countries WHERE iso_code = $1`,
          [countryCode]
        )

        if (existing.rows.length > 0) {
          // Update - add twilio to providers, fill in missing metadata
          await query(
            `UPDATE virtual_number_countries
             SET is_active = true,
                 providers = CASE
                   WHEN 'twilio' = ANY(providers) THEN providers
                   ELSE array_append(COALESCE(providers, ARRAY[]::text[]), 'twilio')
                 END,
                 dial_code = COALESCE(NULLIF(dial_code, ''), $2),
                 flag_emoji = COALESCE(NULLIF(flag_emoji, ''), $3),
                 retail_monthly = COALESCE(NULLIF(retail_monthly, 0), $4),
                 sms_enabled = COALESCE(sms_enabled, true),
                 voice_enabled = COALESCE(voice_enabled, true),
                 updated_at = NOW()
             WHERE id = $1`,
            [existing.rows[0].id, meta?.dialCode || '', meta?.flag || '', meta?.retail || 5.00]
          )
          result.updated++
        } else {
          // Insert with full metadata
          await query(
            `INSERT INTO virtual_number_countries
               (name, iso_code, dial_code, flag_emoji, providers, sms_enabled, voice_enabled, retail_monthly, is_active)
             VALUES ($1, $2, $3, $4, ARRAY['twilio'], true, true, $5, true)`,
            [countryName, countryCode, meta?.dialCode || '', meta?.flag || '', meta?.retail || 5.00]
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
 * Sync available countries from Plivo
 */
async function syncPlivoCountries(): Promise<SyncResult> {
  const result: SyncResult = {
    provider: 'plivo',
    success: false,
    synced: 0,
    updated: 0,
    errors: []
  }

  try {
    const credentials = await getPlivoCredentials()
    if (!credentials) {
      result.errors.push('Plivo credentials not configured')
      return result
    }

    const { authId, authToken } = credentials
    const authHeader = 'Basic ' + Buffer.from(`${authId}:${authToken}`).toString('base64')

    // Plivo doesn't have a direct "list countries" API, but we can check common countries
    // by attempting to search for numbers in each country
    const countriesToCheck = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'SE', 'NO', 'DK', 'ES', 'IT', 'IE', 'AT', 'CH', 'BE', 'PL', 'IN', 'SG', 'HK', 'MX', 'BR']

    for (const countryCode of countriesToCheck) {
      try {
        // Check if numbers are available in this country
        const response = await fetch(
          `https://api.plivo.com/v1/Account/${authId}/PhoneNumber/?country_iso=${countryCode}&limit=1`,
          {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          continue // Country not supported or error
        }

        const data = await response.json()
        if (!data.objects || data.objects.length === 0) {
          continue // No numbers available
        }

        const meta = countryMeta[countryCode]
        const countryName = meta?.name || countryCode

        // Check if country exists
        const existing = await query(
          `SELECT id FROM virtual_number_countries WHERE iso_code = $1`,
          [countryCode]
        )

        if (existing.rows.length > 0) {
          await query(
            `UPDATE virtual_number_countries
             SET is_active = true,
                 providers = CASE
                   WHEN 'plivo' = ANY(providers) THEN providers
                   ELSE array_append(COALESCE(providers, ARRAY[]::text[]), 'plivo')
                 END,
                 dial_code = COALESCE(NULLIF(dial_code, ''), $2),
                 flag_emoji = COALESCE(NULLIF(flag_emoji, ''), $3),
                 retail_monthly = COALESCE(NULLIF(retail_monthly, 0), $4),
                 sms_enabled = COALESCE(sms_enabled, true),
                 voice_enabled = COALESCE(voice_enabled, true),
                 updated_at = NOW()
             WHERE id = $1`,
            [existing.rows[0].id, meta?.dialCode || '', meta?.flag || '', meta?.retail || 5.00]
          )
          result.updated++
        } else {
          await query(
            `INSERT INTO virtual_number_countries
               (name, iso_code, dial_code, flag_emoji, providers, sms_enabled, voice_enabled, retail_monthly, is_active)
             VALUES ($1, $2, $3, $4, ARRAY['plivo'], true, true, $5, true)`,
            [countryName, countryCode, meta?.dialCode || '', meta?.flag || '', meta?.retail || 5.00]
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
 * Sync available countries from Vonage
 */
async function syncVonageCountries(): Promise<SyncResult> {
  const result: SyncResult = {
    provider: 'vonage',
    success: false,
    synced: 0,
    updated: 0,
    errors: []
  }

  try {
    const credentials = await getVonageCredentials()
    if (!credentials) {
      result.errors.push('Vonage credentials not configured')
      return result
    }

    const { apiKey, apiSecret } = credentials

    // Vonage also doesn't have a direct "list countries" API, check common countries
    const countriesToCheck = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'SE', 'NO', 'DK', 'ES', 'IT', 'IE', 'AT', 'CH', 'BE', 'PL', 'IN', 'SG', 'HK', 'MX', 'BR', 'ZA', 'IL']

    for (const countryCode of countriesToCheck) {
      try {
        // Check if numbers are available in this country
        const response = await fetch(
          `https://rest.nexmo.com/number/search?api_key=${apiKey}&api_secret=${apiSecret}&country=${countryCode}&size=1`
        )

        if (!response.ok) {
          continue
        }

        const data = await response.json()
        if (data['error-code'] && data['error-code'] !== '200') {
          continue
        }

        if (!data.numbers || data.numbers.length === 0) {
          continue // No numbers available
        }

        const meta = countryMeta[countryCode]
        const countryName = meta?.name || countryCode

        // Check if country exists
        const existing = await query(
          `SELECT id FROM virtual_number_countries WHERE iso_code = $1`,
          [countryCode]
        )

        if (existing.rows.length > 0) {
          await query(
            `UPDATE virtual_number_countries
             SET is_active = true,
                 providers = CASE
                   WHEN 'vonage' = ANY(providers) THEN providers
                   ELSE array_append(COALESCE(providers, ARRAY[]::text[]), 'vonage')
                 END,
                 dial_code = COALESCE(NULLIF(dial_code, ''), $2),
                 flag_emoji = COALESCE(NULLIF(flag_emoji, ''), $3),
                 retail_monthly = COALESCE(NULLIF(retail_monthly, 0), $4),
                 sms_enabled = COALESCE(sms_enabled, true),
                 voice_enabled = COALESCE(voice_enabled, true),
                 updated_at = NOW()
             WHERE id = $1`,
            [existing.rows[0].id, meta?.dialCode || '', meta?.flag || '', meta?.retail || 5.00]
          )
          result.updated++
        } else {
          await query(
            `INSERT INTO virtual_number_countries
               (name, iso_code, dial_code, flag_emoji, providers, sms_enabled, voice_enabled, retail_monthly, is_active)
             VALUES ($1, $2, $3, $4, ARRAY['vonage'], true, true, $5, true)`,
            [countryName, countryCode, meta?.dialCode || '', meta?.flag || '', meta?.retail || 5.00]
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
           (name, slug, base_price, sms_included, voice_minutes_included, duration_days, is_active)
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
    // All settings are saved under 'api' group by admin settings page
    const settings = await getSiteSettingsByGroup('api')
    const enabled: string[] = []

    // Check Twilio
    if (settings.twilioEnabled === true || settings.twilioEnabled === 'true' ||
        settings.twilioLiveAccountSid || process.env.TWILIO_ACCOUNT_SID) {
      enabled.push('twilio')
    }

    // Check Plivo
    if (settings.plivoEnabled === true || settings.plivoEnabled === 'true' ||
        settings.plivoAuthId || process.env.PLIVO_AUTH_ID) {
      enabled.push('plivo')
    }

    // Check Vonage
    if (settings.vonageEnabled === true || settings.vonageEnabled === 'true' ||
        settings.vonageApiKey || process.env.VONAGE_API_KEY) {
      enabled.push('vonage')
    }

    return enabled
  } catch {
    const enabled: string[] = []
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      enabled.push('twilio')
    }
    if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
      enabled.push('plivo')
    }
    if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
      enabled.push('vonage')
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
      case 'plivo':
        result = await syncPlivoCountries()
        break
      case 'vonage':
        result = await syncVonageCountries()
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
  syncPlivoCountries,
  syncVonageCountries,
  seedDefaultPlans,
  getEnabledProviders
}
