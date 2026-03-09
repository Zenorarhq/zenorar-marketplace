// Gift Cards Type Definitions

export interface GiftCardProduct {
  id: string
  brand: string
  slug: string
  category: string
  description?: string
  imageUrl?: string
  denominations: number[]
  discountPercent: number
  isActive: boolean
  isFeatured: boolean
  minCustomAmount?: number
  maxCustomAmount?: number
  currency?: string // Default: USD
  provider?: string
  providerProductId?: string
  providerData?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface GiftCardCode {
  id: string
  giftCardId: string
  denomination: number
  currency?: string // Default: USD
  code: string
  pin?: string
  status: 'available' | 'reserved' | 'sold' | 'expired' | 'invalid'
  costPrice?: number
  batchId?: string
  expiresAt?: Date
  reservedAt?: Date
  reservedBy?: string
  reservationExpiresAt?: Date
  soldAt?: Date
  soldTo?: string
  orderId?: string
  createdAt: Date
}

export interface UserGiftCard {
  id: string
  userId: string
  giftCardId?: string
  giftCardCodeId?: string
  orderId?: string
  brand: string
  category?: string
  imageUrl?: string
  denomination: number
  currency?: string // Default: USD
  code: string
  pin?: string
  status: 'delivered' | 'redeemed' | 'expired' | 'refunded'
  source: 'bulk' | 'reloadly' | 'manual'
  deliveredAt: Date
  redeemedAt?: Date
  expiresAt?: Date
  providerOrderId?: string
  providerData?: Record<string, any>
  createdAt: Date
}

export interface ImportBatch {
  id: string
  batchId: string
  giftCardId: string
  filename?: string
  totalCodes: number
  successfulCodes: number
  failedCodes: number
  status: 'processing' | 'completed' | 'failed'
  errorLog?: Array<{ row: number; error: string }>
  importedBy?: string
  createdAt: Date
  completedAt?: Date
}

// API Response types
export interface GiftCardAvailability {
  denomination: number
  available: boolean
  stock: number
  source: 'bulk' | 'api' | 'none'
}

export interface GiftCardPurchaseResult {
  success: boolean
  userGiftCardId?: string
  code?: string
  pin?: string
  expiresAt?: Date
  error?: string
}

// CSV Import types
export interface GiftCardCSVRow {
  brand_slug: string
  denomination: string
  code: string
  pin?: string
  cost_price?: string
  expires_at?: string
}

export interface ImportResult {
  success: boolean
  batchId: string
  totalRows: number
  successCount: number
  failureCount: number
  errors: Array<{ row: number; error: string }>
}

// Provider types
export interface GiftCardProvider {
  name: string
  getProducts(countryCode?: string): Promise<ProviderProduct[]>
  checkStock(productId: string, denomination: number): Promise<number>
  purchaseCard(productId: string, denomination: number): Promise<ProviderPurchaseResult>
}

export interface ProviderProduct {
  productId: string
  brand: string
  category: string
  description?: string
  imageUrl?: string
  denominations: number[]
  minAmount?: number
  maxAmount?: number
  discountPercent?: number
  country?: string
  currency?: string
}

export interface ProviderPurchaseResult {
  success: boolean
  orderId?: string
  code?: string
  pin?: string
  expiresAt?: Date
  error?: string
}

// Admin types
export interface GiftCardStats {
  totalProducts: number
  activeProducts: number
  totalCodes: number
  availableCodes: number
  soldCodes: number
  expiredCodes: number
  totalRevenue: number
  categoryCounts: Record<string, number>
}

export interface InventoryStats {
  giftCardId: string
  brand: string
  denomination: number
  available: number
  reserved: number
  sold: number
  expired: number
}

// Categories
export const GIFT_CARD_CATEGORIES = [
  'gaming',
  'streaming',
  'shopping',
  'food',
  'travel',
  'entertainment',
  'software',
  'mobile',
  'other'
] as const

export type GiftCardCategory = typeof GIFT_CARD_CATEGORIES[number]

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NGN', 'INR', 'BRL', 'MXN', 'JPY'
] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

// Currency display helpers
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  NGN: '₦',
  INR: '₹',
  BRL: 'R$',
  MXN: 'MX$',
  JPY: '¥'
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '$'
  return `${symbol}${amount.toFixed(2)}`
}
