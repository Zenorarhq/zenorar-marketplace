// Reloadly Virtual Cards Provider
// Uses Reloadly Gift Cards API but filters for Visa/Mastercard prepaid cards
// Strips "gift card" branding for unified display

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type {
  CardProviderInterface,
  CreateCardParams,
  CreateCardResult,
  CardDetails,
  CardBrand,
  InstantCardOption
} from '../types'

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

class ReloadlyCardsProvider implements CardProviderInterface {
  name = 'reloadly' as const

  private async getCredentials(): Promise<ReloadlyCredentials | null> {
    try {
      const settings = await getSiteSettingsByGroup('api')

      // Check if Reloadly Cards is enabled (separate from gift cards)
      const enabled = settings.reloadlyCardsEnabled === true || settings.reloadlyCardsEnabled === 'true'

      if (!enabled) {
        console.log('[Reloadly Cards] Not enabled in settings')
        return null
      }

      // Use cards-specific mode setting (NOT the gift cards mode)
      const isSandbox = settings.reloadlyCardsMode === 'sandbox' ||
                        settings.reloadlyCardsMode !== 'production'

      let clientId = ''
      let clientSecret = ''

      // Use ONLY cards-specific credentials (NOT gift card credentials)
      if (isSandbox) {
        clientId = settings.reloadlyCardsSandboxClientId || ''
        clientSecret = settings.reloadlyCardsSandboxClientSecret || ''
      } else {
        clientId = settings.reloadlyCardsProductionClientId || ''
        clientSecret = settings.reloadlyCardsProductionClientSecret || ''
      }

      if (!clientId || !clientSecret) {
        console.log('[Reloadly Cards] Missing credentials for mode:', isSandbox ? 'sandbox' : 'production')
        return null
      }

      console.log('[Reloadly Cards] Using credentials in mode:', isSandbox ? 'sandbox' : 'production')
      return { clientId, clientSecret, isSandbox }
    } catch (error) {
      console.error('[Reloadly Cards] Error getting credentials:', error)
      return null
    }
  }

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://giftcards-sandbox.reloadly.com'
      : 'https://giftcards.reloadly.com'
  }

  private async getAccessToken(): Promise<string | null> {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
      return tokenCache.accessToken
    }

    const credentials = await this.getCredentials()
    if (!credentials) {
      return null
    }

    try {
      const response = await fetch('https://auth.reloadly.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
   * Get available instant card options (Visa/Mastercard prepaid cards)
   * Filters out non-card products and strips "gift card" branding
   */
  async getInstantCardOptions(countryCode: string = 'US'): Promise<InstantCardOption[]> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      console.log('[Reloadly Cards] No credentials available')
      return []
    }

    const token = await this.getAccessToken()
    if (!token) {
      console.log('[Reloadly Cards] Failed to get access token')
      return []
    }

    try {
      // Try multiple country codes to find prepaid cards
      const countryCodes = [countryCode, 'US', 'GB', 'CA', 'AU']
      const uniqueCodes = [...new Set(countryCodes)]

      for (const code of uniqueCodes) {
        const response = await fetch(
          `${this.getBaseUrl(credentials.isSandbox)}/countries/${code}/products?size=200`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/com.reloadly.giftcards-v1+json'
            }
          }
        )

        if (!response.ok) {
          console.log(`[Reloadly Cards] Failed to fetch products for ${code}:`, response.status)
          continue
        }

        const data = await response.json()
        const products = data.content || data || []

        console.log(`[Reloadly Cards] Total products in ${code}: ${products.length}`)

        // Filter for Visa and Mastercard prepaid/virtual cards
        // Be more flexible with the filter - also include "prepaid", "virtual card"
        const cardProducts = products.filter((p: any) => {
          const name = (p.productName || p.brandName || '').toLowerCase()
          const isCard = name.includes('visa') ||
                        name.includes('mastercard') ||
                        name.includes('prepaid') ||
                        name.includes('virtual card')
          return isCard
        })

        console.log(`[Reloadly Cards] Found ${cardProducts.length} card products in ${code}`)

        if (cardProducts.length > 0) {
          const options: InstantCardOption[] = []

          for (const product of cardProducts) {
            const brand = this.extractBrand(product.productName || product.brandName)
            const denominations = product.fixedRecipientDenominations || []

            for (const denom of denominations) {
              options.push({
                productId: String(product.productId),
                brand,
                denomination: denom,
                totalPrice: denom, // Markup applied at checkout
                currency: product.recipientCurrencyCode || 'USD'
              })
            }
          }

          if (options.length > 0) {
            console.log(`[Reloadly Cards] Returning ${options.length} instant card options`)
            return options
          }
        }
      }

      // If no card products found, log available products for debugging
      console.log('[Reloadly Cards] No Visa/Mastercard/Prepaid products found in any region')

      // In sandbox mode, if no products found, provide test options
      // so users can still test the purchase flow
      if (credentials.isSandbox) {
        console.log('[Reloadly Cards] Sandbox mode - providing test card options')

        // Use a generic test product ID - in sandbox mode, Reloadly accepts test purchases
        // These are synthetic options to allow testing the UI and flow
        const testOptions: InstantCardOption[] = [
          { productId: 'test-5', brand: 'visa', denomination: 5, totalPrice: 5, currency: 'USD' },
          { productId: 'test-10', brand: 'visa', denomination: 10, totalPrice: 10, currency: 'USD' },
          { productId: 'test-25', brand: 'visa', denomination: 25, totalPrice: 25, currency: 'USD' },
          { productId: 'test-50', brand: 'visa', denomination: 50, totalPrice: 50, currency: 'USD' },
          { productId: 'test-100', brand: 'mastercard', denomination: 100, totalPrice: 100, currency: 'USD' },
        ]

        return testOptions
      }

      return []
    } catch (error) {
      console.error('Reloadly getInstantCardOptions error:', error)
      return []
    }
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId: string): Promise<any | null> {
    const credentials = await this.getCredentials()
    if (!credentials) return null

    const token = await this.getAccessToken()
    if (!token) return null

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

      if (!response.ok) return null

      return await response.json()
    } catch {
      return null
    }
  }

  /**
   * Create (purchase) an instant card
   */
  async createCard(params: CreateCardParams): Promise<CreateCardResult> {
    if (!params.denomination) {
      return { success: false, error: 'Denomination is required for instant cards' }
    }

    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Reloadly not configured' }
    }

    const token = await this.getAccessToken()
    if (!token) {
      return { success: false, error: 'Failed to authenticate with Reloadly' }
    }

    // Get available products to find one matching the denomination
    const options = await this.getInstantCardOptions()
    const matchingOption = options.find(
      o => o.denomination === params.denomination &&
           (params.cardBrand ? o.brand === params.cardBrand : true)
    )

    if (!matchingOption) {
      return { success: false, error: `No card available for denomination $${params.denomination}` }
    }

    // Handle test products in sandbox mode
    if (matchingOption.productId.startsWith('test-') && credentials.isSandbox) {
      console.log('[Reloadly Cards] Sandbox test purchase for', matchingOption)

      // Generate a mock card for sandbox testing
      const mockCardNumber = '4' + Array(15).fill(0).map(() => Math.floor(Math.random() * 10)).join('')
      const mockCvv = Math.floor(100 + Math.random() * 900).toString()

      return {
        success: true,
        cardId: `TEST_${Date.now()}`,
        cardNumber: mockCardNumber,
        cvv: mockCvv,
        expiry: this.formatExpiry(),
        lastFour: mockCardNumber.slice(-4),
        balance: params.denomination
      }
    }

    try {
      const requestBody = {
        productId: parseInt(matchingOption.productId),
        countryCode: 'US',
        quantity: 1,
        unitPrice: params.denomination,
        customIdentifier: `VC_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        senderName: 'Zenorar'
      }

      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/com.reloadly.giftcards-v1+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.errorMessage || 'Purchase failed'
        }
      }

      const card = data.cards?.[0] || data

      return {
        success: true,
        cardId: String(data.transactionId),
        cardNumber: card.cardNumber || card.pinCode,
        cvv: card.pinCode || '',
        expiry: this.formatExpiry(card.expiryDate),
        lastFour: (card.cardNumber || card.pinCode || '').slice(-4),
        balance: params.denomination
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Purchase request failed'
      }
    }
  }

  /**
   * Get card details (not supported for Reloadly instant cards after purchase)
   */
  async getCardDetails(cardId: string): Promise<CardDetails | null> {
    // Reloadly doesn't support fetching card details after purchase
    // Card details are stored locally after creation
    return null
  }

  /**
   * Test connection to Reloadly
   */
  async testConnection(): Promise<{ success: boolean; mode?: string; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Reloadly not configured' }
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
   * Clear token cache (call after settings update)
   */
  clearCache(): void {
    tokenCache = null
  }

  /**
   * Extract card brand from product name
   */
  private extractBrand(productName: string): CardBrand {
    const lower = productName.toLowerCase()
    if (lower.includes('mastercard')) return 'mastercard'
    return 'visa'
  }

  /**
   * Transform Reloadly product name to clean display name
   * "Visa Gift Card $50" -> "Visa"
   * "Mastercard Prepaid $100" -> "Mastercard"
   */
  transformProductName(productName: string): string {
    let name = productName
      .replace(/gift\s*card/gi, '')
      .replace(/prepaid/gi, '')
      .replace(/virtual/gi, '')
      .replace(/\$\d+/g, '')
      .replace(/\d+\s*usd/gi, '')
      .trim()

    // Extract just the brand name
    const lower = name.toLowerCase()
    if (lower.includes('mastercard')) return 'Mastercard'
    if (lower.includes('visa')) return 'Visa'
    return name || 'Card'
  }

  /**
   * Format expiry date to MM/YYYY
   */
  private formatExpiry(expiryDate?: string): string {
    if (!expiryDate) {
      // Default to 1 year from now
      const date = new Date()
      date.setFullYear(date.getFullYear() + 1)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${month}/${year}`
    }

    try {
      const date = new Date(expiryDate)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${month}/${year}`
    } catch {
      return '12/2025'
    }
  }
}

export const reloadlyCardsProvider = new ReloadlyCardsProvider()
