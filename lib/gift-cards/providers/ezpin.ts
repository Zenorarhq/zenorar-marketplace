// EZ Pin Gift Cards API Provider
// Documentation: https://www.ezpin.com/api

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type { GiftCardProvider, ProviderProduct, ProviderPurchaseResult } from '../types'

interface EzPinCredentials {
  apiKey: string
  apiSecret: string
  isSandbox: boolean
}

class EzPinProvider implements GiftCardProvider {
  name = 'ezpin'

  private async getCredentials(): Promise<EzPinCredentials | null> {
    try {
      const settings = await getSiteSettingsByGroup('gift-cards')

      const enabled = settings.ezpinEnabled === true || settings.ezpinEnabled === 'true'
      if (!enabled) {
        return null
      }

      const apiKey = settings.ezpinApiKey || process.env.EZPIN_API_KEY || ''
      const apiSecret = settings.ezpinApiSecret || process.env.EZPIN_API_SECRET || ''
      const isSandbox = settings.ezpinSandbox === true || settings.ezpinSandbox === 'true' ||
                        process.env.EZPIN_SANDBOX === 'true'

      if (!apiKey || !apiSecret) {
        return null
      }

      return { apiKey, apiSecret, isSandbox }
    } catch (error) {
      console.error('Error getting EZ Pin credentials:', error)
      return null
    }
  }

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://sandbox-api.ezpin.com/v1'
      : 'https://api.ezpin.com/v1'
  }

  private getAuthHeaders(credentials: EzPinCredentials): Record<string, string> {
    return {
      'X-API-KEY': credentials.apiKey,
      'X-API-SECRET': credentials.apiSecret,
      'Content-Type': 'application/json'
    }
  }

  async getProducts(): Promise<ProviderProduct[]> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      console.warn('EZ Pin not configured')
      return []
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/products`, {
        headers: this.getAuthHeaders(credentials)
      })

      if (!response.ok) {
        console.error('EZ Pin products error:', await response.text())
        return []
      }

      const data = await response.json()
      const products: ProviderProduct[] = []

      for (const product of data.products || data.data || []) {
        products.push({
          productId: product.sku || product.product_id?.toString() || '',
          brand: product.brand || product.name || '',
          category: this.mapCategory(product.category || product.brand || ''),
          description: product.description,
          imageUrl: product.image_url || product.logo,
          denominations: product.denominations || [parseFloat(product.face_value)].filter(Boolean),
          minAmount: product.min_value ? parseFloat(product.min_value) : undefined,
          maxAmount: product.max_value ? parseFloat(product.max_value) : undefined,
          discountPercent: product.discount_percent,
          country: product.country || 'US',
          currency: product.currency || 'USD'
        })
      }

      return products
    } catch (error) {
      console.error('EZ Pin getProducts error:', error)
      return []
    }
  }

  private mapCategory(categoryOrBrand: string): string {
    const lower = categoryOrBrand.toLowerCase()

    if (lower.includes('game') || lower.includes('xbox') || lower.includes('playstation') ||
        lower.includes('steam') || lower.includes('nintendo') || lower.includes('roblox')) {
      return 'gaming'
    }
    if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('hulu') ||
        lower.includes('disney') || lower.includes('streaming')) {
      return 'streaming'
    }
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('doordash') ||
        lower.includes('uber eats') || lower.includes('starbucks')) {
      return 'food'
    }
    if (lower.includes('shop') || lower.includes('amazon') || lower.includes('walmart') ||
        lower.includes('target') || lower.includes('retail')) {
      return 'shopping'
    }

    return 'other'
  }

  async checkStock(productId: string, denomination: number): Promise<number> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return 0
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/products/${productId}/stock`,
        { headers: this.getAuthHeaders(credentials) }
      )

      if (!response.ok) {
        return 0
      }

      const data = await response.json()

      // Find stock for this denomination
      const stockInfo = data.stock?.find((s: any) => parseFloat(s.face_value) === denomination)
      return stockInfo?.quantity || data.available || 999
    } catch (error) {
      console.error('EZ Pin stock check error:', error)
      return 0
    }
  }

  async purchaseCard(productId: string, denomination: number): Promise<ProviderPurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'EZ Pin not configured' }
    }

    try {
      const referenceId = `ZEN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/orders`, {
        method: 'POST',
        headers: this.getAuthHeaders(credentials),
        body: JSON.stringify({
          product_sku: productId,
          face_value: denomination,
          quantity: 1,
          reference_id: referenceId
        })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        return {
          success: false,
          error: data.message || data.error || 'Failed to purchase'
        }
      }

      // EZ Pin returns pins array
      const pin = data.pins?.[0] || data.cards?.[0]

      return {
        success: true,
        orderId: data.order_id?.toString() || referenceId,
        code: pin?.serial || pin?.code || pin?.card_number || '',
        pin: pin?.pin || pin?.security_code,
        expiresAt: pin?.expiry_date ? new Date(pin.expiry_date) : undefined
      }
    } catch (error: any) {
      console.error('EZ Pin purchase error:', error)
      return { success: false, error: error.message || 'Purchase failed' }
    }
  }

  async getOrderStatus(orderId: string): Promise<{
    status: string
    code?: string
    pin?: string
  }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { status: 'error' }
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/orders/${orderId}`,
        { headers: this.getAuthHeaders(credentials) }
      )

      if (!response.ok) {
        return { status: 'error' }
      }

      const data = await response.json()
      const pin = data.pins?.[0] || data.cards?.[0]

      return {
        status: data.status || 'completed',
        code: pin?.serial || pin?.code || pin?.card_number,
        pin: pin?.pin || pin?.security_code
      }
    } catch (error) {
      console.error('EZ Pin order status error:', error)
      return { status: 'error' }
    }
  }

  async getBalance(): Promise<number> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return 0
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/account/balance`,
        { headers: this.getAuthHeaders(credentials) }
      )

      if (!response.ok) {
        return 0
      }

      const data = await response.json()
      return parseFloat(data.balance) || parseFloat(data.available_balance) || 0
    } catch (error) {
      console.error('EZ Pin balance error:', error)
      return 0
    }
  }
}

export const ezPinProvider = new EzPinProvider()
