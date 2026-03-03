// Gift Card Inventory Management
// Handles bulk inventory: reserve, release, and sell codes

import { query } from '@/lib/db'
import { encryptCode, decryptCode } from './encryption'
import type { GiftCardCode, InventoryStats, ImportResult, GiftCardCSVRow } from './types'

const RESERVATION_DURATION_MINUTES = 15

/**
 * Reserve a gift card code for a user (e.g., when added to cart)
 * Uses FOR UPDATE SKIP LOCKED to prevent race conditions
 */
export async function reserveCode(
  giftCardId: string,
  denomination: number,
  userId: string
): Promise<{ success: boolean; codeId?: string; error?: string }> {
  try {
    // Release any expired reservations first
    await releaseExpiredReservations()

    // Try to reserve an available code
    const result = await query(
      `UPDATE gift_card_codes
       SET status = 'reserved',
           reserved_at = NOW(),
           reserved_by = $3,
           reservation_expires_at = NOW() + INTERVAL '${RESERVATION_DURATION_MINUTES} minutes'
       WHERE id = (
         SELECT id FROM gift_card_codes
         WHERE gift_card_id = $1
           AND denomination = $2
           AND status = 'available'
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id`,
      [giftCardId, denomination, userId]
    )

    if (result.rows.length === 0) {
      return { success: false, error: 'No available codes for this denomination' }
    }

    return { success: true, codeId: result.rows[0].id }
  } catch (error: any) {
    console.error('Error reserving gift card code:', error)
    return { success: false, error: error.message || 'Failed to reserve code' }
  }
}

/**
 * Release a reserved code (e.g., when removed from cart)
 */
