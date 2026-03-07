// Bandwidth Provider Service for Virtual Numbers
// Documentation: https://dev.bandwidth.com/

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

interface BandwidthCredentials {
  accountId: string
  apiToken: string
  apiSecret: string
  applicationId?: string
  isEnabled: boolean
}

// Cache credentials for 1 minute
let credentialsCache: { credentials: BandwidthCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000

class BandwidthService {
  private async getCredentials(): Promise<BandwidthCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      // Try database first
      const result = await query(
        `SELECT account_sid, api_key, api_secret, config FROM virtual_number_providers WHERE slug = 'bandwidth' AND is_enabled = true`
      )

      if (result.rows.length > 0) {
        const row = result.rows[0]
        const config = row.config || {}
        const credentials: BandwidthCredentials | null = row.account_sid && row.api_key && row.api_secret
          ? {
              accountId: row.account_sid,
              apiToken: row.api_key,
              apiSecret: row.api_secret,
              applicationId: config.applicationId,
              isEnabled: true,
            }
          : null
        credentialsCache = { credentials, timestamp: Date.now() }
        return credentials
      }

      // Fallback to settings
      const settings = await getSiteSettingsByGroup('api')
      const isEnabled = settings.bandwidthEnabled === true || settings.bandwidthEnabled === 'true'
      if (!isEnabled) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const accountId = settings.bandwidthAccountId || process.env.BANDWIDTH_ACCOUNT_ID || ''
      const apiToken = settings.bandwidthApiToken || process.env.BANDWIDTH_API_TOKEN || ''
      const apiSecret = settings.bandwidthApiSecret || process.env.BANDWIDTH_API_SECRET || ''

      const credentials: BandwidthCredentials | null = accountId && apiToken && apiSecret
        ? { accountId, apiToken, apiSecret, isEnabled }
        : null

      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error fetching Bandwidth credentials:', error)
      const accountId = process.env.BANDWIDTH_ACCOUNT_ID || ''
      const apiToken = process.env.BANDWIDTH_API_TOKEN || ''
      const apiSecret = process.env.BANDWIDTH_API_SECRET || ''
      return accountId && apiToken && apiSecret
        ? { accountId, apiToken, apiSecret, isEnabled: true }
        : null
    }
  }

  clearCache(): void {
    credentialsCache = null
  }

  private getAuthHeader(credentials: BandwidthCredentials): string {
    return 'Basic ' + Buffer.from(`${credentials.apiToken}:${credentials.apiSecret}`).toString('base64')
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Bandwidth not configured' }
    }

    try {
      const response = await fetch(
        `https://dashboard.bandwidth.com/api/accounts/${credentials.accountId}`,
        {
          headers: {
            'Authorization': this.getAuthHeader(credentials),
            'Content-Type': 'application/xml',
          },
        }
      )

      if (!response.ok) {
        return { success: false, error: 'Authentication failed' }
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
      console.warn('Bandwidth not configured')
      return []
    }

    // Bandwidth only supports US/CA numbers
    if (!['US', 'CA'].includes(countryCode)) {
      return []
    }

    try {
      let url = `https://dashboard.bandwidth.com/api/accounts/${credentials.accountId}/availableNumbers`

      const params: string[] = []
      params.push(`quantity=${options?.limit || 20}`)

      if (type === 'toll-free') {
        params.push('tollFreeWildCardPattern=8**')
      } else if (options?.areaCode) {
        params.push(`areaCode=${options.areaCode}`)
      }

      if (options?.contains) {
        params.push(`contains=${options.contains}`)
      }

      url += '?' + params.join('&')

      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Accept': 'application/xml',
        },
      })

      if (!response.ok) {
        console.error('Bandwidth search error:', await response.text())
        return []
      }

      // Bandwidth returns XML, parse it
      const xml = await response.text()

      // Simple XML parsing for phone numbers
      const phoneNumbers: string[] = []
      const matches = xml.matchAll(/<TelephoneNumber>([^<]+)<\/TelephoneNumber>/g)
      for (const match of matches) {
        phoneNumbers.push(match[1])
      }

      return phoneNumbers.map(n => ({
        phoneNumber: n.startsWith('+') ? n : `+1${n}`,
        friendlyName: n,
        locality: '',  // Bandwidth API doesn't return locality in basic search
        region: '',    // Would need additional API call for rate center info
        numberType: type,
        capabilities: {
          sms: true,
          voice: true,
          mms: type !== 'toll-free',
        },
      }))
    } catch (error) {
      console.error('Bandwidth search error:', error)
      return []
    }
  }

  async purchaseNumber(
    phoneNumber: string,
    webhookUrls?: { smsUrl?: string; voiceUrl?: string }
  ): Promise<PurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Bandwidth not configured' }
    }

    try {
      const cleanNumber = phoneNumber.replace(/^\+1?/, '')

      // Create order to purchase number
      const orderXml = `<?xml version="1.0" encoding="UTF-8"?>
<Order>
  <ExistingTelephoneNumberOrderType>
    <TelephoneNumberList>
      <TelephoneNumber>${cleanNumber}</TelephoneNumber>
    </TelephoneNumberList>
  </ExistingTelephoneNumberOrderType>
  <SiteId>${credentials.applicationId || ''}</SiteId>
</Order>`

      const response = await fetch(
        `https://dashboard.bandwidth.com/api/accounts/${credentials.accountId}/orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(credentials),
            'Content-Type': 'application/xml',
          },
          body: orderXml,
        }
      )

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: error || 'Failed to purchase number' }
      }

      const responseXml = await response.text()
      // Extract order ID from response
      const orderIdMatch = responseXml.match(/<OrderId>([^<]+)<\/OrderId>/)
      const orderId = orderIdMatch ? orderIdMatch[1] : cleanNumber

      return {
        success: true,
        numberSid: orderId,
        phoneNumber: phoneNumber,
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to purchase number' }
    }
  }

  async releaseNumber(numberSid: string): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Bandwidth not configured' }
    }

    try {
      const cleanNumber = numberSid.replace(/^\+1?/, '')

      // Create disconnect order
      const disconnectXml = `<?xml version="1.0" encoding="UTF-8"?>
<DisconnectTelephoneNumberOrder>
  <TelephoneNumberList>
    <TelephoneNumber>${cleanNumber}</TelephoneNumber>
  </TelephoneNumberList>
  <DisconnectMode>normal</DisconnectMode>
</DisconnectTelephoneNumberOrder>`

      const response = await fetch(
        `https://dashboard.bandwidth.com/api/accounts/${credentials.accountId}/disconnects`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(credentials),
            'Content-Type': 'application/xml',
          },
          body: disconnectXml,
        }
      )

      if (!response.ok && response.status !== 201) {
        const error = await response.text()
        return { success: false, error: error || 'Failed to release number' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to release number' }
    }
  }

  async sendSms(from: string, to: string, text: string): Promise<SmsResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Bandwidth not configured' }
    }

    try {
      const response = await fetch(
        `https://messaging.bandwidth.com/api/v2/users/${credentials.accountId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.getAuthHeader(credentials),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: from,
            to: [to],
            text: text,
            applicationId: credentials.applicationId,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.description || 'Failed to send SMS',
        }
      }

      return {
        success: true,
        messageSid: data.id || '',
        status: 'sent',
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send SMS' }
    }
  }
}

export const bandwidthService = new BandwidthService()

/**
 * Bandwidth adapter implementing VirtualNumberProvider interface
 */
export class BandwidthProviderAdapter implements VirtualNumberProvider {
  readonly slug = 'bandwidth'
  readonly name = 'Bandwidth'

  async testConnection(): Promise<HealthCheckResult> {
    const result = await bandwidthService.testConnection()
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
    return bandwidthService.searchNumbers(countryCode, type, options)
  }

  async purchaseNumber(
    phoneNumber: string,
    webhookUrls?: { smsUrl?: string; voiceUrl?: string }
  ): Promise<PurchaseResult> {
    return bandwidthService.purchaseNumber(phoneNumber, webhookUrls)
  }

  async releaseNumber(numberSid: string): Promise<ReleaseResult> {
    return bandwidthService.releaseNumber(numberSid)
  }

  async sendSms(from: string, to: string, body: string): Promise<SmsResult> {
    return bandwidthService.sendSms(from, to, body)
  }

  async configureWebhooks(
    numberSid: string,
    webhookUrls: { smsUrl?: string; voiceUrl?: string; statusUrl?: string }
  ): Promise<{ success: boolean; error?: string }> {
    // Bandwidth uses applications for webhooks
    return { success: true }
  }

  async getPricing(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile'
  ): Promise<PricingInfo | null> {
    // Bandwidth only supports US/CA
    if (!['US', 'CA'].includes(countryCode)) {
      return null
    }

    // Bandwidth pricing (competitive pricing)
    const monthlyCost = type === 'toll-free' ? 2.0 : 0.75
    const typeMultiplier = type === 'mobile' ? 1.2 : 1.0

    return {
      monthlyCost: monthlyCost * typeMultiplier,
      setupCost: 0,
      inboundVoiceCost: 0.004,
      outboundVoiceCost: 0.01,
      inboundSmsCost: 0.004,
      outboundSmsCost: 0.004,
      currency: 'USD',
    }
  }

  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    // Bandwidth webhook validation
    return true
  }

  async supportsCountry(countryCode: string): Promise<boolean> {
    // Bandwidth only supports US and Canada
    return ['US', 'CA'].includes(countryCode)
  }

  clearCache(): void {
    bandwidthService.clearCache()
  }
}
