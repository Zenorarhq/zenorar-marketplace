// Zendit eSIM Provider
// Documentation: https://developers.zendit.io/api/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import {
  EsimProviderInterface,
  AvailableEsimPlan,
  EsimOrderResult,
  EsimUsageStatus,
  TopUpResult,
} from '../types'

interface ZenditCredentials {
  baseUrl: string
  apiKey: string
}

// Cache credentials
let credentialsCache: { credentials: ZenditCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000 // 1 minute

export class ZenditProvider implements EsimProviderInterface {
  readonly name = 'Zendit'
  readonly slug = 'zendit'

  /**
   * Get credentials from database or environment
   */
  private async getCredentials(): Promise<ZenditCredentials | null> {
    // Check cache first
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      const settings = await getSiteSettingsByGroup('api')

      const enabled = settings.zenditEnabled === true || settings.zenditEnabled === 'true'
      const isSandbox = settings.zenditMode === 'sandbox'

      let apiKey: string
      if (isSandbox) {
        apiKey = settings.zenditSandboxApiKey || process.env.ZENDIT_SANDBOX_API_KEY || ''
      } else {
        apiKey = settings.zenditProductionApiKey || process.env.ZENDIT_API_KEY || ''
      }

      // If not explicitly enabled and no credentials, return null
      if (!enabled && !apiKey) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      if (!apiKey) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const baseUrl = isSandbox
        ? 'https://test-api.zendit.io/v1'
        : 'https://api.zendit.io/v1'

      const credentials: ZenditCredentials = { baseUrl, apiKey }
      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error getting Zendit credentials:', error)
      // Fallback to env vars
      const apiKey = process.env.ZENDIT_API_KEY || ''

      if (!apiKey) {
        return null
      }

      return {
        baseUrl: process.env.ZENDIT_API_URL || 'https://api.zendit.io/v1',
        apiKey,
      }
    }
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      throw new Error('Zendit not configured')
    }

    const response = await fetch(`${credentials.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || error.error || `Zendit API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all available eSIM offers/plans
   */
  async getPlans(): Promise<AvailableEsimPlan[]> {
    const allPlans: AvailableEsimPlan[] = []
    let offset = 0
    const limit = 100

    // Paginate through all offers
    while (true) {
      const data = await this.request<{ data: any[] }>(
        'GET',
        `/esim/offers?_limit=${limit}&_offset=${offset}`
      )

      if (!data.data || data.data.length === 0) {
        break
      }

      const plans = data.data.map((offer) => ({
        providerPlanId: offer.offerId || offer.id,
        name: offer.name || offer.title || `${offer.brand} - ${offer.dataGb}GB`,
        description: offer.description || `${offer.dataGb}GB data for ${offer.durationDays} days`,
        countries: offer.countries || (offer.country ? [offer.country] : []),
        dataAmountGb: parseFloat(offer.dataGb) || parseFloat(offer.data) || 0,
        dataAmountDisplay: offer.dataDisplay || `${offer.dataGb || offer.data}GB`,
        validityDays: parseInt(offer.durationDays) || parseInt(offer.validity) || 30,
        isUnlimited: offer.unlimited || offer.isUnlimited || false,
        price: parseFloat(offer.price) || parseFloat(offer.retailPrice) || 0,
        currency: offer.currency || 'USD',
        networkType: offer.networkType || '4g/lte',
        supportsTopup: offer.topupSupported || offer.supportsTopup || false,
      }))

      allPlans.push(...plans)

      if (data.data.length < limit) {
        break
      }

      offset += limit
    }

    return allPlans
  }

  /**
   * Check if plan is available
   */
  async checkAvailability(providerPlanId: string): Promise<boolean> {
    try {
      const data = await this.request<{ data: any }>(
        'GET',
        `/esim/offers/${providerPlanId}`
      )
      return data.data?.available !== false
    } catch {
      return false
    }
  }

  /**
   * Order/provision a new eSIM
   */
  async orderEsim(providerPlanId: string, orderId: string): Promise<EsimOrderResult> {
    try {
      const data = await this.request<{ data: any }>(
        'POST',
        '/esim/purchases',
        {
          offerId: providerPlanId,
          quantity: 1,
          reference: orderId,
        }
      )

      const transaction = data.data
      const esim = transaction.esim || transaction

      if (!esim || !transaction.transactionId) {
        return {
          success: false,
          providerOrderId: '',
          providerEsimId: '',
          iccid: '',
          matchingId: '',
          smdpAddress: '',
          qrCodeData: '',
          error: 'No eSIM returned from provider',
        }
      }

      // Get QR code if not included
      let qrCodeData = esim.qrCode || esim.qrCodeData || ''
      if (!qrCodeData && transaction.transactionId) {
        try {
          const qrResponse = await this.request<{ data: any }>(
            'GET',
            `/esim/transactions/${transaction.transactionId}/qrcode`
          )
          qrCodeData = qrResponse.data?.qrCode || qrResponse.data?.qrCodeData || ''
        } catch {
          // QR code will be retrieved separately if needed
        }
      }

      // Build QR code data from activation code if not provided
      if (!qrCodeData && esim.smdpAddress && esim.activationCode) {
        qrCodeData = `LPA:1$${esim.smdpAddress}$${esim.activationCode}`
      }

      return {
        success: true,
        providerOrderId: transaction.transactionId || transaction.id || '',
        providerEsimId: esim.esimId || esim.id || transaction.transactionId || '',
        iccid: esim.iccid || '',
        matchingId: esim.matchingId || esim.activationCode || '',
        smdpAddress: esim.smdpAddress || esim.smdp || '',
        qrCodeData,
        qrCodeUrl: esim.qrCodeUrl || esim.qrCodeImage,
        activationCode: esim.activationCode,
        expiresAt: esim.expiryDate ? new Date(esim.expiryDate) : undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        providerOrderId: '',
        providerEsimId: '',
        iccid: '',
        matchingId: '',
        smdpAddress: '',
        qrCodeData: '',
        error: error.message || 'Unknown error',
      }
    }
  }

  /**
   * Get eSIM status and usage data
   */
  async getEsimStatus(providerEsimId: string): Promise<EsimUsageStatus> {
    try {
      const data = await this.request<{ data: any }>(
        'GET',
        `/esim/transactions/${providerEsimId}/usage`
      )

      const usage = data.data || {}

      return {
        status: this.mapStatus(usage.status),
        dataUsedMb: parseFloat(usage.dataUsedMb) || parseFloat(usage.used) || 0,
        dataRemainingMb: parseFloat(usage.dataRemainingMb) || parseFloat(usage.remaining) || 0,
        expiresAt: usage.expiryDate ? new Date(usage.expiryDate) : undefined,
      }
    } catch {
      return {
        status: 'unknown',
        dataUsedMb: 0,
        dataRemainingMb: 0,
      }
    }
  }

  /**
   * Top-up an existing eSIM
   */
  async topUp(providerEsimId: string, packageId: string): Promise<TopUpResult> {
    try {
      // Zendit uses the same purchase endpoint for topups
      const data = await this.request<{ data: any }>(
        'POST',
        '/esim/purchases',
        {
          offerId: packageId,
          esimId: providerEsimId,
          type: 'topup',
        }
      )

      const transaction = data.data

      return {
        success: true,
        topupId: transaction.transactionId || transaction.id || '',
        newDataAmountMb: parseFloat(transaction.dataGb) * 1024 || 0,
        newExpiresAt: transaction.expiryDate ? new Date(transaction.expiryDate) : undefined,
      }
    } catch (error: any) {
      return {
        success: false,
        topupId: '',
        newDataAmountMb: 0,
        error: error.message,
      }
    }
  }

  /**
   * Verify API credentials are working
   */
  async healthCheck(): Promise<boolean> {
    try {
      const credentials = await this.getCredentials()
      if (!credentials) {
        return false
      }
      // Try to fetch a single offer as a health check
      await this.request('GET', '/esim/offers?_limit=1&_offset=0')
      return true
    } catch {
      return false
    }
  }

  /**
   * Clear credentials cache (call after settings update)
   */
  clearCache(): void {
    credentialsCache = null
  }

  private mapStatus(status: string): 'active' | 'pending' | 'expired' | 'unknown' {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'activated':
      case 'in_use':
        return 'active'
      case 'pending':
      case 'ready':
      case 'not_activated':
      case 'new':
        return 'pending'
      case 'expired':
      case 'depleted':
      case 'exhausted':
        return 'expired'
      default:
        return 'unknown'
    }
  }
}

export const zenditProvider = new ZenditProvider()
