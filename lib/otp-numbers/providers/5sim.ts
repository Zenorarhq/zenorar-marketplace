// 5sim OTP Provider
// Documentation: https://5sim.net/docs/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type { OtpProvider, OtpService, OtpCountry, OtpNumber } from '../types'

/**
 * Strip HTML tags from error messages
 */
function stripHtmlTags(str: string): string {
  if (!str) return str
  return str.replace(/<[^>]*>/g, '').trim()
}

/**
 * Convert provider error messages to user-friendly messages
 */
function sanitizeErrorMessage(msg: string): string {
  const cleaned = stripHtmlTags(msg)

  // Provider balance issues - clearly indicate service issue, not number issue
  if (cleaned.toLowerCase().includes('not enough') || cleaned.toLowerCase().includes('insufficient balance')) {
    return 'Service is temporarily unavailable. Please try again later.'
  }

  // No numbers available
  if (cleaned.toLowerCase().includes('no free phones') || cleaned.toLowerCase().includes('no numbers')) {
    return 'No numbers available for this service. Please try another country.'
  }

  // Service not available
  if (cleaned.toLowerCase().includes('not available') || cleaned.toLowerCase().includes('not found')) {
    return 'This service is not available in the selected country.'
  }

  return cleaned
}

interface FiveSimCredentials {
  apiKey: string
  isEnabled: boolean
}

