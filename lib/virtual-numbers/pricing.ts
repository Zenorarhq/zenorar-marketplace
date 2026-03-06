// Virtual Number Pricing Service
// Calculates dynamic prices based on provider costs and admin-configured markups

import { query } from '@/lib/db'

// Default values (used if settings not found in DB)
const DEFAULTS = {
  // Duration multipliers (what % of monthly cost to charge)
  durationMultiplier1d: 20,
  durationMultiplier7d: 50,
  durationMultiplier30d: 100,

  // Profit markups
  numberMarkupPercent: 500,  // 500% = 6x
  minuteMarkupPercent: 300,  // 300% = 4x

  // Minimum prices (floor)
  minPrice1d: 2,
  minPrice7d: 5,
  minPrice30d: 10,

  // SMS limits per duration
  smsLimit1d: 50,
  smsLimit7d: 200,
  smsLimit30d: 500,

  // Business plan addons (on top of basic)
  businessAddon1d: 3,
  businessAddon7d: 12,
  businessAddon30d: 30,

  // Minute packages (base cost from Twilio ~$0.027/min)
  minutePackages: [
    { minutes: 30, basePrice: 0.81 },
    { minutes: 60, basePrice: 1.62 },
    { minutes: 120, basePrice: 3.24 },
  ],

  // Fallback provider monthly cost
  fallbackMonthlyCost: 1.00,
}

export interface PricingSettings {
  durationMultiplier1d: number
  durationMultiplier7d: number
  durationMultiplier30d: number
  numberMarkupPercent: number
  minuteMarkupPercent: number
  minPrice1d: number
  minPrice7d: number
  minPrice30d: number
  smsLimit1d: number
  smsLimit7d: number
  smsLimit30d: number
  businessAddon1d: number
  businessAddon7d: number
  businessAddon30d: number
  minutePackages: { minutes: number; basePrice: number }[]
}

export interface CalculatedPrices {
  basic: {
    day1: { price: number; smsLimit: number }
    day7: { price: number; smsLimit: number }
    day30: { price: number; smsLimit: number }
  }
  business: {
    day1: { price: number; features: string[] }
    day7: { price: number; features: string[] }
    day30: { price: number; features: string[] }
  }
  minuteTiers: { id: string; minutes: number; price: number }[]
  providerCost: number
  currency: string
}

class VirtualNumberPricingService {
  private settingsCache: PricingSettings | null = null
  private settingsCacheTime: number = 0
  private readonly CACHE_TTL = 60000 // 1 minute cache

