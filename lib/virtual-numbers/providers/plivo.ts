// Plivo Provider Service for Virtual Numbers
// Documentation: https://www.plivo.com/docs/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { query } from '@/lib/db'
import {
  VirtualNumberProvider,
  AvailableNumber as BaseAvailableNumber,
  PurchaseResult as BasePurchaseResult,
  ReleaseResult,
  SmsResult as BaseSmsResult,
  HealthCheckResult,
  PricingInfo,
} from './base'

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality?: string
  region?: string
  capabilities: {
    sms: boolean
    voice: boolean
    mms: boolean
  }
}

export interface PurchaseResult {
  success: boolean
  numberSid: string
  phoneNumber: string
  error?: string
}

export interface SmsResult {
  success: boolean
  messageSid: string
  status: string
  error?: string
}

interface PlivoCredentials {
  authId: string
  authToken: string
  isEnabled: boolean
}

// Cache credentials for 1 minute
let credentialsCache: { credentials: PlivoCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000

class PlivoService {
  private async getCredentials(): Promise<PlivoCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      const settings = await getSiteSettingsByGroup('api')

      const isEnabled = settings.plivoEnabled === true || settings.plivoEnabled === 'true'
      if (!isEnabled) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const authId = settings.plivoAuthId || ''
      const authToken = settings.plivoAuthToken || ''

      const credentials: PlivoCredentials | null = authId && authToken
        ? { authId, authToken, isEnabled }
        : null

      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error fetching Plivo credentials:', error)
      return null
    }
  }

  clearCache(): void {
    credentialsCache = null
  }

  private getAuthHeader(credentials: PlivoCredentials): string {
    return 'Basic ' + Buffer.from(`${credentials.authId}:${credentials.authToken}`).toString('base64')
  }

  private getBaseUrl(credentials: PlivoCredentials): string {
    return `https://api.plivo.com/v1/Account/${credentials.authId}`
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Plivo not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials)}/`, {
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        return { success: false, error: data.error || 'Authentication failed' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection failed' }
    }
  }

  async searchNumbers(
    countryCode: string,
    type: 'local' | 'tollFree' | 'mobile' = 'local',
    pattern?: string,
    limit: number = 20
  ): Promise<AvailableNumber[]> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      console.warn('Plivo not configured')
      return []
    }

    try {
      const params = new URLSearchParams({
        country_iso: countryCode,
        type: type === 'tollFree' ? 'tollfree' : type,
        limit: limit.toString()
      })

      if (pattern) {
        params.append('pattern', pattern)
      }

      const response = await fetch(
        `${this.getBaseUrl(credentials)}/PhoneNumber/?${params.toString()}`,
        {
          headers: {
            'Authorization': this.getAuthHeader(credentials),
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        console.error('Plivo search error:', await response.text())
        return []
      }

      const data = await response.json()

      return (data.objects || []).map((n: any) => ({
        phoneNumber: n.number,
        friendlyName: n.number,
        locality: n.region || '',
        region: countryCode,
        capabilities: {
          sms: n.sms_enabled || false,
          voice: n.voice_enabled || false,
          mms: false
        }
      }))
    } catch (error) {
      console.error('Plivo search error:', error)
      return []
    }
  }

  async purchaseNumber(phoneNumber: string): Promise<PurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, numberSid: '', phoneNumber: '', error: 'Plivo not configured' }
    }

    try {
      const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenorar.com'

      const response = await fetch(`${this.getBaseUrl(credentials)}/PhoneNumber/${phoneNumber}/`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_id: '', // Can be set if using Plivo applications
          // Webhooks are configured at application level in Plivo
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          numberSid: '',
          phoneNumber: '',
          error: data.error || 'Failed to purchase number'
        }
      }

      return {
        success: true,
        numberSid: data.number || phoneNumber,
        phoneNumber: data.number || phoneNumber
      }
    } catch (error: any) {
      return {
        success: false,
        numberSid: '',
        phoneNumber: '',
        error: error.message || 'Failed to purchase number'
      }
    }
  }

  async releaseNumber(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Plivo not configured' }
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials)}/Number/${phoneNumber}/`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': this.getAuthHeader(credentials)
          }
        }
      )

      if (!response.ok && response.status !== 204) {
        const error = await response.json()
        return { success: false, error: error.error || 'Failed to release number' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to release number' }
    }
  }

  async sendSms(from: string, to: string, text: string): Promise<SmsResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, messageSid: '', status: '', error: 'Plivo not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials)}/Message/`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          src: from,
          dst: to,
          text: text
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          messageSid: '',
          status: '',
          error: data.error || 'Failed to send SMS'
        }
      }

      return {
        success: true,
        messageSid: data.message_uuid?.[0] || '',
        status: 'queued'
      }
    } catch (error: any) {
      return {
        success: false,
        messageSid: '',
        status: '',
        error: error.message || 'Failed to send SMS'
      }
    }
  }
}

