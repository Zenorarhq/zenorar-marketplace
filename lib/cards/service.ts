// Unified Virtual Card Service
// Handles all card operations across providers (Sudo, Lithic, Reloadly)

import { executeQuery, executeTransaction, getSiteSettingsByGroup } from '@/lib/db-helpers'
import type {
  UserCard,
  UserCardWithDetails,
  CardTransaction,
  CardPricing,
  CardProvider,
  CardType,
  CardBrand,
  CardProviderInfo,
  CreateCardRequest,
  TopUpRequest,
  InstantCardOption,
  shouldShowInLibrary
} from './types'

// Encryption helpers (for card number/CVV storage)
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-me'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string): string {
  try {
    const [ivHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return ''
  }
}

// Get all enabled card providers with pricing
export async function getEnabledProviders(): Promise<CardProviderInfo[]> {
  const settings = await getSiteSettingsByGroup('api')

  const result = await executeQuery<any>(
    'SELECT * FROM card_pricing WHERE is_enabled = true ORDER BY provider'
  )

  const providers: CardProviderInfo[] = []

  for (const row of result.rows) {
    // Check if provider is enabled in settings
    const providerKey = `${row.provider}CardsEnabled`
    const isEnabledInSettings = settings[providerKey] !== false

    if (!isEnabledInSettings) continue

    const isPremium = row.provider === 'lithic'
    const cardType: CardType = row.provider === 'reloadly' ? 'instant' : 'virtual'

    providers.push({
      provider: row.provider as CardProvider,
      displayName: row.display_name,
      cardType,
      cardBrand: 'visa', // Default, actual brand determined at creation
      isPremium,
      creationFee: parseFloat(row.creation_fee) || 0,
      topUpFeePercent: parseFloat(row.top_up_fee_percent) || 0,
      instantMarkupPercent: parseFloat(row.instant_markup_percent) || 0,
      minTopUp: parseFloat(row.min_top_up) || 5,
      maxTopUp: parseFloat(row.max_top_up) || 10000,
      minDenomination: parseFloat(row.min_denomination) || 5,
      maxDenomination: parseFloat(row.max_denomination) || 500,
      features: row.features || {},
      isEnabled: true
    })
  }

  return providers
}

