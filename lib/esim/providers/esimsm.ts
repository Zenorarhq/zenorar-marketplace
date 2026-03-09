// eSIM.sm Provider
// Documentation: https://docs.esim.sm/
// Base URL: https://esim.sm/api/reseller/v1
// Sandbox: same URL + header x-sandbox: on

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import {
  EsimProviderInterface,
  AvailableEsimPlan,
  EsimOrderResult,
  EsimUsageStatus,
  TopUpResult,
} from '../types'

interface EsimSmCredentials {
  apiKey: string
  isSandbox: boolean
}

// Cache credentials
let credentialsCache: { credentials: EsimSmCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000 // 1 minute
const BASE_URL = 'https://esim.sm/api/reseller/v1'

export class EsimSmProvider implements EsimProviderInterface {
  readonly name = 'eSIM.sm'
  readonly slug = 'esimsm'

  /**
   * Get credentials from database or environment
   */
  private async getCredentials(): Promise<EsimSmCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      const settings = await getSiteSettingsByGroup('api')

      const enabled = settings.esimSmEnabled === true || settings.esimSmEnabled === 'true'
      const isSandbox = settings.esimSmMode === 'sandbox'
      const apiKey = settings.esimSmApiKey || process.env.ESIMSM_API_KEY || ''

      if (!enabled && !apiKey) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      if (!apiKey) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
      }

      const credentials: EsimSmCredentials = { apiKey, isSandbox }
      credentialsCache = { credentials, timestamp: Date.now() }
      return credentials
    } catch (error) {
      console.error('Error getting eSIM.sm credentials:', error)
      const apiKey = process.env.ESIMSM_API_KEY || ''
      if (!apiKey) return null
      return { apiKey, isSandbox: false }
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
      throw new Error('eSIM.sm not configured')
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    }

    // Sandbox mode via header
    if (credentials.isSandbox) {
      headers['x-sandbox'] = 'on'
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `eSIM.sm API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all available plans from all countries
   */
  async getPlans(): Promise<AvailableEsimPlan[]> {
    const data = await this.request<{
      success: boolean
      data: Array<{ id: string; name: string; region: string; flag: string; isRegion: boolean }>
    }>('GET', '/country?hl=en&currency=usd')

    const allPlans: AvailableEsimPlan[] = []

    // Fetch plans for each country
    for (const country of (data.data || [])) {
      try {
        const countryData = await this.request<{
          success: boolean
          data: { plans: any[] }
        }>('GET', `/country?id=${country.id}&hl=en&currency=usd`)

        const plans = countryData.data?.plans || []
        for (const plan of plans) {
          if (!plan.isActive) continue

          allPlans.push({
            providerPlanId: plan.id.toString(),
            name: plan.name,
            countries: plan.countries || [country.id],
            dataAmountGb: plan.gb || plan.mb / 1024,
            dataAmountDisplay: plan.isUnlimited ? 'Unlimited' : `${plan.gb || Math.round(plan.mb / 1024)}GB`,
            validityDays: plan.days,
            isUnlimited: plan.isUnlimited === 1 || plan.isUnlimited === true,
            price: parseFloat(plan.price) || 0,
            currency: plan.currency || 'USD',
            networkType: plan.networkSpeed?.includes('5G') ? '5g' : '4g',
            supportsTopup: plan.hasTopUps === true,
          })
        }
      } catch {
        // Skip countries that fail
      }
    }

    return allPlans
  }

  /**
   * Check if a plan is available
   */
  async checkAvailability(providerPlanId: string): Promise<boolean> {
    try {
      const data = await this.request<{ plan: any }>('GET', `/plan?id=${providerPlanId}`)
      return data.plan?.isActive === true || data.plan?.isActive === 1
    } catch {
      return false
    }
  }

  /**
   * Order/provision a new eSIM
   */
  async orderEsim(providerPlanId: string, orderId: string): Promise<EsimOrderResult> {
    try {
      const data = await this.request<{
        success: boolean
        pending: boolean
        message: string
        data: {
          price: number
          esim: Array<{
            iccid: string
            status: string
            mbTotal: number
            mbUsed: number
            expirationTimestamp: string
            lpaCode: string
            id: number
            plan: any
          }>
        }
      }>('POST', '/esim/purchase', {
        plan_id: parseInt(providerPlanId, 10),
        quantity: 1,
      })

      if (!data.success) {
        return {
          success: false,
          providerOrderId: '',
          providerEsimId: '',
          iccid: '',
          matchingId: '',
          smdpAddress: '',
          qrCodeData: '',
          error: 'Purchase failed',
        }
      }

      const esim = data.data?.esim?.[0]
      if (!esim) {
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

      // Parse LPA code: "LPA:1$smdp_address$matching_id"
      const lpaParts = (esim.lpaCode || '').split('$')
      const smdpAddress = lpaParts[1] || ''
      const matchingId = lpaParts[2] || ''

      return {
        success: true,
        providerOrderId: esim.id?.toString() || '',
        providerEsimId: esim.iccid || '',
        iccid: esim.iccid || '',
        matchingId,
        smdpAddress,
        qrCodeData: esim.lpaCode || '',
        activationCode: esim.lpaCode,
        expiresAt: esim.expirationTimestamp ? new Date(esim.expirationTimestamp) : undefined,
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
      const data = await this.request<{
        success: boolean
        data: Array<{
          iccid: string
          status: string
          mbTotal: number
          mbUsed: number
          expirationTimestamp: string
        }>
      }>('GET', `/esim?iccid=${providerEsimId}`)

      const esim = Array.isArray(data.data) ? data.data[0] : data.data
      if (!esim) {
        return { status: 'unknown', dataUsedMb: 0, dataRemainingMb: 0 }
      }

      return {
        status: this.mapStatus(esim.status),
        dataUsedMb: esim.mbUsed || 0,
        dataRemainingMb: (esim.mbTotal || 0) - (esim.mbUsed || 0),
        expiresAt: esim.expirationTimestamp ? new Date(esim.expirationTimestamp) : undefined,
      }
    } catch {
      return { status: 'unknown', dataUsedMb: 0, dataRemainingMb: 0 }
    }
  }

  /**
   * Top-up an existing eSIM
   */
  async topUp(providerEsimId: string, packageId: string): Promise<TopUpResult> {
    try {
      const data = await this.request<{
        success: boolean
        pending: boolean
        message: string
        data: { price: number }
      }>('POST', '/esim/top-up', {
        iccid: providerEsimId,
        refill: packageId,
      })

      if (!data.success) {
        return {
          success: false,
          topupId: '',
          newDataAmountMb: 0,
          error: data.message || 'Top-up failed',
        }
      }

      return {
        success: true,
        topupId: `topup-${Date.now()}`,
        newDataAmountMb: 0, // Will be updated on next usage sync
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
      if (!credentials) return false
      // Lightweight call to check credentials
      await this.request('GET', '/params')
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
      case 'in_use':
      case 'installed':
        return 'active'
      case 'not_installed':
        return 'pending'
      case 'expired':
        return 'expired'
      default:
        return 'unknown'
    }
  }
}

export const esimSmProvider = new EsimSmProvider()