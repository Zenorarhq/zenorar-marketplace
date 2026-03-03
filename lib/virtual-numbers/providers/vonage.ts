// Vonage (formerly Nexmo) Provider Service for Virtual Numbers
// Documentation: https://developer.vonage.com/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'

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