let credentialsCache: { credentials: FiveSimCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000

// Helper to get OTP settings from the 'api' group
async function getOtpSettings(): Promise<Record<string, any>> {
  return getSiteSettingsByGroup('api')
}

class FiveSimProvider implements OtpProvider {
  name = '5sim'
  private baseUrl = 'https://5sim.net/v1'

  private async getCredentials(): Promise<FiveSimCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      const settings = await getOtpSettings()
      const isEnabled = settings.fivesimEnabled === true || settings.fivesimEnabled === 'true'
      const apiKey = settings.fivesimApiKey || process.env.FIVESIM_API_KEY || ''

      if (!isEnabled || !apiKey) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const credentials = { apiKey, isEnabled }
      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error fetching 5sim credentials:', error)
      const apiKey = process.env.FIVESIM_API_KEY || ''
      return apiKey ? { apiKey, isEnabled: true } : null
    }
  }

  private getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  }

  async getBalance(): Promise<number> {
    const creds = await this.getCredentials()
    if (!creds) return 0

    try {
      const response = await fetch(`${this.baseUrl}/user/profile`, {
        headers: this.getAuthHeaders(creds.apiKey)
      })
      const data = await response.json()
      return parseFloat(data.balance) || 0
    } catch (error) {
      console.error('5sim balance error:', error)
      return 0
    }
  }

  async getServices(): Promise<OtpService[]> {
    const creds = await this.getCredentials()
    if (!creds) return []

    try {
      const response = await fetch(`${this.baseUrl}/guest/products/any/any`, {
        headers: this.getAuthHeaders(creds.apiKey)
      })
      const data = await response.json()

      // 5sim returns services as keys
      const services = Object.keys(data).map(key => ({
        id: key,
        name: this.formatServiceName(key),
        slug: key,
        popular: ['whatsapp', 'telegram', 'google', 'facebook', 'instagram', 'twitter', 'discord', 'tiktok']
          .includes(key.toLowerCase())
      }))

      return services.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))
    } catch (error) {
      console.error('5sim services error:', error)
      return []
    }
  }

  private formatServiceName(slug: string): string {
    const names: Record<string, string> = {
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      google: 'Google/Gmail',
      facebook: 'Facebook',
      instagram: 'Instagram',
      twitter: 'Twitter/X',
      discord: 'Discord',
      tiktok: 'TikTok',
      amazon: 'Amazon',
      microsoft: 'Microsoft',
      netflix: 'Netflix',
      spotify: 'Spotify',
      uber: 'Uber',
      linkedin: 'LinkedIn',
      snapchat: 'Snapchat',
      any: 'Any Service'
    }
    return names[slug.toLowerCase()] || slug.charAt(0).toUpperCase() + slug.slice(1)
  }

  async getCountries(serviceId: string): Promise<OtpCountry[]> {
    const creds = await this.getCredentials()
    if (!creds) return []

    try {
      const response = await fetch(`${this.baseUrl}/guest/countries`, {
        headers: this.getAuthHeaders(creds.apiKey)
      })
      const data = await response.json()

      // 5sim returns country codes as keys
      return Object.entries(data).map(([code, info]: [string, any]) => ({
        id: code,
        name: info.text_en || info.name || code,
        code: code,
        flag: undefined
      }))
    } catch (error) {
      console.error('5sim countries error:', error)
      return []
    }
  }

  async getPrice(serviceId: string, countryCode: string): Promise<number> {
    const creds = await this.getCredentials()
    if (!creds) return 0

    try {
      const response = await fetch(
        `${this.baseUrl}/guest/prices?country=${countryCode}&product=${serviceId}`,
        { headers: this.getAuthHeaders(creds.apiKey) }
      )
      const data = await response.json()

      // Get lowest price from available operators
      if (data[countryCode]?.[serviceId]) {
        const operators = data[countryCode][serviceId]
        let minPrice = Infinity

        for (const operator of Object.values(operators) as any[]) {
          if (operator.cost && operator.cost < minPrice) {
            minPrice = operator.cost
          }
        }

        return minPrice === Infinity ? 0 : minPrice
      }

      return 0
    } catch (error) {
      console.error('5sim price error:', error)
      return 0
    }
  }

  async requestNumber(serviceId: string, countryCode: string): Promise<{
    success: boolean
    number?: OtpNumber
    error?: string
  }> {
    const creds = await this.getCredentials()
    if (!creds) {
      return { success: false, error: '5sim not configured' }
    }

    try {
      // Use 'any' operator for best availability
      const response = await fetch(
        `${this.baseUrl}/user/buy/activation/${countryCode}/any/${serviceId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(creds.apiKey)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: sanitizeErrorMessage(errorText) || 'Failed to get number' }
      }

      const data = await response.json()

      if (!data.id || !data.phone) {
        return { success: false, error: 'Invalid response from 5sim' }
      }

      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 20) // 20 min expiry

      return {
        success: true,
        number: {
          id: data.id.toString(),
          phoneNumber: '+' + data.phone,
          countryCode: countryCode,
          service: serviceId,
          status: 'pending',
          expiresAt,
          createdAt: new Date()
        }
      }
    } catch (error: any) {
      console.error('5sim request error:', error)
      return { success: false, error: error.message || 'Failed to request number' }
    }
  }

  async checkSms(activationId: string): Promise<{
    success: boolean
    status: 'pending' | 'received' | 'cancelled' | 'expired'
    code?: string
    fullSms?: string
    error?: string
  }> {
    const creds = await this.getCredentials()
    if (!creds) {
      return { success: false, status: 'cancelled', error: '5sim not configured' }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/user/check/${activationId}`,
        { headers: this.getAuthHeaders(creds.apiKey) }
      )

      if (!response.ok) {
        return { success: false, status: 'pending', error: 'Failed to check status' }
      }

      const data = await response.json()

      // Status mapping for 5sim
      // PENDING, RECEIVED, CANCELED, TIMEOUT, FINISHED
      if (data.status === 'RECEIVED' && data.sms && data.sms.length > 0) {
        const lastSms = data.sms[data.sms.length - 1]
        const smsText = lastSms.text || lastSms.code || ''

        // Extract code from SMS
        const codeMatch = smsText.match(/\b(\d{4,8})\b/)

        return {
          success: true,
          status: 'received',
          code: lastSms.code || codeMatch?.[1] || '',
          fullSms: smsText
        }
      }

      if (data.status === 'CANCELED') {
        return { success: true, status: 'cancelled' }
      }

      if (data.status === 'TIMEOUT') {
        return { success: true, status: 'expired' }
      }

      if (data.status === 'FINISHED') {
        // Already used
        const lastSms = data.sms?.[data.sms.length - 1]
        return {
          success: true,
          status: 'received',
          code: lastSms?.code || '',
          fullSms: lastSms?.text || ''
        }
      }

      return { success: true, status: 'pending' }
    } catch (error: any) {
      console.error('5sim check error:', error)
      return { success: false, status: 'pending', error: error.message }
    }
  }

  async cancelNumber(activationId: string): Promise<{ success: boolean; error?: string }> {
    const creds = await this.getCredentials()
    if (!creds) {
      return { success: false, error: '5sim not configured' }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/user/cancel/${activationId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(creds.apiKey)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: sanitizeErrorMessage(errorText) || 'Failed to cancel' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('5sim cancel error:', error)
      return { success: false, error: error.message }
    }
  }

  async finishNumber(activationId: string): Promise<{ success: boolean; error?: string }> {
    const creds = await this.getCredentials()
    if (!creds) {
      return { success: false, error: '5sim not configured' }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/user/finish/${activationId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(creds.apiKey)
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: sanitizeErrorMessage(errorText) || 'Failed to finish' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('5sim finish error:', error)
      return { success: false, error: error.message }
    }
  }

  async reportBadNumber(activationId: string): Promise<{ success: boolean }> {
    const creds = await this.getCredentials()
    if (!creds) {
      return { success: false }
    }

    try {
      await fetch(
        `${this.baseUrl}/user/ban/${activationId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(creds.apiKey)
        }
      )
      return { success: true }
    } catch (error) {
      console.error('5sim ban error:', error)
      return { success: false }
    }
  }
}

export const fiveSimProvider = new FiveSimProvider()
