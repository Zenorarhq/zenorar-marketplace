// Global Test Mode utility
// Single source of truth for checking if sandbox mode is enabled

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { query } from '@/lib/db'

// Cache test mode status for 30 seconds to avoid hitting DB on every request
let cachedTestMode: boolean | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30 * 1000

/**
 * Check if global test mode is enabled (cached)
 */
export async function isTestModeEnabled(): Promise<boolean> {
  const now = Date.now()
  if (cachedTestMode !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedTestMode
  }

  const settings = await getSiteSettingsByGroup('api')
  cachedTestMode = settings.globalTestMode === true || settings.globalTestMode === 'true'
  cacheTimestamp = now
  return cachedTestMode
}

/**
 * Clear the cache (call after toggling test mode)
 */
export function clearTestModeCache() {
  cachedTestMode = null
  cacheTimestamp = 0
}

/**
 * Check if request is allowed for test operations
 * Returns true if test mode is enabled OR user is admin
 */
export async function canUseTestMode(userRole?: string): Promise<boolean> {
  const isAdmin = userRole?.toUpperCase() === 'ADMIN'
  if (isAdmin) return true
  return isTestModeEnabled()
}

/**
 * Clean up ALL test data for a specific user
 * Refunds wallet for test purchases, then deletes test records
 */
export async function cleanupTestDataForUser(userId: string): Promise<{ deleted: number }> {
  let deleted = 0

  await query('BEGIN')
  try {
    // Find test orders to refund
    const testOrders = await query(
      `SELECT o.id, o.total FROM orders o
       JOIN order_items oi ON oi."orderId" = o.id
       WHERE o."userId" = $1 AND oi.metadata->>'test_mode' = 'true'
       AND o."paymentStatus" = 'PAID'`,
      [userId]
    )

    // Refund wallet for each test order
    for (const order of testOrders.rows) {
      const total = parseFloat(order.total)
      if (total > 0) {
        await query(
          `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [total, userId]
        )
        // Record refund transaction for audit trail
        const wb = await query(`SELECT id, balance FROM wallet_balances WHERE user_id = $1`, [userId])
        const newBal = parseFloat(wb.rows[0]?.balance || 0)
        await query(
          `INSERT INTO wallet_transactions (id, wallet_balance_id, type, amount, balance_before, balance_after, description, metadata, created_at)
           VALUES (gen_random_uuid()::text, $1, 'CREDIT', $2, $3, $4, 'Sandbox mode cleanup refund', $5, NOW())`,
          [wb.rows[0]?.id, total, newBal - total, newBal, JSON.stringify({ reference_type: 'test_mode_cleanup', order_id: order.id })]
        )
      }
    }

    // Delete test virtual numbers + their messages
    const vnResult = await query(
      `DELETE FROM user_virtual_numbers WHERE user_id = $1 AND provider = 'test' RETURNING id`,
      [userId]
    )
    deleted += vnResult.rowCount || 0

    // Delete test eSIMs (tagged by source_type = 'test')
    const esimResult = await query(
      `DELETE FROM user_esims WHERE user_id = $1 AND source_type = 'test' RETURNING id`,
      [userId]
    )
    deleted += esimResult.rowCount || 0

    // Delete test gift cards (tagged by source = 'test')
    const gcResult = await query(
      `DELETE FROM user_gift_cards WHERE user_id = $1 AND source = 'test' RETURNING id`,
      [userId]
    )
    deleted += gcResult.rowCount || 0

    // Delete test cards + their transactions
    const cardIds = await query(
      `SELECT id FROM user_cards WHERE user_id = $1 AND provider = 'test'`,
      [userId]
    )
    if (cardIds.rows.length > 0) {
      const ids = cardIds.rows.map((r: any) => r.id)
      await query(
        `DELETE FROM card_transactions WHERE card_id = ANY($1)`,
        [ids]
      )
      const cardResult = await query(
        `DELETE FROM user_cards WHERE user_id = $1 AND provider = 'test' RETURNING id`,
        [userId]
      )
      deleted += cardResult.rowCount || 0
    }

    // Delete test order_items and orders
    const orderIds = testOrders.rows.map((r: any) => r.id)
    if (orderIds.length > 0) {
      await query(`DELETE FROM order_items WHERE "orderId" = ANY($1)`, [orderIds])
      await query(`DELETE FROM orders WHERE id = ANY($1)`, [orderIds])
      deleted += orderIds.length
    }

    await query('COMMIT')
    return { deleted }
  } catch (error) {
    await query('ROLLBACK')
    throw error
  }
}

/**
 * Clean up ALL test data across all users (called when admin toggles off)
 */
export async function cleanupAllTestData(): Promise<{ deleted: number }> {
  let deleted = 0

  await query('BEGIN')
  try {
    // Refund all test orders
    const testOrders = await query(
      `SELECT o.id, o."userId", o.total FROM orders o
       JOIN order_items oi ON oi."orderId" = o.id
       WHERE oi.metadata->>'test_mode' = 'true'
       AND o."paymentStatus" = 'PAID'`
    )

    for (const order of testOrders.rows) {
      const total = parseFloat(order.total)
      if (total > 0) {
        await query(
          `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [total, order.userId]
        )
        const wb2 = await query(`SELECT id, balance FROM wallet_balances WHERE user_id = $1`, [order.userId])
        const newBal2 = parseFloat(wb2.rows[0]?.balance || 0)
        await query(
          `INSERT INTO wallet_transactions (id, wallet_balance_id, type, amount, balance_before, balance_after, description, metadata, created_at)
           VALUES (gen_random_uuid()::text, $1, 'CREDIT', $2, $3, $4, 'Sandbox mode cleanup refund', $5, NOW())`,
          [wb2.rows[0]?.id, total, newBal2 - total, newBal2, JSON.stringify({ reference_type: 'test_mode_cleanup', order_id: order.id })]
        )
      }
    }

    // Delete all test records
    const vn = await query(`DELETE FROM user_virtual_numbers WHERE provider = 'test'`)
    deleted += vn.rowCount || 0

    const esim = await query(`DELETE FROM user_esims WHERE source_type = 'test'`)
    deleted += esim.rowCount || 0

    const gc = await query(`DELETE FROM user_gift_cards WHERE source = 'test'`)
    deleted += gc.rowCount || 0

    // Delete test card transactions first, then cards
    await query(
      `DELETE FROM card_transactions WHERE card_id IN (SELECT id FROM user_cards WHERE provider = 'test')`
    )
    const cards = await query(`DELETE FROM user_cards WHERE provider = 'test'`)
    deleted += cards.rowCount || 0

    // Delete test orders
    const orderIds = testOrders.rows.map((r: any) => r.id)
    if (orderIds.length > 0) {
      await query(`DELETE FROM order_items WHERE "orderId" = ANY($1)`, [orderIds])
      await query(`DELETE FROM orders WHERE id = ANY($1)`, [orderIds])
      deleted += orderIds.length
    }

    await query('COMMIT')
    return { deleted }
  } catch (error) {
    await query('ROLLBACK')
    throw error
  }
}
