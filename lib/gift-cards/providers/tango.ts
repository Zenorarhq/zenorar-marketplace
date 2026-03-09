// Tango Card (RaaS) Gift Cards API Provider
// Documentation: https://developers.tangocard.com/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type { GiftCardProvider, ProviderProduct, ProviderPurchaseResult } from '../types'

interface TangoCredentials {
  platformName: string
  platformKey: string
  isSandbox: boolean
}

interface TangoToken {
  accessToken: string
  expiresAt: number
}

let tokenCache: TangoToken | null = null

class TangoProvider implements GiftCardProvider {
  name = 'tango'

  private async getCredentials(): Promise<TangoCredentials | null> {
    try {
      // Settings are saved under 'api' group by admin settings page
      const settings = await getSiteSettingsByGroup('api')

      const enabled = settings.tangoEnabled === true || settings.tangoEnabled === 'true'

      // Determine mode first
      const isSandbox = settings.tangoMode === 'sandbox' || settings.tangoSandbox === true ||
                        settings.tangoSandbox === 'true' || process.env.TANGO_SANDBOX === 'true'

      // Use new split credential fields based on mode
      let platformName = ''
      let platformKey = ''

      if (isSandbox) {
        platformName = settings.tangoSandboxPlatformName || settings.tangoPlatformName || process.env.TANGO_PLATFORM_NAME || ''
        platformKey = settings.tangoSandboxPlatformKey || settings.tangoPlatformKey || process.env.TANGO_PLATFORM_KEY || ''
      } else {
        platformName = settings.tangoProductionPlatformName || settings.tangoPlatformName || process.env.TANGO_PLATFORM_NAME || ''
        platformKey = settings.tangoProductionPlatformKey || settings.tangoPlatformKey || process.env.TANGO_PLATFORM_KEY || ''
      }

      const hasCredentials = platformName || platformKey
      if (!enabled && !hasCredentials) {
        return null
      }

      if (!platformName || !platformKey) {
        return null
      }

      return { platformName, platformKey, isSandbox }
    } catch (error) {
      console.error('Error getting Tango credentials:', error)
      return null
    }
  }

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://integration-api.tangocard.com/raas/v2'
      : 'https://api.tangocard.com/raas/v2'
  }

  private getAuthHeader(credentials: TangoCredentials): string {
    return 'Basic ' + Buffer.from(`${credentials.platformName}:${credentials.platformKey}`).toString('base64')
  }

  async getProducts(countryCode?: string): Promise<ProviderProduct[]> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      console.warn('Tango not configured')
      return []
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/catalogs`, {
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Tango catalog error:', await response.text())
        return []
      }

      const data = await response.json()
      const products: ProviderProduct[] = []

      // Tango returns brands with items
      for (const brand of data.brands || []) {
        for (const item of brand.items || []) {
          // Only include gift cards (not donations, etc.)
          if (item.itemType !== 'gift_card') continue

          const denominations: number[] = []
          if (item.valueType === 'FIXED_VALUE') {
            denominations.push(parseFloat(item.faceValue))
          } else if (item.valueType === 'VARIABLE_VALUE') {
            // Generate common denominations within range
            const min = parseFloat(item.minValue || 5)
            const max = parseFloat(item.maxValue || 500)
            const commonValues = [5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500]
            for (const val of commonValues) {
              if (val >= min && val <= max) {
                denominations.push(val)
              }
            }
          }

          products.push({
            productId: item.utid,
            brand: brand.brandName,
            category: this.mapCategory(brand.brandKey),
            description: brand.description,
            imageUrl: brand.imageUrls?.['300w-326ppi'] || brand.imageUrls?.['80w-326ppi'],
            denominations,
            minAmount: item.valueType === 'VARIABLE_VALUE' ? parseFloat(item.minValue) : undefined,
            maxAmount: item.valueType === 'VARIABLE_VALUE' ? parseFloat(item.maxValue) : undefined,
            country: item.countries?.[0] || 'US',
            currency: item.currencyCode || 'USD'
          })
        }
      }

      return products
    } catch (error) {
      console.error('Tango getProducts error:', error)
      return []
    }
  }

  private mapCategory(brandKey: string): string {
    const categoryMap: Record<string, string> = {
      'amazon': 'shopping',
      'walmart': 'shopping',
      'target': 'shopping',
      'netflix': 'streaming',
      'spotify': 'streaming',
      'hulu': 'streaming',
      'starbucks': 'food',
      'doordash': 'food',
      'uber-eats': 'food',
      'xbox': 'gaming',
      'playstation': 'gaming',
      'steam': 'gaming',
      'nintendo': 'gaming',
    }

    const key = brandKey.toLowerCase()
    for (const [pattern, category] of Object.entries(categoryMap)) {
      if (key.includes(pattern)) {
        return category
      }
    }
    return 'other'
  }

  async checkStock(productId: string, denomination: number): Promise<number> {
    // Tango is API-based, always has stock
    return 999
  }

  async purchaseCard(productId: string, denomination: number): Promise<ProviderPurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Tango not configured' }
    }

    try {
      // Generate unique reference
      const externalRefId = `ZEN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(credentials),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountIdentifier: credentials.platformName,
          amount: denomination,
          customerIdentifier: externalRefId,
          sendEmail: false,
          utid: productId,
          externalRefID: externalRefId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.errors?.[0]?.message || 'Failed to purchase'
        }
      }

      // Tango returns reward object with credentials
      const reward = data.reward

      return {
        success: true,
        orderId: data.referenceOrderID,
        code: reward?.credentials?.cardNumber || reward?.credentialList?.[0]?.value || '',
        pin: reward?.credentials?.pin || reward?.credentialList?.[1]?.value,
        expiresAt: reward?.expirationDate ? new Date(reward.expirationDate) : undefined
      }
    } catch (error: any) {
      console.error('Tango purchase error:', error)
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
        {
          headers: {
            'Authorization': this.getAuthHeader(credentials),
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        return { status: 'error' }
      }

      const data = await response.json()
      const reward = data.reward

      return {
        status: data.status || 'COMPLETE',
        code: reward?.credentials?.cardNumber || reward?.credentialList?.[0]?.value,
        pin: reward?.credentials?.pin || reward?.credentialList?.[1]?.value
      }
    } catch (error) {
      console.error('Tango order status error:', error)
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
        `${this.getBaseUrl(credentials.isSandbox)}/accounts/${credentials.platformName}`,
        {
          headers: {
            'Authorization': this.getAuthHeader(credentials),
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        return 0
      }

      const data = await response.json()
      return parseFloat(data.currentBalance) || 0
    } catch (error) {
      console.error('Tango balance error:', error)
      return 0
    }
  }
}

export const tangoProvider = new TangoProvider()
