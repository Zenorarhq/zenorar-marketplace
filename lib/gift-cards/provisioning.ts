// Gift Card Provisioning Service
// Orchestrates bulk inventory and API provider fallback

import { query } from '@/lib/db'
import { sellCode, checkStock as checkBulkStock } from './inventory'
import { reloadlyProvider } from './providers/reloadly'
import { encryptCode, decryptCode } from './encryption'
import type { GiftCardPurchaseResult, GiftCardAvailability, UserGiftCard } from './types'

/**
 * Check availability for a gift card denomination
 * Checks bulk inventory first, then API providers
 */
export async function checkAvailability(
  giftCardId: string,
  denomination: number
): Promise<GiftCardAvailability> {
  // First check bulk inventory
  const bulkStock = await checkBulkStock(giftCardId, denomination)

  if (bulkStock > 0) {
    return {
      denomination,
      available: true,
      stock: bulkStock,
      source: 'bulk'
    }
  }

  // Check if gift card has API provider configured
  const giftCard = await getGiftCard(giftCardId)
  if (giftCard?.provider === 'reloadly' && giftCard?.providerProductId) {
    const apiStock = await reloadlyProvider.checkStock(giftCard.providerProductId, denomination)
    if (apiStock > 0) {
      return {
        denomination,
        available: true,
        stock: apiStock,
        source: 'api'
      }
    }
  }

  return {
    denomination,
    available: false,
    stock: 0,
    source: 'none'
  }
}

/**
 * Provision a gift card for a user after payment
 * Tries bulk inventory first, falls back to API provider
 */
export async function provisionGiftCard(
  giftCardId: string,
  denomination: number,
  userId: string,
  orderId: string,
  reservedCodeId?: string
): Promise<GiftCardPurchaseResult> {
  try {
    // Get gift card details
    const giftCard = await getGiftCard(giftCardId)
    if (!giftCard) {
      return { success: false, error: 'Gift card product not found' }
    }

    // Try bulk inventory first
    const bulkResult = await sellCode(giftCardId, denomination, userId, orderId, reservedCodeId)

    if (bulkResult.success && bulkResult.code) {
      // Create user gift card record
      const userGiftCard = await createUserGiftCard({
        userId,
        giftCardId,
        giftCardCodeId: bulkResult.code.id,
        orderId,
        brand: giftCard.brand,
        category: giftCard.category,
        imageUrl: giftCard.imageUrl,
        denomination,
        code: bulkResult.code.code,
        pin: bulkResult.code.pin,
        source: 'bulk',
        expiresAt: bulkResult.code.expiresAt
      })

      return {
        success: true,
        userGiftCardId: userGiftCard.id,
        code: bulkResult.code.code,
        pin: bulkResult.code.pin,
        expiresAt: bulkResult.code.expiresAt
      }
    }

    // Try API provider if bulk failed and provider is configured
    if (giftCard.provider === 'reloadly' && giftCard.providerProductId) {
      console.log('[Provisioning] Attempting API purchase via Reloadly:', { giftCardId, denomination, providerProductId: giftCard.providerProductId })

      const apiResult = await reloadlyProvider.purchaseCard(
        giftCard.providerProductId,
        denomination
      )

      if (apiResult.success && apiResult.code) {
        // Create user gift card record
        const userGiftCard = await createUserGiftCard({
          userId,
          giftCardId,
          orderId,
          brand: giftCard.brand,
          category: giftCard.category,
          imageUrl: giftCard.imageUrl,
          denomination,
          code: apiResult.code,
          pin: apiResult.pin,
          source: 'reloadly',
          expiresAt: apiResult.expiresAt,
          providerOrderId: apiResult.orderId
        })

        console.log('[Provisioning] API purchase successful:', { userGiftCardId: userGiftCard.id })

        return {
          success: true,
          userGiftCardId: userGiftCard.id,
          code: apiResult.code,
          pin: apiResult.pin,
          expiresAt: apiResult.expiresAt
        }
      }

      // Return the actual error from the provider for better debugging
      const errorMsg = apiResult.error || 'Gift card purchase failed'
      console.error('[Provisioning] API purchase failed:', errorMsg)
      return { success: false, error: errorMsg }
    }

    return { success: false, error: 'This gift card is currently out of stock. Please try a different card or denomination.' }
  } catch (error: any) {
    console.error('Error provisioning gift card:', error)
    return { success: false, error: error.message || 'Provisioning failed' }
  }
}

