import { NextResponse } from 'next/server'
import { executeQuery, getSiteSetting } from '@/lib/db-helpers'

// Fallback rates if APIs fail
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1550, GHS: 15.5, CNY: 7.24,
  BTC: 0.000016, ETH: 0.00042, BNB: 0.0033, SOL: 0.0067, USDT: 1,
}

const CACHE_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour

interface CachedRates {
  rates: Record<string, number>
  timestamp: number
}

async function getApiKeys() {
  try {
    const result = await executeQuery(
      `SELECT key, value FROM site_settings WHERE key IN ('exchangerate_api_key', 'coingecko_api_key')`,
      []
    )
    const keys: Record<string, string> = {}
    for (const row of result.rows) {
      if (row.value) keys[row.key] = row.value
    }
    return keys
  } catch {
    return {}
  }
}

async function getCachedRates(): Promise<CachedRates | null> {
  try {
    const cached = await getSiteSetting('cached_exchange_rates')
    if (!cached) return null
    const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached
    if (parsed && parsed.rates && parsed.timestamp) return parsed
    return null
  } catch {
    return null
  }
}

async function saveCachedRates(rates: Record<string, number>) {
  try {
    const value = JSON.stringify({ rates, timestamp: Date.now() })
    await executeQuery(
      `INSERT INTO site_settings (id, key, value, "group", "isPublic", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'cached_exchange_rates', $1, 'system', false, NOW(), NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()`,
      [value]
    )
  } catch {
    // Cache save failure is non-critical
  }
}

async function fetchFiatRates(apiKey?: string): Promise<Record<string, number>> {
  const url = apiKey
    ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
    : 'https://open.er-api.com/v6/latest/USD'

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Fiat API returned ${res.status}`)

  const data = await res.json()
  const allRates = data.rates || data.conversion_rates
  if (!allRates) throw new Error('No rates in response')

  // Extract only our supported fiat currencies
  const fiatCodes = ['EUR', 'GBP', 'NGN', 'GHS', 'CNY']
  const rates: Record<string, number> = { USD: 1 }
  for (const code of fiatCodes) {
    if (allRates[code]) rates[code] = allRates[code]
  }
  return rates
}

async function fetchCryptoRates(apiKey?: string): Promise<Record<string, number>> {
  const ids = 'bitcoin,ethereum,binancecoin,solana,tether'
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`

  const headers: Record<string, string> = {}
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Crypto API returned ${res.status}`)

  const data = await res.json()

  // Convert from "price in USD" to "how much crypto per 1 USD"
  const rates: Record<string, number> = {}
  if (data.bitcoin?.usd) rates.BTC = 1 / data.bitcoin.usd
  if (data.ethereum?.usd) rates.ETH = 1 / data.ethereum.usd
  if (data.binancecoin?.usd) rates.BNB = 1 / data.binancecoin.usd
  if (data.solana?.usd) rates.SOL = 1 / data.solana.usd
  if (data.tether?.usd) rates.USDT = 1 / data.tether.usd

  return rates
}

export async function GET() {
  try {
    // Check cache first
    const cached = await getCachedRates()
    if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
      return NextResponse.json({ success: true, data: cached.rates, cached: true })
    }

    // Fetch fresh rates
    const apiKeys = await getApiKeys()
    let fiatRates: Record<string, number> = {}
    let cryptoRates: Record<string, number> = {}

    // Fetch fiat and crypto in parallel
    const [fiatResult, cryptoResult] = await Promise.allSettled([
      fetchFiatRates(apiKeys.exchangerate_api_key),
      fetchCryptoRates(apiKeys.coingecko_api_key),
    ])

    if (fiatResult.status === 'fulfilled') {
      fiatRates = fiatResult.value
    }
    if (cryptoResult.status === 'fulfilled') {
      cryptoRates = cryptoResult.value
    }

    // Merge: live rates override fallbacks
    const rates = { ...FALLBACK_RATES, ...fiatRates, ...cryptoRates }

    // Cache the result
    await saveCachedRates(rates)

    return NextResponse.json({ success: true, data: rates, cached: false })
  } catch {
    // On total failure, return fallback rates
    return NextResponse.json({ success: true, data: FALLBACK_RATES, cached: false })
  }
}