// Get pricing for a specific provider
export async function getProviderPricing(provider: CardProvider): Promise<CardPricing | null> {
  const result = await executeQuery<any>(
    'SELECT * FROM card_pricing WHERE provider = $1',
    [provider]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id,
    provider: row.provider,
    displayName: row.display_name,
    creationFee: parseFloat(row.creation_fee) || 0,
    topUpFeePercent: parseFloat(row.top_up_fee_percent) || 0,
    instantMarkupPercent: parseFloat(row.instant_markup_percent) || 0,
    minTopUp: parseFloat(row.min_top_up) || 5,
    maxTopUp: parseFloat(row.max_top_up) || 10000,
    minDenomination: parseFloat(row.min_denomination) || 5,
    maxDenomination: parseFloat(row.max_denomination) || 500,
    isEnabled: row.is_enabled,
    features: row.features || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Get user's cards (active only, hides used/expired)
export async function getUserCards(userId: string): Promise<UserCard[]> {
  // First, expire any cards that should be expired
  await executeQuery('SELECT expire_virtual_cards()')

  const result = await executeQuery<any>(
    `SELECT * FROM user_cards
     WHERE user_id = $1 AND status NOT IN ('used', 'expired')
     ORDER BY created_at DESC`,
    [userId]
  )

  return result.rows.map(rowToUserCard)
}

// Get all user's cards including used/expired (for history)
export async function getUserCardsHistory(userId: string): Promise<UserCard[]> {
  const result = await executeQuery<any>(
    `SELECT * FROM user_cards
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  )

  return result.rows.map(rowToUserCard)
}

// Get a single card by ID
export async function getCardById(cardId: string, userId?: string): Promise<UserCard | null> {
  let query = 'SELECT * FROM user_cards WHERE id = $1'
  const params: any[] = [cardId]

  if (userId) {
    query += ' AND user_id = $2'
    params.push(userId)
  }

  const result = await executeQuery<any>(query, params)

  if (result.rows.length === 0) return null

  return rowToUserCard(result.rows[0])
}

// Get card with revealed details (sensitive)
export async function getCardWithDetails(cardId: string, userId: string): Promise<UserCardWithDetails | null> {
  const result = await executeQuery<any>(
    'SELECT * FROM user_cards WHERE id = $1 AND user_id = $2',
    [cardId, userId]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]
  const card = rowToUserCard(row)

  // Decrypt card number and CVV
  const cardNumber = row.card_number_encrypted ? decrypt(row.card_number_encrypted) : ''
  const cardCvv = row.card_cvv_encrypted ? decrypt(row.card_cvv_encrypted) : ''

  return {
    ...card,
    cardNumber,
    cardCvv
  }
}

// Create a new card in the database
export async function createCardRecord(
  userId: string,
  provider: CardProvider,
  providerCardId: string | null,
  cardType: CardType,
  cardBrand: CardBrand,
  lastFour: string,
  cardNumber: string | null,
  cvv: string | null,
  expiry: string,
  balance: number,
  denomination: number | null,
  isPremium: boolean,
  expiresAt: Date | null,
  metadata?: Record<string, any>
): Promise<UserCard> {
  const encryptedNumber = cardNumber ? encrypt(cardNumber) : null
  const encryptedCvv = cvv ? encrypt(cvv) : null

  const result = await executeQuery<any>(
    `INSERT INTO user_cards (
      user_id, provider, provider_card_id, card_type, card_brand,
      card_last_four, card_number_encrypted, card_cvv_encrypted,
      card_expiry, currency, balance, denomination, status,
      is_premium, expires_at, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      userId, provider, providerCardId, cardType, cardBrand,
      lastFour, encryptedNumber, encryptedCvv,
      expiry, 'USD', balance, denomination, 'active',
      isPremium, expiresAt, JSON.stringify(metadata || {})
    ]
  )

  return rowToUserCard(result.rows[0])
}

// Update card balance
export async function updateCardBalance(cardId: string, newBalance: number): Promise<void> {
  await executeQuery(
    'UPDATE user_cards SET balance = $1 WHERE id = $2',
    [newBalance, cardId]
  )
}

// Update card status
export async function updateCardStatus(cardId: string, status: string): Promise<void> {
  await executeQuery(
    'UPDATE user_cards SET status = $1 WHERE id = $2',
    [status, cardId]
  )
}

// Mark instant card as used
export async function markCardAsUsed(cardId: string): Promise<void> {
  await executeQuery(
    "UPDATE user_cards SET status = 'used' WHERE id = $1 AND card_type = 'instant'",
    [cardId]
  )
}

// Record a card transaction
export async function recordTransaction(
  cardId: string,
  userId: string,
  provider: CardProvider,
  type: string,
  amount: number,
  fee: number = 0,
  providerTxId?: string,
  merchantName?: string,
  merchantCategory?: string,
  description?: string,
  metadata?: Record<string, any>
): Promise<CardTransaction> {
  const result = await executeQuery<any>(
    `INSERT INTO card_transactions (
      card_id, user_id, provider, provider_tx_id, type,
      amount, fee, merchant_name, merchant_category, description, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      cardId, userId, provider, providerTxId, type,
      amount, fee, merchantName, merchantCategory, description,
      JSON.stringify(metadata || {})
    ]
  )

  return rowToTransaction(result.rows[0])
}

// Get transactions for a card
export async function getCardTransactions(cardId: string, limit: number = 50): Promise<CardTransaction[]> {
  const result = await executeQuery<any>(
    `SELECT * FROM card_transactions
     WHERE card_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [cardId, limit]
  )

  return result.rows.map(rowToTransaction)
}

// Get all transactions for a user
export async function getUserTransactions(userId: string, limit: number = 100): Promise<CardTransaction[]> {
  const result = await executeQuery<any>(
    `SELECT * FROM card_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  )

  return result.rows.map(rowToTransaction)
}

// Update pricing for a provider (admin)
export async function updateProviderPricing(
  provider: CardProvider,
  updates: Partial<Omit<CardPricing, 'id' | 'provider' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (updates.displayName !== undefined) {
    fields.push(`display_name = $${paramIndex++}`)
    values.push(updates.displayName)
  }
  if (updates.creationFee !== undefined) {
    fields.push(`creation_fee = $${paramIndex++}`)
    values.push(updates.creationFee)
  }
  if (updates.topUpFeePercent !== undefined) {
    fields.push(`top_up_fee_percent = $${paramIndex++}`)
    values.push(updates.topUpFeePercent)
  }
  if (updates.instantMarkupPercent !== undefined) {
    fields.push(`instant_markup_percent = $${paramIndex++}`)
    values.push(updates.instantMarkupPercent)
  }
  if (updates.minTopUp !== undefined) {
    fields.push(`min_top_up = $${paramIndex++}`)
    values.push(updates.minTopUp)
  }
  if (updates.maxTopUp !== undefined) {
    fields.push(`max_top_up = $${paramIndex++}`)
    values.push(updates.maxTopUp)
  }
  if (updates.minDenomination !== undefined) {
    fields.push(`min_denomination = $${paramIndex++}`)
    values.push(updates.minDenomination)
  }
  if (updates.maxDenomination !== undefined) {
    fields.push(`max_denomination = $${paramIndex++}`)
    values.push(updates.maxDenomination)
  }
  if (updates.isEnabled !== undefined) {
    fields.push(`is_enabled = $${paramIndex++}`)
    values.push(updates.isEnabled)
  }
  if (updates.features !== undefined) {
    fields.push(`features = $${paramIndex++}`)
    values.push(JSON.stringify(updates.features))
  }

  if (fields.length === 0) return

  fields.push('updated_at = NOW()')
  values.push(provider)

  await executeQuery(
    `UPDATE card_pricing SET ${fields.join(', ')} WHERE provider = $${paramIndex}`,
    values
  )
}

// Calculate total cost for an instant card
export function calculateInstantCardPrice(denomination: number, markupPercent: number): number {
  return denomination * (1 + markupPercent / 100)
}

// Calculate top-up fee
export function calculateTopUpFee(amount: number, feePercent: number): number {
  return amount * (feePercent / 100)
}

// Helper: Convert database row to UserCard
function rowToUserCard(row: any): UserCard {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerCardId: row.provider_card_id,
    cardType: row.card_type,
    cardBrand: row.card_brand,
    cardLastFour: row.card_last_four,
    cardExpiry: row.card_expiry,
    currency: row.currency,
    balance: parseFloat(row.balance) || 0,
    denomination: row.denomination ? parseFloat(row.denomination) : undefined,
    status: row.status,
    nickname: row.nickname,
    isPremium: row.is_premium,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    metadata: row.metadata || {}
  }
}

// Helper: Convert database row to CardTransaction
function rowToTransaction(row: any): CardTransaction {
  return {
    id: row.id,
    cardId: row.card_id,
    userId: row.user_id,
    provider: row.provider,
    providerTxId: row.provider_tx_id,
    type: row.type,
    amount: parseFloat(row.amount) || 0,
    fee: parseFloat(row.fee) || 0,
    merchantName: row.merchant_name,
    merchantCategory: row.merchant_category,
    status: row.status,
    description: row.description,
    createdAt: new Date(row.created_at),
    metadata: row.metadata || {}
  }
}
