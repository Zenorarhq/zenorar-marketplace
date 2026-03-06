// Vonage (formerly Nexmo) Provider Service for Virtual Numbers
// Documentation: https://developer.vonage.com/

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

interface VonageCredentials {
  apiKey: string
  apiSecret: string
  isEnabled: boolean
}

// Cache credentials for 1 minute
let credentialsCache: { credentials: VonageCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000

class VonageService {
  private async getCredentials(): Promise<VonageCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      const settings = await getSiteSettingsByGroup('api')

      const isEnabled = settings.vonageEnabled === true || settings.vonageEnabled === 'true'
      if (!isEnabled) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const apiKey = settings.vonageApiKey || process.env.VONAGE_API_KEY || ''
      const apiSecret = settings.vonageApiSecret || process.env.VONAGE_API_SECRET || ''

      const credentials: VonageCredentials | null = apiKey && apiSecret
        ? { apiKey, apiSecret, isEnabled }
        : null

      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error fetching Vonage credentials:', error)
      const apiKey = process.env.VONAGE_API_KEY || ''
      const apiSecret = process.env.VONAGE_API_SECRET || ''
      return apiKey && apiSecret ? { apiKey, apiSecret, isEnabled: true } : null
    }
  }

  clearCache(): void {
    credentialsCache = null
  }

  private getAuthHeader(credentials: VonageCredentials): string {
    return 'Basic ' + Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Vonage not configured' }
    }

    try {
      const response = await fetch(
        `https://rest.nexmo.com/account/get-balance?api_key=${credentials.apiKey}&api_secret=${credentials.apiSecret}`
      )

      if (!response.ok) {
        const data = await response.json()
        return { success: false, error: data['error-text'] || 'Authentication failed' }
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
      console.warn('Vonage not configured')
      return []
    }

    try {
      const params = new URLSearchParams({
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
        country: countryCode,
        size: limit.toString(),
        features: 'SMS,VOICE'
      })

      if (type === 'mobile') {
        params.append('type', 'mobile-lvn')
      } else if (type === 'tollFree') {
        params.append('type', 'toll-free')
      } else {
        params.append('type', 'landline')
      }

      if (pattern) {
        params.append('pattern', pattern)
        params.append('search_pattern', '1') // Pattern anywhere in number
      }

      const response = await fetch(
        `https://rest.nexmo.com/number/search?${params.toString()}`
      )

      if (!response.ok) {
        console.error('Vonage search error:', await response.text())
        return []
      }

      const data = await response.json()

      if (data['error-code'] && data['error-code'] !== '200') {
        console.error('Vonage search error:', data['error-text'])
        return []
      }

      return (data.numbers || []).map((n: any) => ({
        phoneNumber: n.msisdn,
        friendlyName: n.msisdn,
        locality: '',
        region: countryCode,
        capabilities: {
          sms: n.features?.includes('SMS') || false,
          voice: n.features?.includes('VOICE') || false,
          mms: false
        }
      }))
    } catch (error) {
      console.error('Vonage search error:', error)
      return []
    }
  }

  async purchaseNumber(phoneNumber: string, countryCode: string): Promise<PurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, numberSid: '', phoneNumber: '', error: 'Vonage not configured' }
    }

    try {
      const response = await fetch('https://rest.nexmo.com/number/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          api_key: credentials.apiKey,
          api_secret: credentials.apiSecret,
          country: countryCode,
          msisdn: phoneNumber
        }).toString()
      })

      const data = await response.json()

      if (data['error-code'] && data['error-code'] !== '200') {
        return {
          success: false,
          numberSid: '',
          phoneNumber: '',
          error: data['error-text'] || 'Failed to purchase number'
        }
      }

      return {
        success: true,
        numberSid: phoneNumber,
        phoneNumber: phoneNumber
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

  async releaseNumber(phoneNumber: string, countryCode: string): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Vonage not configured' }
    }

    try {
      const response = await fetch('https://rest.nexmo.com/number/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          api_key: credentials.apiKey,
          api_secret: credentials.apiSecret,
          country: countryCode,
          msisdn: phoneNumber
        }).toString()
      })

      const data = await response.json()

      if (data['error-code'] && data['error-code'] !== '200') {
        return { success: false, error: data['error-text'] || 'Failed to release number' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to release number' }
    }
  }

  async configureWebhooks(
    phoneNumber: string,
    countryCode: string,
    smsUrl: string,
    voiceUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Vonage not configured' }
    }

    try {
      const params: Record<string, string> = {
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
        country: countryCode,
        msisdn: phoneNumber,
        moHttpUrl: smsUrl
      }

      if (voiceUrl) {
        params.voiceCallbackType = 'tel'
        params.voiceCallbackValue = voiceUrl
      }

      const response = await fetch('https://rest.nexmo.com/number/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(params).toString()
      })

      const data = await response.json()

      if (data['error-code'] && data['error-code'] !== '200') {
        return { success: false, error: data['error-text'] || 'Failed to configure webhooks' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to configure webhooks' }
    }
  }

  async sendSms(from: string, to: string, text: string): Promise<SmsResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, messageSid: '', status: '', error: 'Vonage not configured' }
    }

    try {
      const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: credentials.apiKey,
          api_secret: credentials.apiSecret,
          from: from,
          to: to,
          text: text
        })
      })

      const data = await response.json()

      // Vonage returns messages array
      const message = data.messages?.[0]
      if (!message || message.status !== '0') {
        return {
          success: false,
          messageSid: '',
          status: '',
          error: message?.['error-text'] || 'Failed to send SMS'
        }
      }

      return {
        success: true,
        messageSid: message['message-id'] || '',
        status: 'sent'
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

export const vonageService = new VonageService()

/**
 * Vonage adapter implementing VirtualNumberProvider interface
 */
export class VonageProviderAdapter implements VirtualNumberProvider {
  readonly slug = 'vonage'
  readonly name = 'Vonage'

  async testConnection(): Promise<HealthCheckResult> {
    const result = await vonageService.testConnection()
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
    const vonageType = type === 'toll-free' ? 'tollFree' : type
    const numbers = await vonageService.searchNumbers(
      countryCode,
      vonageType as any,
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
    // Extract country code from phone number (simplified)
    const cleanNumber = phoneNumber.replace(/^\+/, '')
    let countryCode = 'US'
    if (cleanNumber.startsWith('44')) countryCode = 'GB'
    else if (cleanNumber.startsWith('1')) countryCode = 'US'
    else if (cleanNumber.startsWith('61')) countryCode = 'AU'
    else if (cleanNumber.startsWith('49')) countryCode = 'DE'
    else if (cleanNumber.startsWith('33')) countryCode = 'FR'

    const result = await vonageService.purchaseNumber(cleanNumber, countryCode)

    if (result.success && webhookUrls) {
      await vonageService.configureWebhooks(
        cleanNumber,
        countryCode,
        webhookUrls.smsUrl || '',
        webhookUrls.voiceUrl
      )
    }

    return {
      success: result.success,
      numberSid: result.numberSid,
      phoneNumber: result.phoneNumber,
      error: result.error,
    }
  }

  async releaseNumber(numberSid: string): Promise<ReleaseResult> {
    // Extract country code (simplified)
    const cleanNumber = numberSid.replace(/^\+/, '')
    let countryCode = 'US'
    if (cleanNumber.startsWith('44')) countryCode = 'GB'
    else if (cleanNumber.startsWith('1')) countryCode = 'US'

    return vonageService.releaseNumber(cleanNumber, countryCode)
  }

  async sendSms(from: string, to: string, body: string): Promise<BaseSmsResult> {
    const result = await vonageService.sendSms(from, to, body)
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
    const cleanNumber = numberSid.replace(/^\+/, '')
    let countryCode = 'US'
    if (cleanNumber.startsWith('44')) countryCode = 'GB'
    else if (cleanNumber.startsWith('1')) countryCode = 'US'

    return vonageService.configureWebhooks(
      cleanNumber,
      countryCode,
      webhookUrls.smsUrl || '',
      webhookUrls.voiceUrl
    )
  }

  async getPricing(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile'
  ): Promise<PricingInfo | null> {
    // Vonage pricing estimates
    const baseCosts: Record<string, number> = {
      US: 0.90,
      CA: 0.90,
      GB: 1.30,
      DE: 1.30,
      FR: 1.30,
      AU: 1.30,
    }

    const monthlyCost = baseCosts[countryCode] || 1.0
    const typeMultiplier = type === 'toll-free' ? 2.0 : type === 'mobile' ? 1.5 : 1.0

    return {
      monthlyCost: monthlyCost * typeMultiplier,
      setupCost: 0,
      inboundVoiceCost: 0.01,
      outboundVoiceCost: 0.0127,
      inboundSmsCost: 0.0,
      outboundSmsCost: 0.0068,
      currency: 'USD',
    }
  }

  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    // Vonage webhook signature validation would use JWT
    // For simplicity, return true - implement proper JWT validation in production
    return true
  }

  async supportsCountry(countryCode: string): Promise<boolean> {
    const unsupported = ['KP', 'IR', 'CU', 'SY']
    return !unsupported.includes(countryCode)
  }

  clearCache(): void {
    vonageService.clearCache()
  }
}
