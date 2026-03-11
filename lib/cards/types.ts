// Virtual Cards Type Definitions
// Supports Sudo Africa, Lithic, and Reloadly providers

export type CardProvider = 'sudo' | 'lithic' | 'reloadly'
export type CardType = 'virtual' | 'instant'
export type CardBrand = 'visa' | 'mastercard'
export type CardStatus = 'active' | 'frozen' | 'used' | 'expired'

// User's virtual card in the library
export interface UserCard {
  id: string
  userId: string
  provider: CardProvider
  providerCardId?: string
  cardType: CardType
  cardBrand: CardBrand
  cardLastFour?: string
  cardExpiry?: string // MM/YYYY
  currency: string
  balance: number // For virtual cards
  denomination?: number // For instant cards (fixed value)
  status: CardStatus
  nickname?: string
  isPremium: boolean // True for Lithic (3D Secure)
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  metadata?: Record<string, any>
}

// Card with revealed details (sensitive - only return when requested)
export interface UserCardWithDetails extends UserCard {
  cardNumber: string
  cardCvv: string
}

// Card transaction
export interface CardTransaction {
  id: string
  cardId: string
  userId: string
  provider: CardProvider
  providerTxId?: string
  type: 'purchase' | 'refund' | 'top_up' | 'creation' | 'spend'
  amount: number
  fee: number
  merchantName?: string
  merchantCategory?: string
  status: 'pending' | 'completed' | 'failed'
  description?: string
  createdAt: Date
  metadata?: Record<string, any>
}

// Card pricing (admin-configurable)
export interface CardPricing {
  id: string
  provider: CardProvider
  displayName: string
  creationFee: number
  topUpFeePercent: number
  instantMarkupPercent: number
  minTopUp: number
  maxTopUp: number
  minDenomination: number
  maxDenomination: number
  isEnabled: boolean
  features: {
    '3d_secure'?: boolean
    instant?: boolean
    description?: string
    [key: string]: any
  }
  createdAt: Date
  updatedAt: Date
}

// Provider interface for card operations
export interface CardProviderInterface {
  name: CardProvider
  createCard(params: CreateCardParams): Promise<CreateCardResult>
  getCardDetails(cardId: string): Promise<CardDetails | null>
  topUp?(cardId: string, amount: number): Promise<TopUpResult>
  freeze?(cardId: string): Promise<{ success: boolean; error?: string }>
  unfreeze?(cardId: string): Promise<{ success: boolean; error?: string }>
  getTransactions?(cardId: string, limit?: number): Promise<ProviderTransaction[]>
  testConnection(): Promise<{ success: boolean; mode?: string; error?: string }>
}

export interface CreateCardParams {
  userId: string
  currency?: string
  denomination?: number // For instant cards
  cardBrand?: CardBrand
}

export interface CreateCardResult {
  success: boolean
  cardId?: string
  cardNumber?: string
  cvv?: string
  expiry?: string
  lastFour?: string
  balance?: number
  error?: string
}

export interface CardDetails {
  cardId: string
  cardNumber: string
  cvv: string
  expiry: string
  lastFour: string
  balance: number
  status: string
  brand: CardBrand
}

export interface TopUpResult {
  success: boolean
  newBalance?: number
  transactionId?: string
  error?: string
}

export interface ProviderTransaction {
  id: string
  amount: number
  type: string
  merchantName?: string
  merchantCategory?: string
  status: string
  createdAt: Date
}

// API request/response types
export interface CreateCardRequest {
  provider: CardProvider
  cardType: CardType
  denomination?: number // Required for instant cards
  cardBrand?: CardBrand
  nickname?: string
}

export interface TopUpRequest {
  amount: number
}

export interface CardProviderInfo {
  provider: CardProvider
  displayName: string
  cardType: CardType
  cardBrand: CardBrand
  isPremium: boolean
  creationFee: number
  topUpFeePercent: number
  instantMarkupPercent: number
  minTopUp: number
  maxTopUp: number
  minDenomination: number
  maxDenomination: number
  features: Record<string, any>
  isEnabled: boolean
}

// For Reloadly instant cards - available denominations
export interface InstantCardOption {
  productId: string
  brand: CardBrand
  denomination: number
  totalPrice: number // denomination + markup
  currency: string
}

// Display helpers
export function getCardDisplayName(card: UserCard): string {
  const brandName = card.cardBrand === 'visa' ? 'Visa' : 'Mastercard'
  if (card.isPremium) {
    return `Premium ${brandName}`
  }
  return brandName
}

export function getCardTypeLabel(cardType: CardType): string {
  return cardType === 'virtual' ? 'Virtual Card' : 'Instant Card'
}

export function formatCardNumber(lastFour?: string): string {
  if (!lastFour) return '**** **** **** ****'
  return `**** **** **** ${lastFour}`
}

export function maskCardNumber(cardNumber: string): string {
  if (cardNumber.length < 4) return cardNumber
  const lastFour = cardNumber.slice(-4)
  return `**** **** **** ${lastFour}`
}

// Status helpers
export function isCardActive(card: UserCard): boolean {
  return card.status === 'active'
}

export function isCardUsable(card: UserCard): boolean {
  // Active cards are usable (virtual can be reused, instant is single-use)
  return card.status === 'active'
}

export function shouldShowInLibrary(card: UserCard): boolean {
  // Hide used and expired cards from library view
  return card.status !== 'used' && card.status !== 'expired'
}