export async function releaseCode(
  codeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE gift_card_codes
       SET status = 'available',
           reserved_at = NULL,
           reserved_by = NULL,
           reservation_expires_at = NULL
       WHERE id = $1
         AND reserved_by = $2
         AND status = 'reserved'
       RETURNING id`,
      [codeId, userId]
    )

    if (result.rows.length === 0) {
      return { success: false, error: 'Code not found or not reserved by this user' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error releasing gift card code:', error)
    return { success: false, error: error.message || 'Failed to release code' }
  }
}

/**
 * Sell a code (mark as sold and return the code details)
 * Can accept either a reserved code ID or find an available code
 */
export async function sellCode(
  giftCardId: string,
  denomination: number,
  userId: string,
  orderId: string,
  reservedCodeId?: string
): Promise<{ success: boolean; code?: GiftCardCode; error?: string }> {
  try {
    let result

    if (reservedCodeId) {
      // Use the reserved code
      result = await query(
        `UPDATE gift_card_codes
         SET status = 'sold',
             sold_at = NOW(),
             sold_to = $2,
             order_id = $3,
             reserved_at = NULL,
             reserved_by = NULL,
             reservation_expires_at = NULL
         WHERE id = $1
           AND (status = 'reserved' OR status = 'available')
         RETURNING *`,
        [reservedCodeId, userId, orderId]
      )
    } else {
      // Find and sell an available code
      result = await query(
        `UPDATE gift_card_codes
         SET status = 'sold',
             sold_at = NOW(),
             sold_to = $3,
             order_id = $4
         WHERE id = (
           SELECT id FROM gift_card_codes
           WHERE gift_card_id = $1
             AND denomination = $2
             AND status = 'available'
             AND (expires_at IS NULL OR expires_at > NOW())
           ORDER BY created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING *`,
        [giftCardId, denomination, userId, orderId]
      )
    }

    if (result.rows.length === 0) {
      return { success: false, error: 'No available code found' }
    }

    const row = result.rows[0]
    const code: GiftCardCode = {
      id: row.id,
      giftCardId: row.gift_card_id,
      denomination: parseFloat(row.denomination),
      code: decryptCode(row.code), // Decrypt code for use
      pin: row.pin ? decryptCode(row.pin) : undefined, // Decrypt pin if present
      status: row.status,
      costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
      batchId: row.batch_id,
      expiresAt: row.expires_at,
      soldAt: row.sold_at,
      soldTo: row.sold_to,
      orderId: row.order_id,
      createdAt: row.created_at
    }

    return { success: true, code }
  } catch (error: any) {
    console.error('Error selling gift card code:', error)
    return { success: false, error: error.message || 'Failed to sell code' }
  }
}

/**
 * Check available stock for a gift card at a specific denomination
 */
export async function checkStock(
  giftCardId: string,
  denomination: number
): Promise<number> {
  try {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM gift_card_codes
       WHERE gift_card_id = $1
         AND denomination = $2
         AND status = 'available'
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [giftCardId, denomination]
    )

    return parseInt(result.rows[0]?.count || '0')
  } catch (error) {
    console.error('Error checking gift card stock:', error)
    return 0
  }
}

/**
 * Get inventory statistics for all denominations of a gift card
 */
export async function getInventoryStats(giftCardId?: string): Promise<InventoryStats[]> {
  try {
    const whereClause = giftCardId ? 'WHERE gc.id = $1' : ''
    const params = giftCardId ? [giftCardId] : []

    const result = await query(
      `SELECT
         gc.id as gift_card_id,
         gc.brand,
         gcc.denomination,
         COUNT(*) FILTER (WHERE gcc.status = 'available' AND (gcc.expires_at IS NULL OR gcc.expires_at > NOW())) as available,
         COUNT(*) FILTER (WHERE gcc.status = 'reserved') as reserved,
         COUNT(*) FILTER (WHERE gcc.status = 'sold') as sold,
         COUNT(*) FILTER (WHERE gcc.status = 'expired' OR (gcc.expires_at IS NOT NULL AND gcc.expires_at <= NOW())) as expired
       FROM gift_cards gc
       LEFT JOIN gift_card_codes gcc ON gc.id = gcc.gift_card_id
       ${whereClause}
       GROUP BY gc.id, gc.brand, gcc.denomination
       ORDER BY gc.brand, gcc.denomination`,
      params
    )

    return result.rows.map(row => ({
      giftCardId: row.gift_card_id,
      brand: row.brand,
      denomination: parseFloat(row.denomination || '0'),
      available: parseInt(row.available || '0'),
      reserved: parseInt(row.reserved || '0'),
      sold: parseInt(row.sold || '0'),
      expired: parseInt(row.expired || '0')
    }))
  } catch (error) {
    console.error('Error getting inventory stats:', error)
    return []
  }
}

/**
 * Release all expired reservations
 */
export async function releaseExpiredReservations(): Promise<number> {
  try {
    const result = await query(
      `UPDATE gift_card_codes
       SET status = 'available',
           reserved_at = NULL,
           reserved_by = NULL,
           reservation_expires_at = NULL
       WHERE status = 'reserved'
         AND reservation_expires_at < NOW()
       RETURNING id`
    )

    return result.rows.length
  } catch (error) {
    console.error('Error releasing expired reservations:', error)
    return 0
  }
}

/**
 * Import codes from CSV data
 */
export async function importCodes(
  giftCardId: string,
  rows: GiftCardCSVRow[],
  importedBy: string,
  filename?: string
): Promise<ImportResult> {
  const batchId = `IMPORT_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const errors: Array<{ row: number; error: string }> = []
  let successCount = 0

  try {
    // Create import batch record
    await query(
      `INSERT INTO gift_card_import_batches
         (batch_id, gift_card_id, filename, total_codes, imported_by, status)
       VALUES ($1, $2, $3, $4, $5, 'processing')`,
      [batchId, giftCardId, filename, rows.length, importedBy]
    )

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      try {
        // Validate required fields
        if (!row.code || !row.denomination) {
          errors.push({ row: rowNum, error: 'Missing required fields (code, denomination)' })
          continue
        }

        const denomination = parseFloat(row.denomination)
        if (isNaN(denomination) || denomination <= 0) {
          errors.push({ row: rowNum, error: 'Invalid denomination value' })
          continue
        }

        // Check for duplicate code
        const existing = await query(
          `SELECT id FROM gift_card_codes WHERE code = $1 AND gift_card_id = $2`,
          [row.code, giftCardId]
        )

        if (existing.rows.length > 0) {
          errors.push({ row: rowNum, error: 'Duplicate code' })
          continue
        }

        // Encrypt and insert the code
        const encryptedCode = encryptCode(row.code)
        const encryptedPin = row.pin ? encryptCode(row.pin) : null

        await query(
          `INSERT INTO gift_card_codes
             (gift_card_id, denomination, code, pin, cost_price, batch_id, expires_at, status, code_encrypted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'available', true)`,
          [
            giftCardId,
            denomination,
            encryptedCode,
            encryptedPin,
            row.cost_price ? parseFloat(row.cost_price) : null,
            batchId,
            row.expires_at || null
          ]
        )

        successCount++
      } catch (rowError: any) {
        errors.push({ row: rowNum, error: rowError.message || 'Insert failed' })
      }
    }

    // Update import batch record
    await query(
      `UPDATE gift_card_import_batches
       SET status = 'completed',
           successful_codes = $1,
           failed_codes = $2,
           error_log = $3,
           completed_at = NOW()
       WHERE batch_id = $4`,
      [successCount, errors.length, JSON.stringify(errors), batchId]
    )

    return {
      success: true,
      batchId,
      totalRows: rows.length,
      successCount,
      failureCount: errors.length,
      errors
    }
  } catch (error: any) {
    console.error('Error importing gift card codes:', error)

    // Update batch as failed
    await query(
      `UPDATE gift_card_import_batches
       SET status = 'failed',
           error_log = $1,
           completed_at = NOW()
       WHERE batch_id = $2`,
      [JSON.stringify([{ row: 0, error: error.message }]), batchId]
    ).catch(() => {})

    return {
      success: false,
      batchId,
      totalRows: rows.length,
      successCount,
      failureCount: rows.length - successCount,
      errors: [{ row: 0, error: error.message || 'Import failed' }]
    }
  }
}

