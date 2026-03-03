// Plivo Provider Service for Virtual Numbers
// Documentation: https://www.plivo.com/docs/

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

      const authId = settings.plivoAuthId || process.env.PLIVO_AUTH_ID || ''
      const authToken = settings.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || ''

      const credentials: PlivoCredentials | null = authId && authToken
        ? { authId, authToken, isEnabled }
        : null

      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error fetching Plivo credentials:', error)
      const authId = process.env.PLIVO_AUTH_ID || ''
      const authToken = process.env.PLIVO_AUTH_TOKEN || ''
      return authId && authToken ? { authId, authToken, isEnabled: true } : null
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