/**
 * Get gift card product details
 */
async function getGiftCard(giftCardId: string): Promise<{
  id: string
  brand: string
  category: string
  imageUrl?: string
  provider?: string
  providerProductId?: string
} | null> {
  try {
    const result = await query(
      `SELECT id, brand, category, image_url, provider, provider_product_id
       FROM gift_cards
       WHERE id = $1`,
      [giftCardId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      brand: row.brand,
      category: row.category,
      imageUrl: row.image_url,
      provider: row.provider,
      providerProductId: row.provider_product_id
    }
  } catch (error) {
    console.error('Error getting gift card:', error)
    return null
  }
}

/**
 * Create a user gift card record
 */
async function createUserGiftCard(data: {
  userId: string
  giftCardId: string
  giftCardCodeId?: string
  orderId: string
  brand: string
  category?: string
  imageUrl?: string
  denomination: number
  code: string
  pin?: string
  source: 'bulk' | 'reloadly' | 'manual'
  expiresAt?: Date
  providerOrderId?: string
}): Promise<{ id: string }> {
  // Encrypt the code and pin before storing
  const encryptedCode = encryptCode(data.code)
  const encryptedPin = data.pin ? encryptCode(data.pin) : null

  const result = await query(
    `INSERT INTO user_gift_cards
       (user_id, gift_card_id, gift_card_code_id, order_id, brand, category, image_url,
        denomination, code, pin, source, expires_at, provider_order_id, status, delivered_at, code_encrypted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'delivered', NOW(), true)
     RETURNING id`,
    [
      data.userId,
      data.giftCardId,
      data.giftCardCodeId || null,
      data.orderId,
      data.brand,
      data.category || null,
      data.imageUrl || null,
      data.denomination,
      encryptedCode,
      encryptedPin,
      data.source,
      data.expiresAt || null,
      data.providerOrderId || null
    ]
  )

  return { id: result.rows[0].id }
}

/**
 * Get user's purchased gift cards
 */
export async function getUserGiftCards(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<UserGiftCard[]> {
  try {
    const result = await query(
      `SELECT * FROM user_gift_cards
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      giftCardId: row.gift_card_id,
      giftCardCodeId: row.gift_card_code_id,
      orderId: row.order_id,
      brand: row.brand,
      category: row.category,
      imageUrl: row.image_url,
      denomination: parseFloat(row.denomination),
      code: decryptCode(row.code), // Decrypt code for display
      pin: row.pin ? decryptCode(row.pin) : undefined, // Decrypt pin if present
      status: row.status,
      source: row.source,
      deliveredAt: row.delivered_at,
      redeemedAt: row.redeemed_at,
      expiresAt: row.expires_at,
      providerOrderId: row.provider_order_id,
      providerData: row.provider_data,
      createdAt: row.created_at
    }))
  } catch (error) {
    console.error('Error getting user gift cards:', error)
    return []
  }
}

/**
 * Get a single user gift card
 */
export async function getUserGiftCard(
  id: string,
  userId: string
): Promise<UserGiftCard | null> {
  try {
    const result = await query(
      `SELECT * FROM user_gift_cards
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      userId: row.user_id,
      giftCardId: row.gift_card_id,
      giftCardCodeId: row.gift_card_code_id,
      orderId: row.order_id,
      brand: row.brand,
      category: row.category,
      imageUrl: row.image_url,
      denomination: parseFloat(row.denomination),
      code: decryptCode(row.code), // Decrypt code for display
      pin: row.pin ? decryptCode(row.pin) : undefined, // Decrypt pin if present
      status: row.status,
      source: row.source,
      deliveredAt: row.delivered_at,
      redeemedAt: row.redeemed_at,
      expiresAt: row.expires_at,
      providerOrderId: row.provider_order_id,
      providerData: row.provider_data,
      createdAt: row.created_at
    }
  } catch (error) {
    console.error('Error getting user gift card:', error)
    return null
  }
}

/**
 * Mark a gift card as redeemed
 */
export async function markAsRedeemed(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE user_gift_cards
       SET status = 'redeemed', redeemed_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'delivered'
       RETURNING id`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return { success: false, error: 'Gift card not found or already redeemed' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error marking gift card as redeemed:', error)
    return { success: false, error: error.message }
  }
}
