// Currency conversion and formatting utilities

export interface Currency {
  code: string
  name: string
  symbol: string
}

// Exchange rates relative to USD (base currency)
// In production, these would be fetched from an API
const exchangeRates: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1550,
  GHS: 15.5,
  CNY: 7.24,
  BTC: 0.000016,
  ETH: 0.00042,
  BNB: 0.0033,
  SOL: 0.0067,
  USDT: 1,
}

// Convert price from USD to target currency
export function convertPrice(priceInUSD: number, targetCurrency: string): number {
  const rate = exchangeRates[targetCurrency] || 1
  return priceInUSD * rate
}

// Format price with currency symbol
export function formatPrice(
  priceInUSD: number,
  currency: Currency,
  options?: { showCode?: boolean }
): string {
  const convertedPrice = convertPrice(priceInUSD, currency.code)

  // Determine decimal places based on currency type
  const isCrypto = ['BTC', 'ETH', 'BNB', 'SOL'].includes(currency.code)
  const decimals = isCrypto ? 6 : 2

  // Format the number
  const formattedNumber = convertedPrice.toLocaleString('en-US', {
    minimumFractionDigits: isCrypto ? 4 : 2,
    maximumFractionDigits: decimals,
  })

  // Handle symbol positioning
  const symbolsAfter = ['BNB', 'SOL'] // These show symbol after the number

  if (symbolsAfter.includes(currency.code)) {
    return `${formattedNumber} ${currency.symbol}`
  }

  if (options?.showCode) {
    return `${currency.symbol}${formattedNumber} ${currency.code}`
  }

  return `${currency.symbol}${formattedNumber}`
}

// Get exchange rate for a currency
export function getExchangeRate(currencyCode: string): number {
  return exchangeRates[currencyCode] || 1
}

// List of all supported currencies (for reference)
export const supportedCurrencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ' },
  { code: 'BNB', name: 'Binance Coin', symbol: 'BNB' },
  { code: 'SOL', name: 'Solana', symbol: 'SOL' },
  { code: 'USDT', name: 'Tether', symbol: '₮' },
]
