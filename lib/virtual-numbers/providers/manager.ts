// Virtual Number Provider Manager
// Handles provider selection, fallback, and multi-provider operations

import { query } from '@/lib/db'
import {
  VirtualNumberProvider,
  ProviderConfig,
  AvailableNumber,
  PurchaseResult,
  PricingInfo,
} from './base'
import { twilioService } from './twilio'

// Provider instances cache
const providerInstances: Map<string, VirtualNumberProvider> = new Map()

// Provider configurations cache
let providerConfigsCache: ProviderConfig[] | null = null
let providerConfigsCacheTime: number = 0
const CONFIG_CACHE_TTL = 60000 // 1 minute

/**
 * Twilio adapter to match VirtualNumberProvider interface
 */
class TwilioProviderAdapter implements VirtualNumberProvider {
  readonly slug = 'twilio'
  readonly name = 'Twilio'

  async testConnection() {
    const result = await twilioService.testConnection()
    return {
      success: result.success,
      mode: result.mode,
      error: result.error,
    }
  }

  async searchNumbers(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile',
    options?: { areaCode?: string; contains?: string; limit?: number }
  ): Promise<AvailableNumber[]> {
    const twilioType = type === 'toll-free' ? 'tollFree' : type
    const numbers = await twilioService.searchNumbers(
      countryCode,
      twilioType as any,
      options?.areaCode,
      options?.limit || 20
    )

    return numbers.map(n => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality,
      region: n.region,
      numberType: type,
      capabilities: n.capabilities,
    }))
  }

  async purchaseNumber(
    phoneNumber: string,
    webhookUrls?: { smsUrl?: string; voiceUrl?: string }
  ): Promise<PurchaseResult> {
    return twilioService.purchaseNumber(phoneNumber)
  }

  async releaseNumber(numberSid: string) {
    return twilioService.releaseNumber(numberSid)
  }

  async sendSms(from: string, to: string, body: string) {
    return twilioService.sendSms(from, to, body)
  }

  async configureWebhooks(
    numberSid: string,
    webhookUrls: { smsUrl?: string; voiceUrl?: string; statusUrl?: string }
  ) {
    return twilioService.configureWebhook(
      numberSid,
      webhookUrls.smsUrl || '',
      webhookUrls.voiceUrl
    )
  }

  async getPricing(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile'
  ): Promise<PricingInfo | null> {
    // Twilio pricing would be fetched from their Pricing API
    // For now, return estimated defaults
    const baseCosts: Record<string, number> = {
      US: 1.0,
      CA: 1.0,
      GB: 1.5,
      DE: 1.5,
      FR: 1.5,
      AU: 1.5,
    }

    const monthlyCost = baseCosts[countryCode] || 1.0
    const typeMultiplier = type === 'toll-free' ? 2.0 : type === 'mobile' ? 1.5 : 1.0

    return {
      monthlyCost: monthlyCost * typeMultiplier,
      setupCost: 0,
      inboundVoiceCost: 0.0085,
      outboundVoiceCost: 0.014,
      inboundSmsCost: 0.0075,
      outboundSmsCost: 0.0079,
      currency: 'USD',
    }
  }

  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    return twilioService.validateWebhookSignature(signature, url, params)
  }

  async supportsCountry(countryCode: string): Promise<boolean> {
    // Twilio supports most countries
    const unsupported = ['KP', 'IR', 'CU', 'SY'] // Sanctioned countries
    return !unsupported.includes(countryCode)
  }

  clearCache(): void {
    twilioService.clearCache()
  }
}

// Initialize Twilio adapter
providerInstances.set('twilio', new TwilioProviderAdapter())

/**
 * Provider Manager - Handles multi-provider operations
 */
class ProviderManager {
  /**
   * Get all provider configurations from database
   */
  async getProviderConfigs(): Promise<ProviderConfig[]> {
    // Check cache
    if (providerConfigsCache && Date.now() - providerConfigsCacheTime < CONFIG_CACHE_TTL) {
      return providerConfigsCache
    }

    try {
      const result = await query(
        `SELECT
          id, name, slug, is_enabled, is_default,
          api_key, api_secret, account_sid, auth_token, webhook_secret,
          config, supports_sms, supports_voice, supports_mms,
          supported_countries, priority, health_status
         FROM virtual_number_providers
         ORDER BY priority ASC`
      )

      const configs: ProviderConfig[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        isEnabled: row.is_enabled,
        isDefault: row.is_default,
        apiKey: row.api_key,
        apiSecret: row.api_secret,
        accountSid: row.account_sid,
        authToken: row.auth_token,
        webhookSecret: row.webhook_secret,
        config: row.config || {},
        supportsSms: row.supports_sms,
        supportsVoice: row.supports_voice,
        supportsMms: row.supports_mms,
        supportedCountries: row.supported_countries,
        priority: row.priority,
        healthStatus: row.health_status || 'unknown',
      }))

