// Gift Card Provisioning Service
// Orchestrates bulk inventory and API provider fallback

import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { sellCode, checkStock as checkBulkStock } from './inventory'
import { reloadlyProvider } from './providers/reloadly'
import { tangoProvider } from './providers/tango'
import { zenditGiftCardProvider } from './providers/zendit'
import { encryptCode, decryptCode } from './encryption'
import type { GiftCardPurchaseResult, GiftCardAvailability, UserGiftCard, ProviderPurchaseResult, GiftCardProvider } from './types'

// Provider map for easy access
const providerMap: Record<ProviderName, GiftCardProvider> = {
  reloadly: reloadlyProvider,
  tango: tangoProvider,
  zendit: zenditGiftCardProvider
}

type ProviderName = 'reloadly' | 'tango' | 'zendit'

/**
 * Get the current mode for a provider from settings
 */
async function getCurrentProviderMode(providerName: ProviderName): Promise<'sandbox' | 'live'> {
  try {
    const settings = await getSiteSettingsByGroup('api')

    switch (providerName) {
      case 'reloadly': {
        const isSandbox = settings.reloadlyMode === 'sandbox' ||
                          settings.reloadlySandbox === true ||
                          settings.reloadlySandbox === 'true'
        return isSandbox ? 'sandbox' : 'live'
      }
      case 'tango': {
        const isSandbox = settings.tangoMode === 'sandbox' ||
                          settings.tangoSandbox === true ||
                          settings.tangoSandbox === 'true'
        return isSandbox ? 'sandbox' : 'live'
      }
      case 'zendit': {
        const isSandbox = settings.zenditMode === 'sandbox'
        return isSandbox ? 'sandbox' : 'live'
      }
      default:
        return 'sandbox'
    }
  } catch {
    return 'sandbox'
  }
}

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
  if (giftCard?.provider && giftCard?.providerProductId) {
    const provider = providerMap[giftCard.provider as ProviderName]
    if (provider) {
      const apiStock = await provider.checkStock(giftCard.providerProductId, denomination)
      if (apiStock > 0) {
        return {
          denomination,
          available: true,
          stock: apiStock,
          source: 'api'
        }
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
    if (giftCard.provider && giftCard.providerProductId) {
      // Check for sandbox/production mode mismatch
      const providerName = giftCard.provider as ProviderName
      const currentMode = await getCurrentProviderMode(providerName)
      if (giftCard.syncedMode && giftCard.syncedMode !== currentMode) {
        const providerDisplayName = providerName.charAt(0).toUpperCase() + providerName.slice(1)
        const errorMsg = `This gift card was synced from ${providerDisplayName} ${giftCard.syncedMode} mode, but you're currently in ${currentMode} mode. Product IDs differ between modes. Please re-sync gift cards from Admin → Gift Cards → Sync Providers, or switch to ${giftCard.syncedMode} mode in Admin → Settings → API.`
        console.error('[Provisioning] Mode mismatch:', { provider: providerName, syncedMode: giftCard.syncedMode, currentMode })
        return { success: false, error: errorMsg }
      }

      console.log(`[Provisioning] Attempting API purchase via ${providerName}:`, {
        giftCardId,
        denomination,
        providerProductId: giftCard.providerProductId,
        syncedMode: giftCard.syncedMode,
        currentMode,
        brand: giftCard.brand
      })

      // Get the appropriate provider
      const provider = providerMap[providerName]
      if (!provider) {
        return { success: false, error: `Provider ${providerName} is not supported.` }
      }

      // For Zendit, look up the specific offerId for this denomination from provider_data
      let purchaseProductId = giftCard.providerProductId
      if (providerName === 'zendit' && giftCard.providerData?.offerIds) {
        const offerIds = giftCard.providerData.offerIds as Record<string, string>
        const denominationOfferId = offerIds[denomination.toString()] || offerIds[denomination]
        if (denominationOfferId) {
          purchaseProductId = denominationOfferId
        }
      }

      // Look up user info to pass recipient fields to providers that require them (e.g. Zendit)
      let userInfo: { email?: string; firstName?: string; lastName?: string } | undefined
      try {
        const userResult = await query(`SELECT email, name FROM users WHERE id = $1`, [userId])
        if (userResult.rows.length > 0) {
          const { email, name } = userResult.rows[0]
          const parts = (name || '').trim().split(/\s+/)
          userInfo = {
            email: email || undefined,
            firstName: parts[0] || 'Customer',
            lastName: parts.slice(1).join(' ') || undefined,
          }
        }
      } catch {
        // Non-fatal — proceed without user info
      }

      // Call the provider's purchaseCard method
      console.log(`[Provisioning] Calling ${providerName}.purchaseCard with productId=${purchaseProductId}, denomination=${denomination}`)

      const apiResult = await provider.purchaseCard(
        purchaseProductId,
        denomination,
        userInfo
      )

      console.log(`[Provisioning] ${providerName} result:`, {
        success: apiResult.success,
        hasCode: !!apiResult.code,
        orderId: apiResult.orderId,
        error: apiResult.error
      })

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
          source: providerName,
          expiresAt: apiResult.expiresAt,
          providerOrderId: apiResult.orderId
        })

        console.log(`[Provisioning] API purchase via ${providerName} successful:`, { userGiftCardId: userGiftCard.id })

        return {
          success: true,
          userGiftCardId: userGiftCard.id,
          code: apiResult.code,
          pin: apiResult.pin,
          expiresAt: apiResult.expiresAt
        }
      }

      // Return the actual error from the provider for better debugging
      let errorMsg = apiResult.error || 'Gift card purchase failed'

      // Enhance error message for common issues
      if (errorMsg.toLowerCase().includes('product') && errorMsg.toLowerCase().includes('not found')) {
        errorMsg = `${errorMsg}. This may be due to a sandbox/production mode mismatch. Please re-sync gift cards from Admin → Gift Cards → Sync Providers.`
      }

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
  syncedMode?: 'sandbox' | 'live'
  providerData?: Record<string, any>
} | null> {
  try {
    const result = await query(
      `SELECT id, brand, category, image_url, provider, provider_product_id, provider_data
       FROM gift_cards
       WHERE id = $1`,
      [giftCardId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    // Extract synced_mode from provider_data if available
    let syncedMode: 'sandbox' | 'live' | undefined
    if (row.provider_data && typeof row.provider_data === 'object') {
      syncedMode = row.provider_data.synced_mode
    }

    return {
      id: row.id,
      brand: row.brand,
      category: row.category,
      imageUrl: row.image_url,
      provider: row.provider,
      providerProductId: row.provider_product_id,
      syncedMode,
      providerData: row.provider_data || undefined
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
  source: 'bulk' | 'reloadly' | 'tango' | 'zendit' | 'manual'
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
