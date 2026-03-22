// Zendit Mobile Top-Up Provider
// Uses same API credentials as Zendit eSIM/voucher providers
// API: GET /v1/topups/offers, POST /v1/topups/purchases, GET /v1/topups/purchases/{id}

import { getSiteSettingsByGroup } from '@/lib/db-helpers'

// ===== Types =====

export interface TopupOffer {
  offerId: string
  brand: string
  brandName: string
  country: string
  regions: string[]
  subTypes: string[]
  priceType: string
  enabled: boolean
  notes: string
  shortNotes: string
  // Price in sender currency (what user pays)
  price: { fixed?: number; min?: number; max?: number; currency?: string; currencyDivisor?: number }
  // Cost to us
  cost: { fixed?: number; min?: number; max?: number; currency?: string; currencyDivisor?: number }
  // Amount received by recipient
  send: { fixed?: number; min?: number; max?: number; currency?: string; currencyDivisor?: number }
}

export interface TopupOperator {
  id: string
  name: string
  country: string
  regions: string[]
  offers: TopupOfferSummary[]
}

export interface TopupOfferSummary {
  offerId: string
  priceType: string
  // Amounts in real currency (already divided by currencyDivisor)
  price: number
  priceCurrency: string
  cost: number | null  // Zendit wholesale cost (null for range-priced offers)
  sendAmount: number
  sendCurrency: string
  // Range bounds (only for RANGE priceType)
  priceMin?: number
  priceMax?: number
  sendMin?: number
  sendMax?: number
  notes: string
  shortNotes: string
}

export interface TopupPurchaseResult {
  success: boolean
  transactionId?: string
  status?: string
  error?: string
}

// ===== Provider =====

interface ZenditCredentials {
  baseUrl: string
  apiKey: string
}

let credentialsCache: { credentials: ZenditCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000
const REQUEST_TIMEOUT = 30000

const operatorsCache = new Map<string, { data: TopupOperator[]; timestamp: number }>()
const OPERATORS_CACHE_TTL = 15 * 60 * 1000 // 15 minutes

class ZenditTopupProvider {
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
   * Fetch all topup offers, optionally filtered by country
   */
  async getOffers(country?: string): Promise<TopupOffer[]> {
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

      allOffers.push(...offers.filter((o: any) => {
        if (o.enabled === false) return false
        // Exclude utility/electricity and pure data/bundle offers (handled by utilities page)
        const st = (Array.isArray(o.subTypes) ? o.subTypes : []).map((s: string) => s.toLowerCase())
        if (st.some((s: string) => s.includes('utility') || s.includes('electricity'))) return false
        if (st.length > 0 && st.every((s: string) => s.includes('data') || s.includes('bundle')) && !st.some((s: string) => s.includes('topup'))) return false
        return true
      }))

      if (offers.length < limit) break
      offset += limit
    }

    return allOffers
  }

  /**
   * Get operators grouped by brand, with their offers
   */
  async getOperators(country?: string): Promise<TopupOperator[]> {
    const cacheKey = country || '__all__'
    const cached = operatorsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < OPERATORS_CACHE_TTL) {
      return cached.data
    }

    const offers = await this.getOffers(country)

    // Group offers by brand (operator)
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

    // Sort operators by name
    const result = Array.from(operatorMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    operatorsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }

  /**
   * Purchase a top-up
   */
  async purchase(params: {
    offerId: string
    recipientPhone: string
    senderPhone?: string
    value?: number
  }): Promise<TopupPurchaseResult> {
    const transactionId = `topup-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

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

      // For range-priced offers, include value as dto.PurchaseValue object { amount, currency }
      if (params.value !== undefined) {
        body.value = { amount: params.value, currency: 'USD' }
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
        error: error.message || 'Failed to process top-up',
      }
    }
  }

  /**
   * Check purchase status
   */
  async getPurchaseStatus(transactionId: string): Promise<{
    status: string
    error?: string
  }> {
    const response = await this.request<any>('GET', `/topups/purchases/${transactionId}`)
    return {
      status: response.status || 'UNKNOWN',
      error: response.error?.message,
    }
  }
}

export const zenditTopupProvider = new ZenditTopupProvider()
