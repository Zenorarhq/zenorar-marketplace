// Telnyx Provider Service for Virtual Numbers
// Documentation: https://developers.telnyx.com/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { query } from '@/lib/db'
import {
  VirtualNumberProvider,
  AvailableNumber,
  PurchaseResult,
  ReleaseResult,
  SmsResult,
  HealthCheckResult,
  PricingInfo,
} from './base'

interface TelnyxCredentials {
  apiKey: string
  messagingProfileId?: string
  connectionId?: string
  isEnabled: boolean
}

// Cache credentials for 1 minute
let credentialsCache: { credentials: TelnyxCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000

class TelnyxService {
  private async getCredentials(): Promise<TelnyxCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      // Try database first
      const result = await query(
        `SELECT api_key, config FROM virtual_number_providers WHERE slug = 'telnyx' AND is_enabled = true`
      )

      if (result.rows.length > 0) {
        const row = result.rows[0]
        const config = row.config || {}
        const credentials: TelnyxCredentials | null = row.api_key
          ? {
              apiKey: row.api_key,
              messagingProfileId: config.messagingProfileId,
              connectionId: config.connectionId,
              isEnabled: true,
            }
          : null
        credentialsCache = { credentials, timestamp: Date.now() }
        return credentials
      }

      // Fallback to settings
      const settings = await getSiteSettingsByGroup('api')
      const isEnabled = settings.telnyxEnabled === true || settings.telnyxEnabled === 'true'
      if (!isEnabled) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const apiKey = settings.telnyxApiKey || process.env.TELNYX_API_KEY || ''

      const credentials: TelnyxCredentials | null = apiKey
        ? {
            apiKey,
            messagingProfileId: settings.telnyxMessagingProfileId,
            connectionId: settings.telnyxConnectionId,
            isEnabled,
          }
        : null

      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error fetching Telnyx credentials:', error)
      const apiKey = process.env.TELNYX_API_KEY || ''
      return apiKey ? { apiKey, isEnabled: true } : null
    }
  }

  clearCache(): void {
    credentialsCache = null
  }

  private getAuthHeader(credentials: TelnyxCredentials): string {
    return `Bearer ${credentials.apiKey}`
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Telnyx not configured' }
    }

    try {
      const response = await fetch('https://api.telnyx.com/v2/balance', {
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        return { success: false, error: data.errors?.[0]?.detail || 'Authentication failed' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection failed' }
    }
  }

  async searchNumbers(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile',
    options?: { areaCode?: string; contains?: string; limit?: number }
  ): Promise<AvailableNumber[]> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      console.warn('Telnyx not configured')
      return []
    }

    try {
      const params = new URLSearchParams({
        'filter[country_code]': countryCode,
        'filter[limit]': (options?.limit || 20).toString(),
      })

      // Number type filter
      if (type === 'toll-free') {
        params.append('filter[features]', 'toll_free')
      } else if (type === 'mobile') {
        params.append('filter[phone_number_type]', 'mobile')
      } else {
        params.append('filter[phone_number_type]', 'local')
      }

      // Area code or pattern search
      if (options?.areaCode) {
        params.append('filter[national_destination_code]', options.areaCode)
      }
      if (options?.contains) {
        params.append('filter[phone_number][contains]', options.contains)
      }

      const response = await fetch(
        `https://api.telnyx.com/v2/available_phone_numbers?${params.toString()}`,
        {
          headers: {
            'Authorization': this.getAuthHeader(credentials),
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.error('Telnyx search error:', await response.text())
        return []
      }

      const data = await response.json()

      return (data.data || []).map((n: any) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.phone_number,
        locality: n.locality || '',
        region: n.region_information?.[0]?.region_name || '',
        numberType: type,
        capabilities: {
          sms: n.features?.includes('sms') || n.features?.includes('mms') || true,
          voice: n.features?.includes('voice') || true,
          mms: n.features?.includes('mms') || false,
        },
        monthlyCost: n.cost_information?.monthly_cost ? parseFloat(n.cost_information.monthly_cost) : undefined,
      }))
    } catch (error) {
      console.error('Telnyx search error:', error)
      return []
    }
  }

  async purchaseNumber(
    phoneNumber: string,
    webhookUrls?: { smsUrl?: string; voiceUrl?: string }
  ): Promise<PurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Telnyx not configured' }
    }

    try {
      const body: any = {
        phone_numbers: [{ phone_number: phoneNumber }],
      }

      if (credentials.connectionId) {
        body.connection_id = credentials.connectionId
      }
      if (credentials.messagingProfileId) {
        body.messaging_profile_id = credentials.messagingProfileId
      }

      const response = await fetch('https://api.telnyx.com/v2/number_orders', {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.errors?.[0]?.detail || 'Failed to purchase number',
        }
      }

      // Get the number ID from the order
      const numberId = data.data?.phone_numbers?.[0]?.id || data.data?.id

      return {
        success: true,
        numberSid: numberId || phoneNumber,
        phoneNumber: phoneNumber,
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to purchase number' }
    }
  }

  async releaseNumber(numberSid: string): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Telnyx not configured' }
    }

    try {
      const response = await fetch(`https://api.telnyx.com/v2/phone_numbers/${numberSid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
        },
      })

      if (!response.ok && response.status !== 200 && response.status !== 204) {
        const data = await response.json()
        return { success: false, error: data.errors?.[0]?.detail || 'Failed to release number' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to release number' }
    }
  }

  async sendSms(from: string, to: string, text: string): Promise<SmsResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Telnyx not configured' }
    }

    try {
      const body: any = {
        from: from,
        to: to,
        text: text,
      }

      if (credentials.messagingProfileId) {
        body.messaging_profile_id = credentials.messagingProfileId
      }

      const response = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.errors?.[0]?.detail || 'Failed to send SMS',
        }
      }

      return {
        success: true,
        messageSid: data.data?.id || '',
        status: data.data?.to?.[0]?.status || 'queued',
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send SMS' }
    }
  }

  async configureWebhooks(
    numberSid: string,
    webhookUrls: { smsUrl?: string; voiceUrl?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Telnyx not configured' }
    }

    try {
      // Telnyx uses connection/messaging profile for webhooks
      // Update would be done at the connection level
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const telnyxService = new TelnyxService()

/**
 * Telnyx adapter implementing VirtualNumberProvider interface
 */
export class TelnyxProviderAdapter implements VirtualNumberProvider {
  readonly slug = 'telnyx'
  readonly name = 'Telnyx'

  async testConnection(): Promise<HealthCheckResult> {
    const result = await telnyxService.testConnection()
    return {
      success: result.success,
      mode: 'live',
      error: result.error,
    }
  }

  async searchNumbers(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile',
    options?: { areaCode?: string; contains?: string; limit?: number }
  ): Promise<AvailableNumber[]> {
    return telnyxService.searchNumbers(countryCode, type, options)
  }

  async purchaseNumber(
    phoneNumber: string,
    webhookUrls?: { smsUrl?: string; voiceUrl?: string }
  ): Promise<PurchaseResult> {
    return telnyxService.purchaseNumber(phoneNumber, webhookUrls)
  }

  async releaseNumber(numberSid: string): Promise<ReleaseResult> {
    return telnyxService.releaseNumber(numberSid)
  }

  async sendSms(from: string, to: string, body: string): Promise<SmsResult> {
    return telnyxService.sendSms(from, to, body)
  }

  async configureWebhooks(
    numberSid: string,
    webhookUrls: { smsUrl?: string; voiceUrl?: string; statusUrl?: string }
  ): Promise<{ success: boolean; error?: string }> {
    return telnyxService.configureWebhooks(numberSid, webhookUrls)
  }

  async getPricing(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile'
  ): Promise<PricingInfo | null> {
    // Telnyx pricing (known for competitive rates)
    const baseCosts: Record<string, number> = {
      US: 0.50,
      CA: 0.50,
      GB: 1.00,
      DE: 1.00,
      FR: 1.00,
      AU: 1.00,
    }

    const monthlyCost = baseCosts[countryCode] || 0.75
    const typeMultiplier = type === 'toll-free' ? 3.0 : type === 'mobile' ? 1.5 : 1.0

    return {
      monthlyCost: monthlyCost * typeMultiplier,
      setupCost: 0,
      inboundVoiceCost: 0.003,
      outboundVoiceCost: 0.007,
      inboundSmsCost: 0.003,
      outboundSmsCost: 0.004,
      currency: 'USD',
    }
  }

  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    // Telnyx uses signature verification
    // Would need to implement ED25519 signature verification
    return true
  }

  async supportsCountry(countryCode: string): Promise<boolean> {
    // Telnyx has good international coverage
    const unsupported = ['KP', 'IR', 'CU', 'SY']
    return !unsupported.includes(countryCode)
  }

  clearCache(): void {
    telnyxService.clearCache()
  }
}