export const plivoService = new PlivoService()

/**
 * Plivo adapter implementing VirtualNumberProvider interface
 */
export class PlivoProviderAdapter implements VirtualNumberProvider {
  readonly slug = 'plivo'
  readonly name = 'Plivo'

  async testConnection(): Promise<HealthCheckResult> {
    const result = await plivoService.testConnection()
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
  ): Promise<BaseAvailableNumber[]> {
    const plivoType = type === 'toll-free' ? 'tollFree' : type
    const numbers = await plivoService.searchNumbers(
      countryCode,
      plivoType as any,
      options?.areaCode || options?.contains,
      options?.limit || 20
    )

    return numbers.map(n => ({
      phoneNumber: n.phoneNumber.startsWith('+') ? n.phoneNumber : `+${n.phoneNumber}`,
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
  ): Promise<BasePurchaseResult> {
    const cleanNumber = phoneNumber.replace(/^\+/, '')
    const result = await plivoService.purchaseNumber(cleanNumber)
    return {
      success: result.success,
      numberSid: result.numberSid,
      phoneNumber: result.phoneNumber,
      error: result.error,
    }
  }

  async releaseNumber(numberSid: string): Promise<ReleaseResult> {
    const cleanNumber = numberSid.replace(/^\+/, '')
    return plivoService.releaseNumber(cleanNumber)
  }

  async sendSms(from: string, to: string, body: string): Promise<BaseSmsResult> {
    const result = await plivoService.sendSms(from, to, body)
    return {
      success: result.success,
      messageSid: result.messageSid,
      status: result.status,
      error: result.error,
    }
  }

  async configureWebhooks(
    numberSid: string,
    webhookUrls: { smsUrl?: string; voiceUrl?: string; statusUrl?: string }
  ): Promise<{ success: boolean; error?: string }> {
    // Plivo uses applications for webhooks, not per-number configuration
    // Would need to create/update Plivo application with webhook URLs
    return { success: true }
  }

  async getPricing(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile'
  ): Promise<PricingInfo | null> {
    // Plivo pricing estimates (often cheaper than Twilio)
    const baseCosts: Record<string, number> = {
      US: 0.80,
      CA: 0.80,
      GB: 1.10,
      DE: 1.10,
      FR: 1.10,
      AU: 1.10,
    }

    const monthlyCost = baseCosts[countryCode] || 0.80
    const typeMultiplier = type === 'toll-free' ? 2.0 : type === 'mobile' ? 1.5 : 1.0

    return {
      monthlyCost: monthlyCost * typeMultiplier,
      setupCost: 0,
      inboundVoiceCost: 0.0085,
      outboundVoiceCost: 0.01,
      inboundSmsCost: 0.0,
      outboundSmsCost: 0.0055,
      currency: 'USD',
    }
  }

  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    // Plivo webhook signature validation
    // Would need to implement HMAC-SHA256 verification
    return true
  }

  async supportsCountry(countryCode: string): Promise<boolean> {
    const unsupported = ['KP', 'IR', 'CU', 'SY']
    return !unsupported.includes(countryCode)
  }

  clearCache(): void {
    plivoService.clearCache()
  }
}
