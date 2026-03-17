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
 * Refunds wallet silently and deletes every trace of the sandbox session
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

    // Refund wallet silently (no audit trail — clean slate)
    for (const order of testOrders.rows) {
      const total = parseFloat(order.total)
      if (total > 0) {
        await query(
          `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [total, userId]
        )
      }
    }

    // Delete all test wallet transactions (DEBIT from purchases + any CREDIT refunds)
    await query(
      `DELETE FROM wallet_transactions
       WHERE wallet_balance_id = (SELECT id FROM wallet_balances WHERE user_id = $1)
       AND metadata->>'test_mode' = 'true'`,
      [userId]
    )
    // Also delete cleanup refund transactions from previous cleanups
    await query(
      `DELETE FROM wallet_transactions
       WHERE wallet_balance_id = (SELECT id FROM wallet_balances WHERE user_id = $1)
       AND metadata->>'reference_type' = 'test_mode_cleanup'`,
      [userId]
    )

    // Delete test virtual numbers (messages auto-cascade via FK)
    const vnResult = await query(
      `DELETE FROM user_virtual_numbers WHERE user_id = $1 AND provider = 'test' RETURNING id`,
      [userId]
    )
    deleted += vnResult.rowCount || 0

    // Delete test eSIMs
    const esimResult = await query(
      `DELETE FROM user_esims WHERE user_id = $1 AND source_type = 'test' RETURNING id`,
      [userId]
    )
    deleted += esimResult.rowCount || 0

    // Delete test gift cards
    const gcResult = await query(
      `DELETE FROM user_gift_cards WHERE user_id = $1 AND source = 'test' RETURNING id`,
      [userId]
    )
    deleted += gcResult.rowCount || 0

    // Delete test cards (transactions first, then cards)
    const cardIds = await query(
      `SELECT id FROM user_cards WHERE user_id = $1 AND provider = 'test'`,
      [userId]
    )
    if (cardIds.rows.length > 0) {
      const ids = cardIds.rows.map((r: any) => r.id)
      await query(`DELETE FROM card_transactions WHERE card_id = ANY($1)`, [ids])
      const cardResult = await query(
        `DELETE FROM user_cards WHERE user_id = $1 AND provider = 'test' RETURNING id`,
        [userId]
      )
      deleted += cardResult.rowCount || 0
    }

    // Delete test orders and order items
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
 * Leaves zero trace — as if sandbox mode was never used
 */
export async function cleanupAllTestData(): Promise<{ deleted: number }> {
  let deleted = 0

  await query('BEGIN')
  try {
    // Find all test orders to refund
    const testOrders = await query(
      `SELECT o.id, o."userId", o.total FROM orders o
       JOIN order_items oi ON oi."orderId" = o.id
       WHERE oi.metadata->>'test_mode' = 'true'
       AND o."paymentStatus" = 'PAID'`
    )

    // Refund wallet silently for each user
    for (const order of testOrders.rows) {
      const total = parseFloat(order.total)
      if (total > 0) {
        await query(
          `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [total, order.userId]
        )
      }
    }

    // Delete all test wallet transactions across all users
    await query(
      `DELETE FROM wallet_transactions WHERE metadata->>'test_mode' = 'true'`
    )
    await query(
      `DELETE FROM wallet_transactions WHERE metadata->>'reference_type' = 'test_mode_cleanup'`
    )

    // Delete all test product records
    const vn = await query(`DELETE FROM user_virtual_numbers WHERE provider = 'test'`)
    deleted += vn.rowCount || 0

    const esim = await query(`DELETE FROM user_esims WHERE source_type = 'test'`)
    deleted += esim.rowCount || 0

    const gc = await query(`DELETE FROM user_gift_cards WHERE source = 'test'`)
    deleted += gc.rowCount || 0

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
