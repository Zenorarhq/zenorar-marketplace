// Zendit Utilities Provider (Electricity + Mobile Data/Bundles)
// Uses same API credentials and endpoints as phone refills
// API: GET /v1/topups/offers (filtered by subTypes), POST /v1/topups/purchases

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type { TopupOffer, TopupOperator, TopupOfferSummary, TopupPurchaseResult } from '@/lib/phone-refills/provider'

// Re-export types for convenience
export type { TopupOffer, TopupOperator, TopupOfferSummary, TopupPurchaseResult }

// ===== Provider =====

interface ZenditCredentials {
  baseUrl: string
  apiKey: string
}

let credentialsCache: { credentials: ZenditCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000
const REQUEST_TIMEOUT = 30000

class ZenditUtilityProvider {
  private async getCredentials(): Promise<ZenditCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      const settings = await getSiteSettingsByGroup('api')

      const isSandbox = settings.zenditMode === 'sandbox'
      let apiKey: string
      if (isSandbox) {
        apiKey = settings.zenditSandboxApiKey || process.env.ZENDIT_SANDBOX_API_KEY || ''
      } else {
        apiKey = settings.zenditProductionApiKey || process.env.ZENDIT_API_KEY || ''
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
      const apiKey = process.env.ZENDIT_API_KEY || ''
      if (!apiKey) return null
      return {
        baseUrl: process.env.ZENDIT_API_URL || 'https://api.zendit.io/v1',
        apiKey,
      }
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    timeout: number = REQUEST_TIMEOUT
  ): Promise<T> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      throw new Error('Zendit not configured')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(`${credentials.baseUrl}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || error.error || `Zendit API error: ${response.status}`)
      }

      return await response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Zendit API request timed out')
      }
      throw error
    }
  }

  /**
   * Fetch topup offers filtered by subType keywords
   */
  private async getOffers(country?: string, subTypeFilter?: (subTypes: string[]) => boolean): Promise<TopupOffer[]> {
    const allOffers: TopupOffer[] = []
    const limit = 100
    let offset = 0

    while (true) {
      let endpoint = `/topups/offers?_limit=${limit}&_offset=${offset}`
      if (country) {
        endpoint += `&country=${country.toUpperCase()}`
      }

      const response = await this.request<any>('GET', endpoint)
      const offers = response.list || response.data || (Array.isArray(response) ? response : [])

      if (!offers || offers.length === 0) break

      for (const o of offers) {
        if (o.enabled === false) continue
        if (subTypeFilter) {
          const st = Array.isArray(o.subTypes) ? o.subTypes : []
          if (!subTypeFilter(st)) continue
        }
        allOffers.push(o)
      }

      if (offers.length < limit) break
      offset += limit
    }

    return allOffers
  }

  /**
   * Group offers into operators
   */
  private groupByOperator(offers: TopupOffer[]): TopupOperator[] {
    const operatorMap = new Map<string, TopupOperator>()

    for (const offer of offers) {
      const key = `${offer.brand}-${offer.country}`
      if (!operatorMap.has(key)) {
        operatorMap.set(key, {
          id: offer.brand,
          name: offer.brandName || offer.brand,
          country: offer.country,
          regions: offer.regions || [],
          offers: [],
        })
      }

      const priceObj = offer.price || {}
      const costObj = offer.cost || {}
      const sendObj = offer.send || {}

      const price = (priceObj.fixed || priceObj.min || 0) / (priceObj.currencyDivisor || 100)
      const costRaw = costObj.fixed ?? costObj.min ?? null
      const cost = costRaw !== null ? costRaw / (costObj.currencyDivisor || 100) : null
      const sendAmount = (sendObj.fixed || sendObj.min || 0) / (sendObj.currencyDivisor || 100)

      const isRange = (offer.priceType || 'FIXED').toUpperCase() === 'RANGE'
      const priceDivisor = priceObj.currencyDivisor || 100
      const sendDivisor = sendObj.currencyDivisor || 100

      operatorMap.get(key)!.offers.push({
        offerId: offer.offerId,
        priceType: offer.priceType || 'FIXED',
        price,
        priceCurrency: priceObj.currency || 'USD',
        cost,
        sendAmount,
        sendCurrency: sendObj.currency || 'USD',
        ...(isRange && {
          priceMin: (priceObj.min || 0) / priceDivisor,
          priceMax: (priceObj.max || 0) / priceDivisor,
          sendMin: (sendObj.min || 0) / sendDivisor,
          sendMax: (sendObj.max || 0) / sendDivisor,
        }),
        notes: offer.notes || '',
        shortNotes: offer.shortNotes || '',
      })
    }

    return Array.from(operatorMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get electricity/utility operators
   */
  async getElectricityOperators(country?: string): Promise<TopupOperator[]> {
    const offers = await this.getOffers(country, (subTypes) => {
      const lower = subTypes.map(s => s.toLowerCase())
      return lower.some(s =>
        s.includes('utility') || s.includes('electricity') || s.includes('prepaid_utility')
      )
    })
    return this.groupByOperator(offers)
  }

  /**
   * Get mobile data + bundle operators (parallel fetch, merged)
   */
  async getDataOperators(country?: string): Promise<TopupOperator[]> {
    const offers = await this.getOffers(country, (subTypes) => {
      const lower = subTypes.map(s => s.toLowerCase())
      return lower.some(s =>
        s.includes('data') || s.includes('bundle')
      ) && !lower.some(s => s.includes('utility') || s.includes('electricity'))
    })
    return this.groupByOperator(offers)
  }

  /**
   * Purchase a utility/data top-up (same Zendit endpoint as phone refills)
   */
  async purchase(params: {
    offerId: string
    recipientPhone: string
    senderPhone?: string
    value?: number
  }): Promise<TopupPurchaseResult> {
    const transactionId = `util-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    try {
      const body: Record<string, unknown> = {
        offerId: params.offerId,
        transactionId,
        recipient: {
          phoneNumber: params.recipientPhone,
        },
        sender: {
          phoneNumber: params.senderPhone || params.recipientPhone,
        },
      }

      if (params.value !== undefined) {
        body.value = params.value
      }

      const response = await this.request<any>('POST', '/topups/purchases', body)

      return {
        success: true,
        transactionId: response.transactionId || transactionId,
        status: response.status || 'ACCEPTED',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process purchase',
      }
    }
  }
}

export const zenditUtilityProvider = new ZenditUtilityProvider()
