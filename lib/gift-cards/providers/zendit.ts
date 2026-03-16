// Zendit Gift Card (Voucher) Provider
// Uses same API credentials as Zendit eSIM provider
// Documentation: https://developers.zendit.io/api/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type { GiftCardProvider, ProviderProduct, ProviderPurchaseResult } from '../types'

interface ZenditCredentials {
  baseUrl: string
  apiKey: string
}

const REQUEST_TIMEOUT = 30000
const HEALTH_CHECK_TIMEOUT = 10000

// Cache credentials (shared pattern with eSIM provider)
let credentialsCache: { credentials: ZenditCredentials | null; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000

class ZenditGiftCardProvider implements GiftCardProvider {
  name = 'zendit'

  private async getCredentials(): Promise<ZenditCredentials | null> {
    if (credentialsCache && Date.now() - credentialsCache.timestamp < CACHE_TTL) {
      return credentialsCache.credentials
    }

    try {
      const settings = await getSiteSettingsByGroup('api')

      // Check if Zendit gift cards are enabled
      const giftCardsEnabled = settings.zenditGiftCardsEnabled === true || settings.zenditGiftCardsEnabled === 'true'
      const isSandbox = settings.zenditMode === 'sandbox'

      let apiKey: string
      if (isSandbox) {
        apiKey = settings.zenditSandboxApiKey || process.env.ZENDIT_SANDBOX_API_KEY || ''
      } else {
        apiKey = settings.zenditProductionApiKey || process.env.ZENDIT_API_KEY || ''
      }

      if (!giftCardsEnabled && !apiKey) {
        credentialsCache = { credentials: null, timestamp: Date.now() }
        return null
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
      console.error('Error getting Zendit gift card credentials:', error)
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
      throw new Error('Zendit gift cards not configured')
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

      return response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`Zendit API timeout after ${timeout / 1000}s`)
      }
      throw error
    }
  }

  async getProducts(countryCode?: string): Promise<ProviderProduct[]> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      console.warn('Zendit gift cards not configured')
      return []
    }

    try {
      const allProducts: ProviderProduct[] = []
      let offset = 0
      const limit = 100

      while (true) {
        const response = await this.request<any>(
          'GET',
          `/vouchers/offers?_limit=${limit}&_offset=${offset}`
        )

        const offers = response.list || response.data || (Array.isArray(response) ? response : [])

        if (!offers || offers.length === 0) break

        if (offset === 0) {
          // Log unique subTypes across first batch for debugging category mapping
          const uniqueSubTypes = new Set<string>()
          for (const o of offers) {
            if (Array.isArray(o.subTypes)) o.subTypes.forEach((s: string) => uniqueSubTypes.add(s))
          }
          console.log(`[Zendit Gift Cards] Unique subTypes in first batch:`, [...uniqueSubTypes])
        }

        for (const offer of offers) {
          // Parse price — Zendit uses { fixed, currencyDivisor } format
          let price = 0
          const priceObj = offer.price || offer.send
          if (priceObj && typeof priceObj === 'object' && 'fixed' in priceObj) {
            price = (priceObj.fixed || 0) / (priceObj.currencyDivisor || 100)
          } else if (typeof priceObj === 'number') {
            price = priceObj
          }

          // Parse denomination — use send value (what user pays in face value)
          let denomination = 0
          const sendObj = offer.send
          if (sendObj && typeof sendObj === 'object' && 'fixed' in sendObj) {
            denomination = (sendObj.fixed || 0) / (sendObj.currencyDivisor || 100)
          }

          // Prefer brandName (readable) over brand (slug-like)
          const brand = offer.brandName || offer.brand || offer.name || 'Unknown'
          const offerId = offer.offerId || offer.id

          // Use subTypes from API for category mapping, fall back to brand name matching
          const subTypes = Array.isArray(offer.subTypes) ? offer.subTypes : []
          const category = this.mapCategory(brand, subTypes)

          // Generate logo URL from brand name via Clearbit (same as ServiceLogo component)
          const imageUrl = this.getBrandLogoUrl(brand)

          allProducts.push({
            productId: offerId,
            brand,
            category,
            description: offer.shortNotes || offer.notes || undefined,
            imageUrl,
            denominations: denomination > 0 ? [denomination] : (price > 0 ? [price] : []),
            country: offer.country || countryCode || 'US',
            currency: sendObj?.currency || priceObj?.currency || 'USD',
          })
        }

        console.log(`[Zendit Gift Cards] Fetched ${offers.length} offers at offset ${offset}`)

        if (offers.length < limit) break
        offset += limit
      }

      console.log(`[Zendit Gift Cards] Total products fetched: ${allProducts.length}`)
      return allProducts
    } catch (error) {
      console.error('Zendit gift cards getProducts error:', error)
      return []
    }
  }

  /**
   * Generate a logo URL for a brand using Clearbit Logo API
   * Maps known brand names to their domains for high-quality logos
   */
  private getBrandLogoUrl(brand: string): string | undefined {
    const domain = this.getBrandDomain(brand)
    if (domain) {
      return `https://logo.clearbit.com/${domain}`
    }
    return undefined
  }

  private getBrandDomain(brand: string): string | null {
    const lower = brand.toLowerCase().replace(/[^a-z0-9]/g, '')

    // Direct brand-to-domain mapping for common gift card brands
    const BRAND_DOMAINS: Record<string, string> = {
      // Shopping & Retail
      amazon: 'amazon.com', walmart: 'walmart.com', target: 'target.com',
      ebay: 'ebay.com', bestbuy: 'bestbuy.com', ikea: 'ikea.com',
      costco: 'costco.com', homedepot: 'homedepot.com', lowes: 'lowes.com',
      macys: 'macys.com', nordstrom: 'nordstrom.com', kohls: 'kohls.com',
      jcpenney: 'jcpenney.com', sephora: 'sephora.com', ulta: 'ulta.com',
      nike: 'nike.com', adidas: 'adidas.com', underarmour: 'underarmour.com',
      gap: 'gap.com', oldnavy: 'oldnavy.com', bathandbodyworks: 'bathandbodyworks.com',
      victoriassecret: 'victoriassecret.com', asos: 'asos.com',
      footlocker: 'footlocker.com', dickssportinggoods: 'dickssportinggoods.com',
      rei: 'rei.com', wayfair: 'wayfair.com', overstock: 'overstock.com',
      // Food & Restaurants
      starbucks: 'starbucks.com', doordash: 'doordash.com', grubhub: 'grubhub.com',
      ubereats: 'ubereats.com', dominos: 'dominos.com', pizzahut: 'pizzahut.com',
      mcdonalds: 'mcdonalds.com', burgerking: 'bk.com', wendys: 'wendys.com',
      chipotle: 'chipotle.com', subway: 'subway.com', papajohns: 'papajohns.com',
      dunkin: 'dunkindonuts.com', panera: 'panerabread.com',
      olivegarden: 'olivegarden.com', redlobster: 'redlobster.com',
      tacbell: 'tacobell.com', tacobell: 'tacobell.com', chickfila: 'chick-fil-a.com',
      wholefoods: 'wholefoodsmarket.com', instacart: 'instacart.com',
      // Gaming
      steam: 'steampowered.com', xbox: 'xbox.com', playstation: 'playstation.com',
      nintendo: 'nintendo.com', roblox: 'roblox.com', epicgames: 'epicgames.com',
      riot: 'riotgames.com', blizzard: 'blizzard.com', ea: 'ea.com',
      razer: 'razer.com', valorant: 'playvalorant.com',
      // Streaming & Entertainment
      netflix: 'netflix.com', spotify: 'spotify.com', hulu: 'hulu.com',
      disneyplus: 'disneyplus.com', disney: 'disney.com', hbomax: 'hbomax.com',
      applemusic: 'apple.com', youtube: 'youtube.com', twitch: 'twitch.tv',
      crunchyroll: 'crunchyroll.com', pandora: 'pandora.com', deezer: 'deezer.com',
      paramountplus: 'paramountplus.com', peacock: 'peacocktv.com',
      // Software & Tech
      apple: 'apple.com', google: 'google.com', microsoft: 'microsoft.com',
      adobe: 'adobe.com', spotify2: 'spotify.com',
      // Travel
      airbnb: 'airbnb.com', uber: 'uber.com', lyft: 'lyft.com',
      expedia: 'expedia.com', hotels: 'hotels.com', southwest: 'southwest.com',
      delta: 'delta.com', hilton: 'hilton.com', marriott: 'marriott.com',
      // Payments & Prepaid
      visa: 'visa.com', mastercard: 'mastercard.com', amex: 'americanexpress.com',
      americanexpress: 'americanexpress.com', paypal: 'paypal.com',
      // Misc popular
      groupon: 'groupon.com', fandango: 'fandango.com', stubhub: 'stubhub.com',
      ticketmaster: 'ticketmaster.com', samsclub: 'samsclub.com',
    }

    // Direct match
    if (BRAND_DOMAINS[lower]) return BRAND_DOMAINS[lower]

    // Try matching by splitting brand name words
    const words = brand.toLowerCase().split(/[\s\-&]+/)
    for (const word of words) {
      const clean = word.replace(/[^a-z0-9]/g, '')
      if (clean.length >= 3 && BRAND_DOMAINS[clean]) return BRAND_DOMAINS[clean]
    }

    // Try guessing domain as brandname.com for well-known patterns
    if (lower.length >= 3 && lower.length <= 20 && /^[a-z]+$/.test(lower)) {
      return `${lower}.com`
    }

    return null
  }

  private mapCategory(brand: string, subTypes: string[] = []): string {
    // First try subTypes from Zendit API
    const subTypesLower = subTypes.map(s => s.toLowerCase())
    for (const st of subTypesLower) {
      if (st.includes('gaming') || st.includes('game') || st.includes('video game')) return 'gaming'
      if (st.includes('streaming') || st.includes('music') || st.includes('video') || st.includes('media')) return 'streaming'
      if (st.includes('food') || st.includes('restaurant') || st.includes('dining') || st.includes('grocery')) return 'food'
      if (st.includes('travel') || st.includes('hotel') || st.includes('airline') || st.includes('transport')) return 'travel'
      if (st.includes('software') || st.includes('cloud') || st.includes('saas') || st.includes('app')) return 'software'
      if (st.includes('mobile') || st.includes('telecom') || st.includes('airtime') || st.includes('topup') || st.includes('wireless')) return 'mobile'
      if (st.includes('entertainment')) return 'entertainment'
      // "General Merchandise", "Shopping", "Retail" etc. → shopping
      if (st.includes('merchandise') || st.includes('shopping') || st.includes('retail') || st.includes('ecommerce')) return 'shopping'
    }

    // Fall back to brand name matching
    const lower = brand.toLowerCase()

    if (lower.includes('game') || lower.includes('xbox') || lower.includes('playstation') ||
        lower.includes('steam') || lower.includes('nintendo') || lower.includes('roblox') ||
        lower.includes('riot') || lower.includes('epic') || lower.includes('pubg') ||
        lower.includes('fortnite') || lower.includes('blizzard') || lower.includes('razer')) {
      return 'gaming'
    }
    if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('hulu') ||
        lower.includes('disney') || lower.includes('streaming') || lower.includes('apple music') ||
        lower.includes('youtube') || lower.includes('twitch') || lower.includes('crunchyroll')) {
      return 'streaming'
    }
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('doordash') ||
        lower.includes('uber eats') || lower.includes('starbucks') || lower.includes('grubhub') ||
        lower.includes('pizza') || lower.includes('mcdonald') || lower.includes('burger')) {
      return 'food'
    }
    if (lower.includes('amazon') || lower.includes('walmart') || lower.includes('target') ||
        lower.includes('ebay') || lower.includes('best buy') || lower.includes('ikea') ||
        lower.includes('costco') || lower.includes('home depot') || lower.includes('nike') ||
        lower.includes('adidas') || lower.includes('sephora') || lower.includes('nordstrom') ||
        lower.includes('macy') || lower.includes('gap') || lower.includes('h&m') ||
        lower.includes('zara') || lower.includes('visa') || lower.includes('mastercard') ||
        lower.includes('amex') || lower.includes('american express') || lower.includes('prepaid')) {
      return 'shopping'
    }
    if (lower.includes('travel') || lower.includes('hotel') || lower.includes('airbnb') ||
        lower.includes('booking') || lower.includes('airline') || lower.includes('uber') ||
        lower.includes('lyft') || lower.includes('expedia')) {
      return 'travel'
    }
    if (lower.includes('microsoft') || lower.includes('adobe') || lower.includes('google') ||
        lower.includes('apple') || lower.includes('software') || lower.includes('office')) {
      return 'software'
    }
    if (lower.includes('mobile') || lower.includes('phone') || lower.includes('data') ||
        lower.includes('airtime') || lower.includes('t-mobile') || lower.includes('verizon') ||
        lower.includes('at&t')) {
      return 'mobile'
    }

    return 'shopping'
  }

  async checkStock(productId: string, denomination: number): Promise<number> {
    const credentials = await this.getCredentials()
    if (!credentials) return 0

    try {
      const data = await this.request<any>(
        'GET',
        `/vouchers/offers/${productId}`,
        undefined,
        HEALTH_CHECK_TIMEOUT
      )
      // If we can fetch the offer, it's available
      return data?.available === false ? 0 : 999
    } catch (error) {
      console.error('Zendit gift card stock check error:', error)
      return 0
    }
  }

  async purchaseCard(productId: string, denomination: number): Promise<ProviderPurchaseResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Zendit gift cards not configured' }
    }

    try {
      const txId = `ZGC_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      // Create purchase
      const purchaseBody: Record<string, unknown> = {
        offerId: productId,
        transactionId: txId,
      }

      // Include value if denomination is specified (for variable-value vouchers)
      if (denomination > 0) {
        purchaseBody.value = {
          type: 'USD',
          value: Math.round(denomination * 100),
        }
      }

      const purchaseResponse = await this.request<any>(
        'POST',
        '/vouchers/purchases',
        purchaseBody
      )

      const transactionId = purchaseResponse.transactionId || txId

      // Poll for confirmation with the code/PIN
      let purchase: any = null
      for (let attempt = 0; attempt < 5; attempt++) {
        purchase = await this.request<any>(
          'GET',
          `/vouchers/purchases/${transactionId}`
        )

        // Check if confirmation is ready with code
        if (purchase.confirmation?.code || purchase.confirmation?.pin ||
            purchase.confirmation?.serial || purchase.confirmation?.voucher ||
            purchase.status === 'DONE' || purchase.status === 'completed') {
          break
        }

        if (attempt < 4) {
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)))
        }
      }

      const confirmation = purchase?.confirmation || {}

      // Extract code and PIN from confirmation
      const code = confirmation.code || confirmation.serial || confirmation.voucher ||
                   confirmation.cardNumber || confirmation.card_number || ''
      const pin = confirmation.pin || confirmation.securityCode || confirmation.security_code || ''

      if (!code && !pin) {
        return {
          success: false,
          orderId: transactionId,
          error: 'Gift card code not yet available from Zendit. Please check order status.',
        }
      }

      return {
        success: true,
        orderId: transactionId,
        code,
        pin: pin || undefined,
        expiresAt: confirmation.expiryDate ? new Date(confirmation.expiryDate) : undefined,
      }
    } catch (error: any) {
      console.error('Zendit gift card purchase error:', error)
      return { success: false, error: error.message || 'Purchase failed' }
    }
  }

  clearCache(): void {
    credentialsCache = null
  }
}

export const zenditGiftCardProvider = new ZenditGiftCardProvider()
