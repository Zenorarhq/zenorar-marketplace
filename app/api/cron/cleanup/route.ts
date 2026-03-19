import { NextRequest, NextResponse } from 'next/server'
import { esimInventoryService } from '@/lib/esim/inventory'
import { esimProvisioningService } from '@/lib/esim'
import { releaseExpiredReservations as releaseGiftCardReservations, markExpiredCodes } from '@/lib/gift-cards/inventory'
import { virtualNumberService } from '@/lib/virtual-numbers/service'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { checkAndSendLowStockAlerts } from '@/lib/gift-cards/alerts'
import { anonymizeOldAuditLogs, purgeDeletedGiftCards } from '@/lib/gift-cards/gdpr'
import { query } from '@/lib/db'

// Get cron settings from database
async function getCronSettings(): Promise<{ cronEnabled: boolean; cronSecret: string }> {
  try {
    const settings = await getSiteSettingsByGroup('cron')
    return {
      cronEnabled: settings.cronEnabled !== false, // Default to true if not set
      cronSecret: settings.cronSecret || ''
    }
  } catch (error) {
    console.error('Error loading cron settings:', error)
    // Fall back to environment variable for backwards compatibility
    return {
      cronEnabled: true,
      cronSecret: process.env.CRON_SECRET || ''
    }
  }
}

/**
 * GET /api/cron/cleanup
 * Run all cleanup tasks
 *
 * Should be called periodically (every 15-30 minutes) by:
 * - Vercel Cron
 * - External cron service (e.g., cron-job.org)
 * - Or manually for testing
 *
 * Add header: Authorization: Bearer YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Load cron settings from database
    const cronSettings = await getCronSettings()

    // Check if cron jobs are enabled
    if (!cronSettings.cronEnabled) {
      return NextResponse.json(
        { success: false, error: 'Cron jobs are disabled' },
        { status: 403 }
      )
    }

    // Verify cron secret if configured
    if (cronSettings.cronSecret) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token !== cronSettings.cronSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const results: Record<string, any> = {}

    // 1. Release stale eSIM inventory reservations
    try {
      const esimReservationsReleased = await esimInventoryService.releaseStaleReservations()
      results.esimReservations = {
        success: true,
        released: esimReservationsReleased
      }
    } catch (error: any) {
      results.esimReservations = {
        success: false,
        error: error.message
      }
    }

    // 2. Retry failed eSIM provisions
    try {
      const retryResults = await esimProvisioningService.retryFailedProvisions()
      results.esimRetries = {
        success: true,
        ...retryResults
      }
    } catch (error: any) {
      results.esimRetries = {
        success: false,
        error: error.message
      }
    }

    // 3. Release expired gift card reservations
    try {
      const giftCardReservationsReleased = await releaseGiftCardReservations()
      results.giftCardReservations = {
        success: true,
        released: giftCardReservationsReleased
      }
    } catch (error: any) {
      results.giftCardReservations = {
        success: false,
        error: error.message
      }
    }

    // 4. Mark expired gift card codes
    try {
      const expiredCodes = await markExpiredCodes()
      results.giftCardExpired = {
        success: true,
        marked: expiredCodes
      }
    } catch (error: any) {
      results.giftCardExpired = {
        success: false,
        error: error.message
      }
    }

    // 5. Expire virtual numbers
    try {
      const expiredNumbers = await virtualNumberService.expireNumbers()
      results.virtualNumbers = {
        success: true,
        ...expiredNumbers
      }
    } catch (error: any) {
      results.virtualNumbers = {
        success: false,
        error: error.message
      }
    }

    // 6. Gift card low stock alerts
    try {
      const alertResult = await checkAndSendLowStockAlerts()
      results.giftCardAlerts = {
        success: true,
        ...alertResult
      }
    } catch (error: any) {
      results.giftCardAlerts = {
        success: false,
        error: error.message
      }
    }

    // 7. Clean up old rate limit logs (runs daily)
    try {
      const rateLimitCleanup = await query(
        `DELETE FROM gift_card_rate_limit_log WHERE created_at < NOW() - INTERVAL '24 hours' RETURNING id`
      )
      results.rateLimitCleanup = {
        success: true,
        deleted: rateLimitCleanup.rows.length
      }
    } catch (error: any) {
      results.rateLimitCleanup = {
        success: false,
        error: error.message
      }
    }

    // 8. Anonymize old audit logs (GDPR - 90 day retention)
    try {
      const anonymized = await anonymizeOldAuditLogs(90)
      results.auditLogAnonymization = {
        success: true,
        anonymized
      }
    } catch (error: any) {
      results.auditLogAnonymization = {
        success: false,
        error: error.message
      }
    }

    // 9. Purge soft-deleted gift cards (30 day retention)
    try {
      const purged = await purgeDeletedGiftCards(30)
      results.giftCardPurge = {
        success: true,
        purged
      }
    } catch (error: any) {
      results.giftCardPurge = {
        success: false,
        error: error.message
      }
    }

    // 10. Auto-cancel expired carrier eSIM orders (24h deadline)
    try {
      const expiredOrders = await query(
        `SELECT ceo.id, ceo.user_id, ceo.order_id,
                o.total as order_total, o."orderNumber",
                cep.carrier_name, cep.plan_name
         FROM carrier_esim_orders ceo
         JOIN orders o ON ceo.order_id = o.id
         JOIN carrier_esim_plans cep ON ceo.carrier_plan_id = cep.id
         WHERE ceo.status = 'pending_fulfillment'
           AND ceo.fulfillment_deadline < NOW()`
      )

      let cancelledCount = 0
      for (const order of expiredOrders.rows) {
        try {
          const refundAmount = parseFloat(order.order_total)

          // Cancel the carrier order
          await query(
            `UPDATE carrier_esim_orders
             SET status = 'cancelled',
                 cancellation_reason = 'Auto-cancelled: 24h fulfillment deadline expired',
                 cancelled_at = NOW(), refunded_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND status = 'pending_fulfillment'`,
            [order.id]
          )

          // Refund wallet with row lock to prevent double-refunds
          await query(
            `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW()
             WHERE user_id = $2`,
            [refundAmount, order.user_id]
          )

          // Record refund transaction
          await query(
            `INSERT INTO wallet_transactions
              (id, user_id, type, amount, balance_after, description, reference_type, reference_id, created_at)
             VALUES (gen_random_uuid()::text, $1, 'CREDIT', $2,
                     (SELECT balance FROM wallet_balances WHERE user_id = $1),
                     $3, 'order', $4, NOW())`,
            [
              order.user_id,
              refundAmount,
              `Auto-refund: carrier eSIM order expired (${order.carrier_name} ${order.plan_name})`,
              order.order_id,
            ]
          )

          // Update order status
          await query(
            `UPDATE orders SET status = 'CANCELLED', "paymentStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1`,
            [order.order_id]
          )

          // Send notification
          query(
            `INSERT INTO notifications (id, "userId", type, title, message, metadata)
             VALUES (gen_random_uuid()::text, $1, 'ORDER_CANCELLED'::"NotificationType",
                     'Carrier eSIM Order Expired',
                     $2,
                     $3::jsonb)`,
            [
              order.user_id,
              `Your ${order.carrier_name} eSIM order #${order.orderNumber} could not be fulfilled within 24 hours and has been automatically cancelled. $${refundAmount.toFixed(2)} has been refunded to your wallet.`,
              JSON.stringify({ orderId: order.order_id, carrierOrderId: order.id, refundAmount }),
            ]
          ).catch(err => console.error('Failed to send auto-cancel notification:', err))

          cancelledCount++
        } catch (orderErr: any) {
          console.error(`Failed to auto-cancel carrier order ${order.id}:`, orderErr)
        }
      }

      results.carrierEsimAutoCancel = {
        success: true,
        expired: expiredOrders.rows.length,
        cancelled: cancelledCount,
      }
    } catch (error: any) {
      results.carrierEsimAutoCancel = {
        success: false,
        error: error.message,
      }
    }

    // Check if any task failed
    const allSucceeded = Object.values(results).every((r: any) => r.success)

    return NextResponse.json({
      success: allSucceeded,
      timestamp: new Date().toISOString(),
      results
    })
  } catch (error: any) {
    console.error('Cron cleanup error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Cleanup failed' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/cleanup
 * Run specific cleanup task
 *
 * Body: { task: 'esim-reservations' | 'esim-retries' | 'gift-card-reservations' | 'virtual-numbers' }
 */