      providerConfigsCache = configs
      providerConfigsCacheTime = Date.now()

      return configs
    } catch (error) {
      console.error('Error loading provider configs:', error)
      // Return empty array, fallback to Twilio via env vars
      return []
    }
  }

  /**
   * Get a specific provider configuration
   */
  async getProviderConfig(slug: string): Promise<ProviderConfig | null> {
    const configs = await this.getProviderConfigs()
    return configs.find(c => c.slug === slug) || null
  }

  /**
   * Get the default provider
   */
  async getDefaultProvider(): Promise<VirtualNumberProvider | null> {
    const configs = await this.getProviderConfigs()
    const defaultConfig = configs.find(c => c.isDefault && c.isEnabled)

    if (!defaultConfig) {
      // Fallback to Twilio if no default is set but it might work via env vars
      return providerInstances.get('twilio') || null
    }

    return this.getProvider(defaultConfig.slug)
  }

  /**
   * Get a provider instance by slug
   */
  getProvider(slug: string): VirtualNumberProvider | null {
    return providerInstances.get(slug) || null
  }

  /**
   * Get all enabled providers
   */
  async getEnabledProviders(): Promise<VirtualNumberProvider[]> {
    const configs = await this.getProviderConfigs()
    const enabled: VirtualNumberProvider[] = []

    for (const config of configs) {
      if (config.isEnabled && this.hasCredentials(config)) {
        const provider = this.getProvider(config.slug)
        if (provider) {
          enabled.push(provider)
        }
      }
    }

    return enabled
  }

  /**
   * Check if a provider has credentials configured
   */
  private hasCredentials(config: ProviderConfig): boolean {
    switch (config.slug) {
      case 'twilio':
        return !!(config.accountSid && config.authToken)
      case 'vonage':
        return !!(config.apiKey && config.apiSecret)
      case 'plivo':
        return !!(config.apiKey && config.apiSecret)
      case 'bandwidth':
        return !!(config.apiKey && config.apiSecret && config.accountSid)
      case 'telnyx':
        return !!(config.apiKey)
      default:
        return !!(config.apiKey || config.accountSid)
    }
  }

  /**
   * Search numbers across all enabled providers
   * Returns numbers grouped by provider with source info
   */
  async searchNumbersAllProviders(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile',
    options?: { areaCode?: string; limit?: number }
  ): Promise<(AvailableNumber & { providerSlug: string })[]> {
    const providers = await this.getEnabledProviders()
    const allNumbers: (AvailableNumber & { providerSlug: string })[] = []

    // Search each provider in parallel
    const results = await Promise.allSettled(
      providers.map(async provider => {
        try {
          const numbers = await provider.searchNumbers(countryCode, type, options)
          return numbers.map(n => ({ ...n, providerSlug: provider.slug }))
        } catch (error) {
          console.error(`Error searching ${provider.slug}:`, error)
          return []
        }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allNumbers.push(...result.value)
      }
    }

    return allNumbers
  }

  /**
   * Purchase a number from a specific provider
   */
  async purchaseNumber(
    phoneNumber: string,
    providerSlug: string,
    webhookUrls?: { smsUrl?: string; voiceUrl?: string }
  ): Promise<PurchaseResult & { providerSlug: string }> {
    const provider = this.getProvider(providerSlug)
    if (!provider) {
      return {
        success: false,
        providerSlug,
        error: `Provider ${providerSlug} not found or not enabled`,
      }
    }

    const result = await provider.purchaseNumber(phoneNumber, webhookUrls)
    return { ...result, providerSlug }
  }

  /**
   * Purchase a number from default provider with fallback
   */
  async purchaseNumberWithFallback(
    phoneNumber: string,
    webhookUrls?: { smsUrl?: string; voiceUrl?: string }
  ): Promise<PurchaseResult & { providerSlug: string }> {
    const providers = await this.getEnabledProviders()

    for (const provider of providers) {
      try {
        const result = await provider.purchaseNumber(phoneNumber, webhookUrls)
        if (result.success) {
          return { ...result, providerSlug: provider.slug }
        }
        console.warn(`${provider.slug} failed to purchase:`, result.error)
      } catch (error) {
        console.error(`${provider.slug} error:`, error)
      }
    }

    return {
      success: false,
      providerSlug: 'none',
      error: 'All providers failed to purchase the number',
    }
  }

  /**
   * Get pricing from the cheapest provider for a country
   */
  async getCheapestPricing(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile'
  ): Promise<(PricingInfo & { providerSlug: string }) | null> {
    const providers = await this.getEnabledProviders()
    let cheapest: (PricingInfo & { providerSlug: string }) | null = null

    for (const provider of providers) {
      try {
        const pricing = await provider.getPricing(countryCode, type)
        if (pricing) {
          if (!cheapest || pricing.monthlyCost < cheapest.monthlyCost) {
            cheapest = { ...pricing, providerSlug: provider.slug }
          }
        }
      } catch (error) {
        console.error(`${provider.slug} pricing error:`, error)
      }
    }

    return cheapest
  }

  /**
   * Update provider configuration
   */
  async updateProviderConfig(
    slug: string,
    updates: Partial<{
      isEnabled: boolean
      isDefault: boolean
      apiKey: string
      apiSecret: string
      accountSid: string
      authToken: string
      webhookSecret: string
      config: Record<string, any>
    }>
  ): Promise<boolean> {
    try {
      // If setting as default, unset other defaults first
      if (updates.isDefault) {
        await query(
          `UPDATE virtual_number_providers SET is_default = false WHERE slug != $1`,
          [slug]
        )
      }

      const setClauses: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (updates.isEnabled !== undefined) {
        setClauses.push(`is_enabled = $${paramIndex++}`)
        values.push(updates.isEnabled)
      }
      if (updates.isDefault !== undefined) {
        setClauses.push(`is_default = $${paramIndex++}`)
        values.push(updates.isDefault)
      }
      if (updates.apiKey !== undefined) {
        setClauses.push(`api_key = $${paramIndex++}`)
        values.push(updates.apiKey)
      }
      if (updates.apiSecret !== undefined) {
        setClauses.push(`api_secret = $${paramIndex++}`)
        values.push(updates.apiSecret)
      }
      if (updates.accountSid !== undefined) {
        setClauses.push(`account_sid = $${paramIndex++}`)
        values.push(updates.accountSid)
      }
      if (updates.authToken !== undefined) {
        setClauses.push(`auth_token = $${paramIndex++}`)
        values.push(updates.authToken)
      }
      if (updates.webhookSecret !== undefined) {
        setClauses.push(`webhook_secret = $${paramIndex++}`)
        values.push(updates.webhookSecret)
      }
      if (updates.config !== undefined) {
        setClauses.push(`config = $${paramIndex++}`)
        values.push(JSON.stringify(updates.config))
      }

      setClauses.push(`updated_at = NOW()`)
      values.push(slug)

      await query(
        `UPDATE virtual_number_providers SET ${setClauses.join(', ')} WHERE slug = $${paramIndex}`,
        values
      )

      // Clear cache
      this.clearCache()

      return true
    } catch (error) {
      console.error('Error updating provider config:', error)
      return false
    }
  }

  /**
   * Run health checks on all enabled providers
   */
  async runHealthChecks(): Promise<Record<string, { healthy: boolean; error?: string }>> {
    const providers = await this.getEnabledProviders()
    const results: Record<string, { healthy: boolean; error?: string }> = {}

    await Promise.all(
      providers.map(async provider => {
        try {
          const startTime = Date.now()
          const result = await provider.testConnection()
          const latencyMs = Date.now() - startTime

          results[provider.slug] = {
            healthy: result.success,
            error: result.error,
          }

          // Update health status in database
          await query(
            `UPDATE virtual_number_providers
             SET health_status = $1, last_health_check = NOW()
             WHERE slug = $2`,
            [result.success ? 'healthy' : 'down', provider.slug]
          )
        } catch (error: any) {
          results[provider.slug] = {
            healthy: false,
            error: error.message,
          }
        }
      })
    )

    return results
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    providerConfigsCache = null
    providerConfigsCacheTime = 0
    // Clear individual provider caches
    for (const provider of providerInstances.values()) {
      provider.clearCache()
    }
  }
}

export const providerManager = new ProviderManager()
