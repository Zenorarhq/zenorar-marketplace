// SMSPool OTP Provider
// Documentation: https://www.smspool.net/api

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type { OtpProvider, OtpService, OtpCountry, OtpNumber } from '../types'

interface SmsPoolCredentials {
  apiKey: string
  isEnabled: boolean
}

let credentialsCache: { credentials: SmsPoolCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000

class SmsPoolProvider implements OtpProvider {
  name = 'smspool'
  private baseUrl = 'https://api.smspool.net'

  private async getCredentials(): Promise<SmsPoolCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      const settings = await getSiteSettingsByGroup('otp')
      const isEnabled = settings.smspoolEnabled === true || settings.smspoolEnabled === 'true'
      const apiKey = settings.smspoolApiKey || process.env.SMSPOOL_API_KEY || ''

      if (!isEnabled || !apiKey) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const credentials = { apiKey, isEnabled }
      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error fetching SMSPool credentials:', error)
      const apiKey = process.env.SMSPOOL_API_KEY || ''
      return apiKey ? { apiKey, isEnabled: true } : null
    }
  }

  async getBalance(): Promise<number> {
    const creds = await this.getCredentials()
    if (!creds) return 0

    try {
      const response = await fetch(`${this.baseUrl}/request/balance?key=${creds.apiKey}`)
      const data = await response.json()
      return parseFloat(data.balance) || 0
    } catch (error) {
      console.error('SMSPool balance error:', error)
      return 0
    }
  }

  async getServices(): Promise<OtpService[]> {
    const creds = await this.getCredentials()
    if (!creds) return []

    try {
      const response = await fetch(`${this.baseUrl}/service/retrieve_all?key=${creds.apiKey}`)
      const data = await response.json()

      if (!Array.isArray(data)) return []

      return data.map((s: any) => ({
        id: s.ID?.toString() || s.service_id?.toString() || '',
        name: s.name || s.service || '',
        slug: (s.name || s.service || '').toLowerCase().replace(/\s+/g, '-'),
        popular: ['whatsapp', 'telegram', 'google', 'facebook', 'instagram', 'twitter']
          .some(p => (s.name || '').toLowerCase().includes(p))
      }))
    } catch (error) {
      console.error('SMSPool services error:', error)
      return []
    }
  }

  async getCountries(serviceId: string): Promise<OtpCountry[]> {
    const creds = await this.getCredentials()
    if (!creds) return []

    try {
      const response = await fetch(
        `${this.baseUrl}/country/retrieve_all?key=${creds.apiKey}&service=${serviceId}`
      )
      const data = await response.json()

      if (!Array.isArray(data)) return []

      return data.map((c: any) => ({
        id: c.ID?.toString() || c.short_name || '',
        name: c.name || '',
        code: c.short_name || '',
        flag: c.flag || undefined
      }))
    } catch (error) {
      console.error('SMSPool countries error:', error)
      return []
    }
  }

  async getPrice(serviceId: string, countryCode: string): Promise<number> {
    const creds = await this.getCredentials()
    if (!creds) return 0

    try {
      const response = await fetch(
        `${this.baseUrl}/request/price?key=${creds.apiKey}&country=${countryCode}&service=${serviceId}`
      )
      const data = await response.json()

      if (data.price) {
        return parseFloat(data.price)
      }
      return 0
    } catch (error) {
      console.error('SMSPool price error:', error)
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
      return { success: false, error: 'SMSPool not configured' }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/purchase/sms?key=${creds.apiKey}&country=${countryCode}&service=${serviceId}`
      )
      const data = await response.json()

      if (data.success === 0 || data.error) {
        return { success: false, error: data.message || data.error || 'Failed to get number' }
      }

      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 20) // 20 min expiry

      return {
        success: true,
        number: {
          id: data.order_id?.toString() || '',
          phoneNumber: data.phonenumber || data.number || '',
          countryCode: countryCode,
          service: serviceId,
          status: 'pending',
          expiresAt,
          createdAt: new Date()
        }
      }
    } catch (error: any) {
      console.error('SMSPool request error:', error)
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
      return { success: false, status: 'cancelled', error: 'SMSPool not configured' }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/sms/check?key=${creds.apiKey}&orderid=${activationId}`
      )
      const data = await response.json()

      if (data.status === 3 || data.sms) {
        // Extract code from SMS
        const smsText = data.sms || data.full_sms || ''
        const codeMatch = smsText.match(/\b(\d{4,8})\b/)

        return {
          success: true,
          status: 'received',
          code: codeMatch?.[1] || data.code || '',
          fullSms: smsText
        }
      }

      if (data.status === 4) {
        return { success: true, status: 'cancelled' }
      }

      if (data.status === 5 || data.status === 6) {
        return { success: true, status: 'expired' }
      }

      return { success: true, status: 'pending' }
    } catch (error: any) {
      console.error('SMSPool check error:', error)
      return { success: false, status: 'pending', error: error.message }
    }
  }

  async cancelNumber(activationId: string): Promise<{ success: boolean; error?: string }> {
    const creds = await this.getCredentials()
    if (!creds) {
      return { success: false, error: 'SMSPool not configured' }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/sms/cancel?key=${creds.apiKey}&orderid=${activationId}`
      )
      const data = await response.json()

      if (data.success === 1) {
        return { success: true }
      }

      return { success: false, error: data.message || 'Failed to cancel' }
    } catch (error: any) {
      console.error('SMSPool cancel error:', error)
      return { success: false, error: error.message }
    }
  }

  async reportBadNumber(activationId: string): Promise<{ success: boolean }> {
    // SMSPool handles refunds automatically for numbers that don't receive SMS
    return { success: true }
  }
}

export const smsPoolProvider = new SmsPoolProvider()
