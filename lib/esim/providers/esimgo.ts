// eSIM Go Provider
// Documentation: https://api.esimgo.com/docs

import {
  EsimProviderInterface,
  AvailableEsimPlan,
  EsimOrderResult,
  EsimUsageStatus,
} from '../types'

export class EsimGoProvider implements EsimProviderInterface {
  readonly name = 'eSIM Go'
  readonly slug = 'esimgo'

  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = process.env.ESIMGO_API_URL || 'https://api.esimgo.com/v2.2'
    this.apiKey = process.env.ESIMGO_API_KEY || ''
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `eSIM Go API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all available bundles/plans
   */
  async getPlans(): Promise<AvailableEsimPlan[]> {
    const data = await this.request<{ bundles: any[] }>('GET', '/catalogue')

    return data.bundles.map((bundle) => ({
      providerPlanId: bundle.name,
      name: bundle.description || bundle.name,
      description: bundle.description,
      countries: bundle.countries || [],
      dataAmountGb: this.parseDataAmount(bundle.dataAmount, bundle.dataUnit),
      dataAmountDisplay: `${bundle.dataAmount}${bundle.dataUnit}`,
      validityDays: this.parseValidity(bundle.duration, bundle.durationUnit),
      isUnlimited: bundle.dataAmount === 'unlimited',
      price: parseFloat(bundle.price) || 0,
      currency: bundle.currency || 'USD',
      networkType: '4g',
      supportsTopup: false, // eSIM Go doesn't support top-ups
    }))
  }

  /**
   * Check if bundle is available
   */
  async checkAvailability(providerPlanId: string): Promise<boolean> {
    try {
      const data = await this.request<{ bundles: any[] }>('GET', '/catalogue')
      return data.bundles.some((b) => b.name === providerPlanId)
    } catch {
      return false
    }
  }

  /**
   * Order/provision a new eSIM
   */
  async orderEsim(providerPlanId: string, orderId: string): Promise<EsimOrderResult> {
    try {
      const data = await this.request<{ esims: any[]; orderReference: string }>(
        'POST',
        '/esims/apply',
        {
          type: 'bundle',
          bundle: providerPlanId,
          count: 1,
          assign: true,
          reference: orderId,
        }
      )

      const esim = data.esims?.[0]

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

      // eSIM Go returns activation code in format: LPA:1$smdpAddress$matchingId
      const qrCodeData = esim.activationCode || ''
      const [, smdpAddress, matchingId] = qrCodeData.split('$')

      return {
        success: true,
        providerOrderId: data.orderReference || '',
        providerEsimId: esim.iccid || '',
        iccid: esim.iccid || '',
        matchingId: matchingId || esim.matchingId || '',
        smdpAddress: smdpAddress || esim.smdpAddress || '',
        qrCodeData: qrCodeData,
        activationCode: qrCodeData,
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
   * Get eSIM status
   */
  async getEsimStatus(iccid: string): Promise<EsimUsageStatus> {
    try {
      const data = await this.request<any>('GET', `/esims/${iccid}`)

      return {
        status: this.mapStatus(data.status),
        dataUsedMb: parseFloat(data.dataUsed) || 0,
        dataRemainingMb: parseFloat(data.dataRemaining) || 0,
        expiresAt: data.expiryDate ? new Date(data.expiryDate) : undefined,
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
   * Verify API credentials are working
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('GET', '/catalogue')
      return true
    } catch {
      return false
    }
  }

  private parseDataAmount(amount: string | number, unit: string): number {
    const value = parseFloat(amount.toString()) || 0
    switch (unit?.toLowerCase()) {
      case 'gb':
        return value
      case 'mb':
        return value / 1024
      case 'tb':
        return value * 1024
      default:
        return value
    }
  }

  private parseValidity(duration: string | number, unit: string): number {
    const value = parseInt(duration.toString()) || 0
    switch (unit?.toLowerCase()) {
      case 'day':
      case 'days':
        return value
      case 'week':
      case 'weeks':
        return value * 7
      case 'month':
      case 'months':
        return value * 30
      default:
        return value
    }
  }

  private mapStatus(status: string): 'active' | 'pending' | 'expired' | 'unknown' {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'activated':
        return 'active'
      case 'pending':
      case 'new':
      case 'assigned':
        return 'pending'
      case 'expired':
      case 'deleted':
        return 'expired'
      default:
        return 'unknown'
    }
  }
}

export const esimGoProvider = new EsimGoProvider()
