// Mobimatter eSIM Provider
// Documentation: https://docs.mobimatter.com

import {
  EsimProviderInterface,
  AvailableEsimPlan,
  EsimOrderResult,
  EsimUsageStatus,
  TopUpResult,
} from '../types'

export class MobimatterProvider implements EsimProviderInterface {
  readonly name = 'Mobimatter'
  readonly slug = 'mobimatter'

  private baseUrl: string
  private merchantId: string
  private apiKey: string

  constructor() {
    this.baseUrl = process.env.MOBIMATTER_API_URL || 'https://api.mobimatter.com/v1'
    this.merchantId = process.env.MOBIMATTER_MERCHANT_ID || ''
    this.apiKey = process.env.MOBIMATTER_API_KEY || ''
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
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Merchant-Id': this.merchantId,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || error.error || `Mobimatter API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all available products/plans
   */
  async getPlans(): Promise<AvailableEsimPlan[]> {
    const data = await this.request<{ products: any[] }>('GET', '/products')

    return data.products.map((product) => ({
      providerPlanId: product.productId || product.id,
      name: product.name || product.title,
      description: product.description,
      countries: product.countries || product.coverage || [],
      dataAmountGb: this.parseDataAmount(product.data, product.dataUnit),
      dataAmountDisplay: product.dataDisplay || `${product.data}${product.dataUnit || 'GB'}`,
      validityDays: parseInt(product.validity) || parseInt(product.duration) || 30,
      isUnlimited: product.unlimited || product.data === 'unlimited',
      price: parseFloat(product.price) || parseFloat(product.retailPrice) || 0,
      currency: product.currency || 'USD',
      networkType: product.networkType || '4g',
      supportsTopup: product.topupEnabled || false,
    }))
  }

  /**
   * Parse data amount to GB
   */
  private parseDataAmount(amount: string | number, unit?: string): number {
    if (amount === 'unlimited') return 999
    const num = parseFloat(String(amount)) || 0
    if (unit?.toLowerCase() === 'mb') return num / 1024
    return num
  }

  /**
   * Check if plan is available
   */
  async checkAvailability(providerPlanId: string): Promise<boolean> {
    try {
      const data = await this.request<{ product: any; available: boolean }>(
        'GET',
        `/products/${providerPlanId}/availability`
      )
      return data.available !== false
    } catch {
      return false
    }
  }

  /**
   * Order/provision a new eSIM
   */
  async orderEsim(providerPlanId: string, orderId: string): Promise<EsimOrderResult> {
    try {
      const data = await this.request<{ order: any; esim: any }>(
        'POST',
        '/orders',
        {
          productId: providerPlanId,
          quantity: 1,
          reference: orderId,
        }
      )

      const esim = data.esim || data.order?.esim

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

      // Build QR code data if not provided directly
      const qrCodeData = esim.qrCode || esim.qrCodeData ||
        (esim.smdpAddress && esim.activationCode
          ? `LPA:1$${esim.smdpAddress}$${esim.activationCode}`
          : '')

      return {
        success: true,
        providerOrderId: data.order?.orderId || data.order?.id || '',
        providerEsimId: esim.esimId || esim.id || '',
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
      const data = await this.request<{ esim: any; usage: any }>(
        'GET',
        `/esims/${providerEsimId}/status`
      )

      const esim = data.esim || data
      const usage = data.usage || esim.usage || {}

      return {
        status: this.mapStatus(esim.status),
        dataUsedMb: parseFloat(usage.used) || parseFloat(usage.dataUsedMb) || 0,
        dataRemainingMb: parseFloat(usage.remaining) || parseFloat(usage.dataRemainingMb) || 0,
        expiresAt: esim.expiryDate ? new Date(esim.expiryDate) : undefined,
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
      const data = await this.request<{ topup: any }>(
        'POST',
        `/esims/${providerEsimId}/topup`,
        {
          productId: packageId,
        }
      )

      const topup = data.topup || data

      return {
        success: true,
        topupId: topup.topupId || topup.id || '',
        newDataAmountMb: parseFloat(topup.dataAdded) * 1024 || 0,
        newExpiresAt: topup.newExpiryDate ? new Date(topup.newExpiryDate) : undefined,
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
      if (!this.merchantId || !this.apiKey) {
        return false
      }
      // Try to fetch products as a health check
      await this.request('GET', '/products?limit=1')
      return true
    } catch {
      return false
    }
  }

  private mapStatus(status: string): 'active' | 'pending' | 'expired' | 'unknown' {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'activated':
        return 'active'
      case 'pending':
      case 'ready':
      case 'not_activated':
        return 'pending'
      case 'expired':
      case 'depleted':
        return 'expired'
      default:
        return 'unknown'
    }
  }
}

export const mobimatterProvider = new MobimatterProvider()
