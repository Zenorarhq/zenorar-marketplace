// Gift Card Customer Support Tools
// Code replacement, issue investigation, and reporting

import { query } from '@/lib/db'
import { decryptCode, encryptCode } from './encryption'
import { logAuditEvent } from './audit'
import { sellCode } from './inventory'
import type { UserGiftCard } from './types'

export interface SupportTicketContext {
  userGiftCard: UserGiftCard | null
  auditLog: Array<{
    action: string
    createdAt: Date
    metadata?: any
  }>
  purchaseOrder: {
    orderId: string
    orderDate: Date
    paymentMethod: string
    paymentStatus: string
  } | null
  providerInfo: {
    source: string
    providerOrderId?: string
    status: string
  } | null
}

/**
 * Get comprehensive context for a support ticket
 */
export async function getSupportContext(
  userGiftCardId: string
): Promise<SupportTicketContext> {
  // Get user gift card details
  const cardResult = await query(
    `SELECT ugc.*, o.payment_method, o.payment_status, o.created_at as order_date
     FROM user_gift_cards ugc
     LEFT JOIN orders o ON ugc.order_id = o.id
     WHERE ugc.id = $1`,
    [userGiftCardId]
  )

  const row = cardResult.rows[0]
  const userGiftCard = row ? {
    id: row.id,
    userId: row.user_id,
    giftCardId: row.gift_card_id,
    giftCardCodeId: row.gift_card_code_id,
    orderId: row.order_id,
    brand: row.brand,
    category: row.category,
    imageUrl: row.image_url,
    denomination: parseFloat(row.denomination),
    code: decryptCode(row.code),
    pin: row.pin ? decryptCode(row.pin) : undefined,
    status: row.status,
    source: row.source,
    deliveredAt: row.delivered_at,
    redeemedAt: row.redeemed_at,
    expiresAt: row.expires_at,
    providerOrderId: row.provider_order_id,
    providerData: row.provider_data,
    createdAt: row.created_at
  } : null

  // Get audit log for this card
  const auditResult = await query(
    `SELECT action, metadata, created_at
     FROM gift_card_audit_log
     WHERE resource_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userGiftCardId]
  )

  return {
    userGiftCard,
    auditLog: auditResult.rows.map(r => ({
      action: r.action,
      createdAt: r.created_at,
      metadata: r.metadata
    })),
    purchaseOrder: row ? {
      orderId: row.order_id,
      orderDate: row.order_date,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status
    } : null,
    providerInfo: userGiftCard ? {
      source: userGiftCard.source,
      providerOrderId: userGiftCard.providerOrderId,
      status: userGiftCard.status
    } : null
  }
}

/**
 * Replace a gift card code with a new one from inventory
 */
export async function replaceGiftCardCode(
  userGiftCardId: string,
  adminUserId: string,
  reason: string
): Promise<{ success: boolean; newCode?: string; newPin?: string; error?: string }> {
  try {
    // Get the original card details
    const originalResult = await query(
      `SELECT * FROM user_gift_cards WHERE id = $1`,
      [userGiftCardId]
    )

    if (originalResult.rows.length === 0) {
      return { success: false, error: 'Gift card not found' }
    }

    const original = originalResult.rows[0]

    // Check if it's from bulk inventory (can replace) or API (cannot replace)
    if (original.source !== 'bulk') {
      return {
        success: false,
        error: 'Only bulk inventory codes can be replaced. Contact provider for API-sourced cards.'
      }
    }

    // Get a new code from inventory
    const newCodeResult = await sellCode(
      original.gift_card_id,
      parseFloat(original.denomination),
      original.user_id,
      original.order_id
    )

    if (!newCodeResult.success || !newCodeResult.code) {
      return { success: false, error: 'No replacement code available in inventory' }
    }

    // Update the user gift card with new code
    const encryptedCode = encryptCode(newCodeResult.code.code)
    const encryptedPin = newCodeResult.code.pin ? encryptCode(newCodeResult.code.pin) : null

    await query(
      `UPDATE user_gift_cards
       SET code = $1,
           pin = $2,
           gift_card_code_id = $3,
           status = 'delivered',
           code_encrypted = true
       WHERE id = $4`,
      [encryptedCode, encryptedPin, newCodeResult.code.id, userGiftCardId]
    )

    // Mark old code as invalid
    if (original.gift_card_code_id) {
      await query(
        `UPDATE gift_card_codes
         SET status = 'invalid'
         WHERE id = $1`,
        [original.gift_card_code_id]
      )
    }

    // Log audit event
    await logAuditEvent({
      userId: adminUserId,
      action: 'support_replace_code',
      resourceType: 'user_gift_card',
      resourceId: userGiftCardId,
      metadata: {
        reason,
        oldCodeId: original.gift_card_code_id,
        newCodeId: newCodeResult.code.id,
        brand: original.brand,
        denomination: original.denomination
      }
    })

    return {
      success: true,
      newCode: newCodeResult.code.code,
      newPin: newCodeResult.code.pin
    }
  } catch (error: any) {
    console.error('Error replacing gift card code:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Search for gift cards by code, order, or user
 */
export async function searchGiftCards(params: {
  code?: string
  orderId?: string
  userId?: string
  email?: string
  brand?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<{
  results: Array<UserGiftCard & { userEmail?: string }>
  total: number
}> {
  const conditions: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (params.code) {
    // Note: This won't work well with encrypted codes
    // In production, consider maintaining a hash index
    conditions.push(`ugc.code ILIKE $${paramIndex++}`)
    values.push(`%${params.code}%`)
  }

  if (params.orderId) {
    conditions.push(`ugc.order_id = $${paramIndex++}`)
    values.push(params.orderId)
  }

  if (params.userId) {
    conditions.push(`ugc.user_id = $${paramIndex++}`)
    values.push(params.userId)
  }

  if (params.email) {
    conditions.push(`u.email ILIKE $${paramIndex++}`)
    values.push(`%${params.email}%`)
  }

  if (params.brand) {
    conditions.push(`ugc.brand ILIKE $${paramIndex++}`)
    values.push(`%${params.brand}%`)
  }

  if (params.status) {
    conditions.push(`ugc.status = $${paramIndex++}`)
    values.push(params.status)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = params.limit || 50
  const offset = params.offset || 0

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM user_gift_cards ugc
     LEFT JOIN users u ON ugc.user_id = u.id
     ${whereClause}`,
    values
  )

  // Get results
  const result = await query(
    `SELECT ugc.*, u.email as user_email
     FROM user_gift_cards ugc
     LEFT JOIN users u ON ugc.user_id = u.id
     ${whereClause}
     ORDER BY ugc.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...values, limit, offset]
  )

  return {
    results: result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      giftCardId: row.gift_card_id,
      giftCardCodeId: row.gift_card_code_id,
      orderId: row.order_id,
      brand: row.brand,
      category: row.category,
      imageUrl: row.image_url,
      denomination: parseFloat(row.denomination),
      code: '****' + decryptCode(row.code).slice(-4), // Masked for search results
      pin: row.pin ? '****' : undefined,
      status: row.status,
      source: row.source,
      deliveredAt: row.delivered_at,
      redeemedAt: row.redeemed_at,
      expiresAt: row.expires_at,
      providerOrderId: row.provider_order_id,
      providerData: row.provider_data,
      createdAt: row.created_at,
      userEmail: row.user_email
    })),
    total: parseInt(countResult.rows[0]?.total || '0')
  }
}

/**
 * Generate a support report for a user's gift card issues
 */
export async function generateSupportReport(
  userGiftCardId: string
): Promise<string> {
  const context = await getSupportContext(userGiftCardId)

  if (!context.userGiftCard) {
    return 'Gift card not found.'
  }

  const card = context.userGiftCard

  let report = `
Gift Card Support Report
========================
Generated: ${new Date().toISOString()}

Card Details:
- ID: ${card.id}
- Brand: ${card.brand}
- Denomination: $${card.denomination.toFixed(2)}
- Status: ${card.status}
- Source: ${card.source}

Purchase Information:
- Order ID: ${context.purchaseOrder?.orderId || 'N/A'}
- Order Date: ${context.purchaseOrder?.orderDate || 'N/A'}
- Payment Method: ${context.purchaseOrder?.paymentMethod || 'N/A'}
- Payment Status: ${context.purchaseOrder?.paymentStatus || 'N/A'}

Delivery Information:
- Delivered At: ${card.deliveredAt || 'N/A'}
- Redeemed At: ${card.redeemedAt || 'Not redeemed'}
- Expires At: ${card.expiresAt || 'No expiration'}

Provider Information:
- Source: ${card.source}
- Provider Order ID: ${card.providerOrderId || 'N/A'}

Recent Activity:
${context.auditLog.slice(0, 10).map(log =>
  `- ${log.createdAt.toISOString()}: ${log.action}`
).join('\n') || 'No activity recorded'}
`

  return report.trim()
}