  /**
   * Get pricing settings from database
   */
  async getSettings(): Promise<PricingSettings> {
    // Check cache
    if (this.settingsCache && Date.now() - this.settingsCacheTime < this.CACHE_TTL) {
      return this.settingsCache
    }

    try {
      const result = await query(
        `SELECT key, value FROM site_settings WHERE "group" = 'virtual_numbers'`
      )

      const settingsMap: Record<string, string> = {}
      for (const row of result.rows) {
        settingsMap[row.key] = row.value
      }

      const parseNum = (key: string, fallback: number): number => {
        const val = settingsMap[key]
        if (!val) return fallback
        const parsed = parseFloat(val.replace(/"/g, ''))
        return isNaN(parsed) ? fallback : parsed
      }

      const parseJson = (key: string, fallback: any): any => {
        const val = settingsMap[key]
        if (!val) return fallback
        try {
          return JSON.parse(val)
        } catch {
          return fallback
        }
      }

      const settings: PricingSettings = {
        durationMultiplier1d: parseNum('vn_duration_multiplier_1d', DEFAULTS.durationMultiplier1d),
        durationMultiplier7d: parseNum('vn_duration_multiplier_7d', DEFAULTS.durationMultiplier7d),
        durationMultiplier30d: parseNum('vn_duration_multiplier_30d', DEFAULTS.durationMultiplier30d),
        numberMarkupPercent: parseNum('vn_number_markup_percent', DEFAULTS.numberMarkupPercent),
        minuteMarkupPercent: parseNum('vn_minute_markup_percent', DEFAULTS.minuteMarkupPercent),
        minPrice1d: parseNum('vn_min_price_1d', DEFAULTS.minPrice1d),
        minPrice7d: parseNum('vn_min_price_7d', DEFAULTS.minPrice7d),
        minPrice30d: parseNum('vn_min_price_30d', DEFAULTS.minPrice30d),
        smsLimit1d: parseNum('vn_sms_limit_1d', DEFAULTS.smsLimit1d),
        smsLimit7d: parseNum('vn_sms_limit_7d', DEFAULTS.smsLimit7d),
        smsLimit30d: parseNum('vn_sms_limit_30d', DEFAULTS.smsLimit30d),
        businessAddon1d: parseNum('vn_business_addon_1d', DEFAULTS.businessAddon1d),
        businessAddon7d: parseNum('vn_business_addon_7d', DEFAULTS.businessAddon7d),
        businessAddon30d: parseNum('vn_business_addon_30d', DEFAULTS.businessAddon30d),
        minutePackages: parseJson('vn_minute_packages', DEFAULTS.minutePackages),
      }

      this.settingsCache = settings
      this.settingsCacheTime = Date.now()

      return settings
    } catch (error) {
      console.error('Error loading pricing settings:', error)
      return {
        ...DEFAULTS,
        minutePackages: [...DEFAULTS.minutePackages],
      }
    }
  }

  /**
   * Get provider cost for a specific country/type
   * First checks cache, then fetches from provider API if needed
   */
  async getProviderCost(
    countryCode: string,
    numberType: string = 'local',
    providerId?: string
  ): Promise<{ monthlyCost: number; perMinuteCost: number; currency: string }> {
    try {
      // Try to get from cache first
      let whereClause = `country_code = $1 AND number_type = $2 AND expires_at > NOW()`
      const params: any[] = [countryCode, numberType]

      if (providerId) {
        whereClause += ` AND provider_id = $3`
        params.push(providerId)
      }

      const cacheResult = await query(
        `SELECT monthly_cost, inbound_voice_cost, outbound_voice_cost, currency
         FROM virtual_number_provider_pricing
         WHERE ${whereClause}
         ORDER BY monthly_cost ASC
         LIMIT 1`,
        params
      )

      if (cacheResult.rows.length > 0) {
        const row = cacheResult.rows[0]
        return {
          monthlyCost: parseFloat(row.monthly_cost),
          perMinuteCost: parseFloat(row.inbound_voice_cost) + parseFloat(row.outbound_voice_cost),
          currency: row.currency,
        }
      }

      // Fallback: Try to get from virtual_number_countries
      const countryResult = await query(
        `SELECT twilio_monthly_cost FROM virtual_number_countries WHERE iso_code = $1`,
        [countryCode]
      )

      if (countryResult.rows.length > 0 && countryResult.rows[0].twilio_monthly_cost) {
        return {
          monthlyCost: parseFloat(countryResult.rows[0].twilio_monthly_cost),
          perMinuteCost: 0.027, // Default Twilio rate
          currency: 'USD',
        }
      }

      // Final fallback
      return {
        monthlyCost: DEFAULTS.fallbackMonthlyCost,
        perMinuteCost: 0.027,
        currency: 'USD',
      }
    } catch (error) {
      console.error('Error getting provider cost:', error)
      return {
        monthlyCost: DEFAULTS.fallbackMonthlyCost,
        perMinuteCost: 0.027,
        currency: 'USD',
      }
    }
  }

  /**
   * Calculate all prices for a given country/type
   */
  async calculatePrices(
    countryCode: string,
    numberType: string = 'local'
  ): Promise<CalculatedPrices> {
    const [settings, providerCost] = await Promise.all([
      this.getSettings(),
      this.getProviderCost(countryCode, numberType),
    ])

    const { monthlyCost, perMinuteCost, currency } = providerCost
    const markupMultiplier = 1 + settings.numberMarkupPercent / 100
    const minuteMarkupMultiplier = 1 + settings.minuteMarkupPercent / 100

    // Calculate basic plan prices
    const calculateBasicPrice = (durationMultiplier: number, minPrice: number): number => {
      const basePrice = monthlyCost * (durationMultiplier / 100) * markupMultiplier
      return Math.max(Math.round(basePrice * 100) / 100, minPrice)
    }

    const basic1d = calculateBasicPrice(settings.durationMultiplier1d, settings.minPrice1d)
    const basic7d = calculateBasicPrice(settings.durationMultiplier7d, settings.minPrice7d)
    const basic30d = calculateBasicPrice(settings.durationMultiplier30d, settings.minPrice30d)

    // Calculate business plan prices (basic + addon)
    const business1d = basic1d + settings.businessAddon1d
    const business7d = basic7d + settings.businessAddon7d
    const business30d = basic30d + settings.businessAddon30d

    // Calculate minute tier prices
    const minuteTiers = settings.minutePackages.map((pkg, idx) => {
      const basePrice = pkg.basePrice || (pkg.minutes * perMinuteCost)
      const finalPrice = Math.ceil(basePrice * minuteMarkupMultiplier)
      return {
        id: `tier_${pkg.minutes}`,
        minutes: pkg.minutes,
        price: finalPrice,
      }
    })

    return {
      basic: {
        day1: { price: basic1d, smsLimit: settings.smsLimit1d },
        day7: { price: basic7d, smsLimit: settings.smsLimit7d },
        day30: { price: basic30d, smsLimit: settings.smsLimit30d },
      },
      business: {
        day1: { price: business1d, features: ['SMS + Voice', 'Call Forwarding'] },
        day7: { price: business7d, features: ['SMS + Voice', 'Call Forwarding', 'Voicemail'] },
        day30: { price: business30d, features: ['SMS + Voice', 'Call Forwarding', 'Voicemail', 'Priority Support'] },
      },
      minuteTiers,
      providerCost: monthlyCost,
      currency,
    }
  }

  /**
   * Get minimum starting price across all plans
   */
  async getStartingPrice(countryCode?: string): Promise<number> {
    if (countryCode) {
      const prices = await this.calculatePrices(countryCode)
      return prices.basic.day1.price
    }

    // Without country, return minimum from settings
    const settings = await this.getSettings()
    return settings.minPrice1d
  }

  /**
   * Update pricing settings
   */
  async updateSettings(updates: Partial<PricingSettings>): Promise<boolean> {
    try {
      const keyMap: Record<string, keyof PricingSettings> = {
        vn_duration_multiplier_1d: 'durationMultiplier1d',
        vn_duration_multiplier_7d: 'durationMultiplier7d',
        vn_duration_multiplier_30d: 'durationMultiplier30d',
        vn_number_markup_percent: 'numberMarkupPercent',
        vn_minute_markup_percent: 'minuteMarkupPercent',
        vn_min_price_1d: 'minPrice1d',
        vn_min_price_7d: 'minPrice7d',
        vn_min_price_30d: 'minPrice30d',
        vn_sms_limit_1d: 'smsLimit1d',
        vn_sms_limit_7d: 'smsLimit7d',
        vn_sms_limit_30d: 'smsLimit30d',
        vn_business_addon_1d: 'businessAddon1d',
        vn_business_addon_7d: 'businessAddon7d',
        vn_business_addon_30d: 'businessAddon30d',
        vn_minute_packages: 'minutePackages',
      }

      for (const [dbKey, settingsKey] of Object.entries(keyMap)) {
        if (settingsKey in updates) {
          const value = updates[settingsKey as keyof PricingSettings]
          const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)

          await query(
            `INSERT INTO site_settings (id, key, value, "group", "isPublic", "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, 'virtual_numbers', false, NOW(), NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = NOW()`,
            [dbKey, stringValue]
          )
        }
      }

      // Clear cache
      this.settingsCache = null

      return true
    } catch (error) {
      console.error('Error updating pricing settings:', error)
      return false
    }
  }

  /**
   * Refresh provider pricing cache
   */
  async refreshProviderPricing(providerId: string, countryCode: string): Promise<void> {
    // This would call the provider's API to get current pricing
    // For now, we'll implement this when we add the provider abstraction
    console.log(`[Pricing] Would refresh pricing for provider ${providerId}, country ${countryCode}`)
  }

  /**
   * Clear settings cache (call after admin changes)
   */
  clearCache(): void {
    this.settingsCache = null
    this.settingsCacheTime = 0
  }
}

export const pricingService = new VirtualNumberPricingService()
