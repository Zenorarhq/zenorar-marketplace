// Reloadly Gift Cards API Provider
// Documentation: https://developers.reloadly.com/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type { GiftCardProvider, ProviderProduct, ProviderPurchaseResult } from '../types'

interface ReloadlyCredentials {
  clientId: string
  clientSecret: string
  isSandbox: boolean
}

interface ReloadlyToken {
  accessToken: string
  expiresAt: number
}

// Token cache
let tokenCache: ReloadlyToken | null = null

class ReloadlyProvider implements GiftCardProvider {
  name = 'reloadly'

  private async getCredentials(): Promise<ReloadlyCredentials | null> {
    try {
      const settings = await getSiteSettingsByGroup('gift-cards')

      const enabled = settings.reloadlyEnabled === true || settings.reloadlyEnabled === 'true'
      if (!enabled) {
        return null
      }

      const clientId = settings.reloadlyClientId || process.env.RELOADLY_CLIENT_ID || ''
      const clientSecret = settings.reloadlyClientSecret || process.env.RELOADLY_CLIENT_SECRET || ''
      const isSandbox = settings.reloadlySandbox === true || settings.reloadlySandbox === 'true' ||
                        process.env.RELOADLY_SANDBOX === 'true'

      if (!clientId || !clientSecret) {
        return null
      }

      return { clientId, clientSecret, isSandbox }
    } catch (error) {
      console.error('Error getting Reloadly credentials:', error)

      // Fallback to env vars
      const clientId = process.env.RELOADLY_CLIENT_ID || ''
      const clientSecret = process.env.RELOADLY_CLIENT_SECRET || ''

      if (!clientId || !clientSecret) {
        return null
      }

      return {
        clientId,
        clientSecret,
        isSandbox: process.env.RELOADLY_SANDBOX === 'true'
      }
    }
  }

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://giftcards-sandbox.reloadly.com'
      : 'https://giftcards.reloadly.com'
  }

  private getAuthUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://auth.reloadly.com/oauth/token'
      : 'https://auth.reloadly.com/oauth/token'
  }

  private async getAccessToken(): Promise<string | null> {
    // Check cache
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
      return tokenCache.accessToken
    }

    const credentials = await this.getCredentials()
    if (!credentials) {
      return null
    }

    try {
      const response = await fetch(this.getAuthUrl(credentials.isSandbox), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          grant_type: 'client_credentials',
          audience: credentials.isSandbox
            ? 'https://giftcards-sandbox.reloadly.com'
            : 'https://giftcards.reloadly.com'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Reloadly auth error:', error)
        return null
      }

      const data = await response.json()

      tokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000)
      }

      return tokenCache.accessToken
    } catch (error) {
      console.error('Reloadly auth error:', error)
      return null
    }
  }

  /**
   * Get all available gift card products
   */
  async getProducts(countryCode: string = 'US'): Promise<ProviderProduct[]> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return []
    }

    const token = await this.getAccessToken()
    if (!token) {
      return []
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/countries/${countryCode}/products?size=200`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json'
          }
        }
      )

      if (!response.ok) {
        const error = await response.json()
        console.error('Reloadly products error:', error)
        return []
      }

      const data = await response.json()
      const products = data.content || data || []

      return products.map((p: any) => ({
        productId: String(p.productId),
        brand: p.productName || p.brandName,
        category: this.mapCategory(p.category?.name || ''),
        description: p.productDescription,
        imageUrl: p.logoUrls?.[0],
        denominations: p.fixedRecipientDenominations || [],
        minAmount: p.minRecipientDenomination,
        maxAmount: p.maxRecipientDenomination,
        discountPercent: p.discountPercentage || 0,
        country: p.country?.isoName,
        currency: p.recipientCurrencyCode
      }))
    } catch (error) {
      console.error('Reloadly getProducts error:', error)
      return []
    }
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<ProviderProduct | null> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return null
    }

    const token = await this.getAccessToken()
    if (!token) {
      return null
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/products/${productId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json'
          }
        }
      )

      if (!response.ok) {
        return null
      }

      const p = await response.json()

      return {
        productId: String(p.productId),
        brand: p.productName || p.brandName,
        category: this.mapCategory(p.category?.name || ''),
        description: p.productDescription,
        imageUrl: p.logoUrls?.[0],
        denominations: p.fixedRecipientDenominations || [],
        minAmount: p.minRecipientDenomination,
        maxAmount: p.maxRecipientDenomination,
        discountPercent: p.discountPercentage || 0,
        country: p.country?.isoName,
        currency: p.recipientCurrencyCode
      }
    } catch (error) {
      console.error('Reloadly getProduct error:', error)
      return null
    }
  }

  /**
   * Check stock availability (Reloadly has unlimited virtual stock)
   */
  async checkStock(productId: string, denomination: number): Promise<number> {
    // Reloadly is an on-demand API, so stock is effectively unlimited
    // We just need to verify the product exists and supports this denomination
    const product = await this.getProduct(productId)
    if (!product) {
      return 0
    }

    // Check if denomination is valid
    if (product.denominations.length > 0) {
      if (!product.denominations.includes(denomination)) {
        return 0
      }
    } else if (product.minAmount && product.maxAmount) {
      if (denomination < product.minAmount || denomination > product.maxAmount) {
        return 0
      }
    }

    return 999 // Virtual unlimited stock
  }

  /**
   * Purchase a gift card
   */
  async purchaseCard(
    productId: string,
    denomination: number,
    recipientEmail?: string
  ): Promise<ProviderPurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Reloadly not configured' }
    }

    const token = await this.getAccessToken()
    if (!token) {
      return { success: false, error: 'Failed to authenticate with Reloadly' }
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId: parseInt(productId),
            countryCode: 'US',
            quantity: 1,
            unitPrice: denomination,
            customIdentifier: `GC_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            senderName: 'Zenorar',
            recipientEmail: recipientEmail,
            recipientPhoneDetails: null
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.errorMessage || 'Purchase failed'
        }
      }

      // Get the redemption code from the response
      const card = data.cards?.[0] || data

      return {
        success: true,
        orderId: String(data.transactionId),
        code: card.cardNumber || card.pinCode,
        pin: card.pinCode,
        expiresAt: card.expiryDate ? new Date(card.expiryDate) : undefined
      }
    } catch (error: any) {
      console.error('Reloadly purchaseCard error:', error)
      return {
        success: false,
        error: error.message || 'Purchase request failed'
      }
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(transactionId: string): Promise<{
    status: string
    code?: string
    pin?: string
    error?: string
  }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { status: 'error', error: 'Reloadly not configured' }
    }

    const token = await this.getAccessToken()
    if (!token) {
      return { status: 'error', error: 'Failed to authenticate' }
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/orders/transactions/${transactionId}/cards`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json'
          }
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return { status: 'error', error: error.message || 'Failed to get order status' }
      }

      const data = await response.json()
      const card = data[0] || data

      return {
        status: 'completed',
        code: card.cardNumber,
        pin: card.pinCode
      }
    } catch (error: any) {
      return { status: 'error', error: error.message }
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; mode: string; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, mode: 'none', error: 'Reloadly not configured' }
    }

    const token = await this.getAccessToken()
    if (!token) {
      return {
        success: false,
        mode: credentials.isSandbox ? 'sandbox' : 'live',
        error: 'Failed to authenticate'
      }
    }

    return {
      success: true,
      mode: credentials.isSandbox ? 'sandbox' : 'live'
    }
  }

  /**
   * Map Reloadly categories to our categories
   */
  private mapCategory(reloadlyCategory: string): string {
    const lower = reloadlyCategory.toLowerCase()

    if (lower.includes('gaming') || lower.includes('game')) return 'gaming'
    if (lower.includes('stream') || lower.includes('entertainment')) return 'streaming'
    if (lower.includes('shop') || lower.includes('retail') || lower.includes('store')) return 'shopping'
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('dining')) return 'food'
    if (lower.includes('travel') || lower.includes('hotel') || lower.includes('airline')) return 'travel'
    if (lower.includes('software') || lower.includes('tech')) return 'software'
    if (lower.includes('mobile') || lower.includes('telecom')) return 'mobile'

    return 'other'
  }

  /**
   * Clear token cache (call after settings update)
   */
  clearCache(): void {
    tokenCache = null
  }
}

export const reloadlyProvider = new ReloadlyProvider()