export async function POST(request: NextRequest) {
  try {
    // Load cron settings from database
    const cronSettings = await getCronSettings()

    // Check if cron jobs are enabled
    if (!cronSettings.cronEnabled) {
      return NextResponse.json(
        { success: false, error: 'Cron jobs are disabled' },
        { status: 403 }
      )
    }

    // Verify cron secret if configured
    if (cronSettings.cronSecret) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token !== cronSettings.cronSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const { task } = await request.json()

    let result: any

    switch (task) {
      case 'esim-reservations':
        const released = await esimInventoryService.releaseStaleReservations()
        result = { task, released }
        break

      case 'esim-retries':
        result = { task, ...await esimProvisioningService.retryFailedProvisions() }
        break

      case 'gift-card-reservations':
        const gcReleased = await releaseGiftCardReservations()
        result = { task, released: gcReleased }
        break

      case 'gift-card-expired':
        const marked = await markExpiredCodes()
        result = { task, marked }
        break

      case 'virtual-numbers':
        result = { task, ...await virtualNumberService.expireNumbers() }
        break

      case 'carrier-esim-autocancel':
        const expired = await query(
          `SELECT id FROM carrier_esim_orders
           WHERE status = 'pending_fulfillment' AND fulfillment_deadline < NOW()`
        )
        result = { task, expiredFound: expired.rows.length }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown task. Valid tasks: esim-reservations, esim-retries, gift-card-reservations, gift-card-expired, virtual-numbers, carrier-esim-autocancel' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    })
  } catch (error: any) {
    console.error('Cron task error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Task failed' },
      { status: 500 }
    )
  }
}