/**
 * Mark expired codes
 */
export async function markExpiredCodes(): Promise<number> {
  try {
    const result = await query(
      `UPDATE gift_card_codes
       SET status = 'expired'
       WHERE status = 'available'
         AND expires_at IS NOT NULL
         AND expires_at <= NOW()
       RETURNING id`
    )

    return result.rows.length
  } catch (error) {
    console.error('Error marking expired codes:', error)
    return 0
  }
}

/**
 * Refund a sold code back to inventory
 */
export async function refundCode(
  codeId: string,
  refundedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      `UPDATE gift_card_codes
       SET status = 'available',
           sold_at = NULL,
           sold_to = NULL,
           order_id = NULL,
           refunded_at = NOW(),
           refunded_by = $2,
           refund_reason = $3
       WHERE id = $1
         AND status = 'sold'
       RETURNING id`,
      [codeId, refundedBy, reason || null]
    )

    if (result.rows.length === 0) {
      return { success: false, error: 'Code not found or not sold' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error refunding gift card code:', error)
    return { success: false, error: error.message || 'Failed to refund code' }
  }
}

/**
 * Get low stock alerts (denominations with available < threshold)
 */
export async function getLowStockAlerts(threshold: number = 5): Promise<Array<{
  giftCardId: string
  brand: string
  denomination: number
  available: number
}>> {
  try {
    const result = await query(
      `SELECT
         gc.id as gift_card_id,
         gc.brand,
         gcc.denomination,
         COUNT(*) FILTER (WHERE gcc.status = 'available' AND (gcc.expires_at IS NULL OR gcc.expires_at > NOW())) as available
       FROM gift_cards gc
       LEFT JOIN gift_card_codes gcc ON gc.id = gcc.gift_card_id
       WHERE gc.is_active = true
       GROUP BY gc.id, gc.brand, gcc.denomination
       HAVING COUNT(*) FILTER (WHERE gcc.status = 'available' AND (gcc.expires_at IS NULL OR gcc.expires_at > NOW())) < $1
         AND COUNT(*) FILTER (WHERE gcc.status = 'available' AND (gcc.expires_at IS NULL OR gcc.expires_at > NOW())) > 0
       ORDER BY COUNT(*) FILTER (WHERE gcc.status = 'available' AND (gcc.expires_at IS NULL OR gcc.expires_at > NOW())) ASC`,
      [threshold]
    )

    return result.rows.map(row => ({
      giftCardId: row.gift_card_id,
      brand: row.brand,
      denomination: parseFloat(row.denomination || '0'),
      available: parseInt(row.available || '0')
    }))
  } catch (error) {
    console.error('Error getting low stock alerts:', error)
    return []
  }
}

/**
 * Get codes by batch
 */
export async function getCodesByBatch(
  batchId: string,
  limit: number = 100,
  offset: number = 0
): Promise<GiftCardCode[]> {
  try {
    const result = await query(
      `SELECT * FROM gift_card_codes
       WHERE batch_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [batchId, limit, offset]
    )

    return result.rows.map(row => ({
      id: row.id,
      giftCardId: row.gift_card_id,
      denomination: parseFloat(row.denomination),
      code: decryptCode(row.code), // Decrypt for display
      pin: row.pin ? decryptCode(row.pin) : undefined, // Decrypt pin if present
      status: row.status,
      costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
      batchId: row.batch_id,
      expiresAt: row.expires_at,
      reservedAt: row.reserved_at,
      reservedBy: row.reserved_by,
      reservationExpiresAt: row.reservation_expires_at,
      soldAt: row.sold_at,
      soldTo: row.sold_to,
      orderId: row.order_id,
      createdAt: row.created_at
    }))
  } catch (error) {
    console.error('Error getting codes by batch:', error)
    return []
  }
}
