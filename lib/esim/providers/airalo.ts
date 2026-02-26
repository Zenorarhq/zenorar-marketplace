// Airalo eSIM Provider
// Documentation: https://partners.airalo.com/api-docs

import {
  EsimProviderInterface,
  AvailableEsimPlan,
  EsimOrderResult,
  EsimUsageStatus,
  TopUpResult,
} from '../types'

export class AiraloProvider implements EsimProviderInterface {
  readonly name = 'Airalo'
  readonly slug = 'airalo'

  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.baseUrl = process.env.AIRALO_API_URL || 'https://partner-api.airalo.com/v2'
    this.clientId = process.env.AIRALO_CLIENT_ID || ''
    this.clientSecret = process.env.AIRALO_CLIENT_SECRET || ''
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    })

    if (!response.ok) {
      throw new Error(`Airalo auth failed: ${response.status}`)
    }

    const data = await response.json()
    const token: string = data.access_token
    this.accessToken = token
    // Set expiry 60 seconds before actual expiry for safety
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000)

    return token
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Airalo API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all available packages/plans
   */
  async getPlans(): Promise<AvailableEsimPlan[]> {
    const data = await this.request<{ data: any[] }>('GET', '/packages')

    return data.data.map((pkg) => ({
      providerPlanId: pkg.id,
      name: pkg.title,
      description: pkg.description,
      countries: pkg.operator?.countries?.map((c: any) => c.country_code) || [],
      dataAmountGb: parseFloat(pkg.data) || 0,
      dataAmountDisplay: pkg.data,
      validityDays: parseInt(pkg.validity) || 0,
      isUnlimited: pkg.is_unlimited || false,
      price: parseFloat(pkg.price) || 0,
      currency: 'USD',
      networkType: pkg.type || '4g',
      supportsTopup: pkg.topup_supported || false,
    }))
  }

  /**
   * Check if plan is available
   */
  async checkAvailability(providerPlanId: string): Promise<boolean> {
    try {
      await this.request('GET', `/packages/${providerPlanId}`)
      return true
    } catch {
      return false
    }
  }

  /**
   * Order/provision a new eSIM
   */
  async orderEsim(providerPlanId: string, orderId: string): Promise<EsimOrderResult> {
    try {
      const data = await this.request<{ data: any }>('POST', '/orders', {
        package_id: providerPlanId,
        quantity: 1,
        type: 'sim',
        description: `Order ${orderId}`,
      })

      const esim = data.data.sims?.[0]

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

      return {
        success: true,
        providerOrderId: data.data.id?.toString() || '',
        providerEsimId: esim.id?.toString() || '',
        iccid: esim.iccid || '',
        matchingId: esim.matching_id || '',
        smdpAddress: esim.smdp_address || '',
        qrCodeData: esim.qrcode || '',
        qrCodeUrl: esim.qrcode_url,
        activationCode: esim.activation_code,
        expiresAt: esim.expired_at ? new Date(esim.expired_at) : undefined,
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
      const data = await this.request<{ data: any }>('GET', `/sims/${providerEsimId}/usage`)

      return {
        status: this.mapStatus(data.data.status),
        dataUsedMb: parseFloat(data.data.total) || 0,
        dataRemainingMb: parseFloat(data.data.remaining) || 0,
        expiresAt: data.data.expired_at ? new Date(data.data.expired_at) : undefined,
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
      const data = await this.request<{ data: any }>('POST', `/sims/${providerEsimId}/topups`, {
        package_id: packageId,
      })

      return {
        success: true,
        topupId: data.data.id?.toString() || '',
        newDataAmountMb: parseFloat(data.data.data) * 1024 || 0,
        newExpiresAt: data.data.expired_at ? new Date(data.data.expired_at) : undefined,
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
      await this.getAccessToken()
      return true
    } catch {
      return false
    }
  }

  private mapStatus(status: string): 'active' | 'pending' | 'expired' | 'unknown' {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'active'
      case 'pending':
      case 'not_activated':
        return 'pending'
      case 'expired':
        return 'expired'
      default:
        return 'unknown'
    }
  }
}

export const airaloProvider = new AiraloProvider()
