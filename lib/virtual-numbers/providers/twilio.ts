// Twilio Provider Service for Virtual Numbers
// Reads credentials from database settings (admin-configured)

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

interface TwilioCredentials {
  accountSid: string
  authToken: string
  phoneNumber: string
  isTestMode: boolean
}

// Cache credentials for 1 minute to avoid repeated DB calls
let credentialsCache: { credentials: TwilioCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000 // 1 minute

class TwilioService {
  /**
   * Get Twilio credentials from database settings
   * Falls back to environment variables if DB fetch fails
   */
  private async getCredentials(): Promise<TwilioCredentials | null> {
    // Check cache first
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      // Settings are saved under 'api' group by admin settings page
      const settings = await getSiteSettingsByGroup('api')

      const twilioEnabled = settings.twilioEnabled === true || settings.twilioEnabled === 'true'
      // If not explicitly set, check if credentials exist (assume enabled)
      const hasCredentials = settings.twilioLiveAccountSid || settings.twilioTestAccountSid
      if (!twilioEnabled && !hasCredentials) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const mode = settings.twilioMode || 'test'
      const isTestMode = mode === 'test'

      let accountSid: string
      let authToken: string
      let phoneNumber: string

      if (isTestMode) {
        accountSid = settings.twilioTestAccountSid || process.env.TWILIO_TEST_ACCOUNT_SID || ''
        authToken = settings.twilioTestAuthToken || process.env.TWILIO_TEST_AUTH_TOKEN || ''
        phoneNumber = settings.twilioTestPhoneNumber || process.env.TWILIO_TEST_PHONE_NUMBER || ''
      } else {
        accountSid = settings.twilioLiveAccountSid || process.env.TWILIO_ACCOUNT_SID || ''
        authToken = settings.twilioLiveAuthToken || process.env.TWILIO_AUTH_TOKEN || ''
        phoneNumber = settings.twilioLivePhoneNumber || process.env.TWILIO_PHONE_NUMBER || ''
      }

      const credentials: TwilioCredentials | null = accountSid && authToken
        ? { accountSid, authToken, phoneNumber, isTestMode }
        : null

      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error fetching Twilio credentials from DB:', error)
      // Fall back to environment variables
      const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
      const authToken = process.env.TWILIO_AUTH_TOKEN || ''
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER || ''

      return accountSid && authToken
        ? { accountSid, authToken, phoneNumber, isTestMode: false }
        : null
    }
  }

  /**
   * Clear credentials cache (call after settings update)
   */
  clearCache(): void {
    credentialsCache = null
  }

  private getAuthHeader(credentials: TwilioCredentials): string {
    return 'Basic ' + Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64')
  }

  private getBaseUrl(credentials: TwilioCredentials): string {
    return `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}`
  }

  /**
   * Test the Twilio connection with current credentials
   */
  async testConnection(): Promise<{ success: boolean; mode: string; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, mode: 'none', error: 'Twilio not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials)}.json`, {
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        return {
          success: false,
          mode: credentials.isTestMode ? 'test' : 'live',
          error: data.message || 'Authentication failed'
        }
      }

      return {
        success: true,
        mode: credentials.isTestMode ? 'test' : 'live'
      }
    } catch (error: any) {
      return {
        success: false,
        mode: credentials.isTestMode ? 'test' : 'live',
        error: error.message || 'Connection failed'
      }
    }
  }

  /**
   * Search for available phone numbers
   */
  async searchNumbers(
    countryCode: string,
    type: 'local' | 'tollFree' | 'mobile' = 'local',
    areaCode?: string,
    limit: number = 20
  ): Promise<AvailableNumber[]> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      console.warn('Twilio not configured, returning empty results')
      return []
    }

    try {
      const typeEndpoint = type === 'tollFree' ? 'TollFree' : type === 'mobile' ? 'Mobile' : 'Local'
      let url = `${this.getBaseUrl(credentials)}/AvailablePhoneNumbers/${countryCode}/${typeEndpoint}.json?PageSize=${limit}`

      // In live mode, only show SMS-enabled numbers (for actual messaging)
      // In test mode, show all numbers (test numbers often don't have SMS capability)
      if (!credentials.isTestMode) {
        url += '&SmsEnabled=true'
      }

      if (areaCode) {
        url += `&AreaCode=${areaCode}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Twilio search error:', error)
        return []
      }

      const data = await response.json()

      return (data.available_phone_numbers || []).map((n: any) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        locality: n.locality,
        region: n.region,
        capabilities: {
          // Twilio returns uppercase SMS/MMS but lowercase voice
          sms: n.capabilities?.SMS || n.capabilities?.sms || false,
          voice: n.capabilities?.voice || n.capabilities?.Voice || false,
          mms: n.capabilities?.MMS || n.capabilities?.mms || false
        }
      }))
    } catch (error) {
      console.error('Twilio search error:', error)
      return []
    }
  }

  /**
   * Purchase a phone number
   */
  async purchaseNumber(phoneNumber: string): Promise<PurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, numberSid: '', phoneNumber: '', error: 'Twilio not configured' }
    }

    try {
      const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://zenorar.com'

      const formData = new URLSearchParams()
      formData.append('PhoneNumber', phoneNumber)
      formData.append('SmsUrl', `${webhookBaseUrl}/api/webhooks/twilio/sms`)
      formData.append('SmsMethod', 'POST')
      formData.append('VoiceUrl', `${webhookBaseUrl}/api/webhooks/twilio/voice`)
      formData.append('VoiceMethod', 'POST')

      const response = await fetch(`${this.getBaseUrl(credentials)}/IncomingPhoneNumbers.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          numberSid: '',
          phoneNumber: '',
          error: data.message || 'Failed to purchase number'
        }
      }

      return {
        success: true,
        numberSid: data.sid,
        phoneNumber: data.phone_number
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

  /**
   * Release a phone number (cancel)
   */
  async releaseNumber(numberSid: string): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Twilio not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials)}/IncomingPhoneNumbers/${numberSid}.json`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthHeader(credentials)
        }
      })

      if (!response.ok && response.status !== 204) {
        const error = await response.json()
        return { success: false, error: error.message || 'Failed to release number' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to release number' }
    }
  }

  /**
   * Send outbound SMS
   */
  async sendSms(from: string, to: string, body: string): Promise<SmsResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, messageSid: '', status: '', error: 'Twilio not configured' }
    }

    try {
      const formData = new URLSearchParams()
      formData.append('From', from)
      formData.append('To', to)
      formData.append('Body', body)

      const response = await fetch(`${this.getBaseUrl(credentials)}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          messageSid: '',
          status: '',
          error: data.message || 'Failed to send SMS'
        }
      }

      return {
        success: true,
        messageSid: data.sid,
        status: data.status
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

  /**
   * Update webhook URLs for a number
   */
  async configureWebhook(numberSid: string, smsUrl: string, voiceUrl?: string): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Twilio not configured' }
    }

    try {
      const formData = new URLSearchParams()
      formData.append('SmsUrl', smsUrl)
      formData.append('SmsMethod', 'POST')
      if (voiceUrl) {
        formData.append('VoiceUrl', voiceUrl)
        formData.append('VoiceMethod', 'POST')
      }

      const response = await fetch(`${this.getBaseUrl(credentials)}/IncomingPhoneNumbers/${numberSid}.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Failed to configure webhook' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to configure webhook' }
    }
  }

  /**
   * Validate Twilio webhook signature
   * Note: This is synchronous but needs credentials, so it fetches them first
   */
  async validateWebhookSignatureAsync(signature: string, url: string, params: Record<string, string>): Promise<boolean> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return false
    }

    try {
      const crypto = require('crypto')

      // Build the data string
      const sortedParams = Object.keys(params).sort()
      let data = url
      for (const key of sortedParams) {
        data += key + params[key]
      }

      // Create HMAC SHA1 signature
      const expectedSignature = crypto
        .createHmac('sha1', credentials.authToken)
        .update(data)
        .digest('base64')

      return signature === expectedSignature
    } catch (error) {
      console.error('Signature validation error:', error)
      return false
    }
  }

  /**
   * Synchronous signature validation - uses cached credentials or env vars
   * For webhook handlers that need sync validation
   */
  validateWebhookSignature(signature: string, url: string, params: Record<string, string>): boolean {
    // Use cached credentials if available
    let authToken = ''
    if (credentialsCache?.credentials) {
      authToken = credentialsCache.credentials.authToken
    } else {
      // Fall back to env var for sync call
      authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TEST_AUTH_TOKEN || ''
    }

    if (!authToken) {
      return false
    }

    try {
      const crypto = require('crypto')

      const sortedParams = Object.keys(params).sort()
      let data = url
      for (const key of sortedParams) {
        data += key + params[key]
      }

      const expectedSignature = crypto
        .createHmac('sha1', authToken)
        .update(data)
        .digest('base64')

      return signature === expectedSignature
    } catch (error) {
      console.error('Signature validation error:', error)
      return false
    }
  }
}

export const twilioService = new TwilioService()
