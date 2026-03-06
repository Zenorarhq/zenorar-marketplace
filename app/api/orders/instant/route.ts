import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fulfillOrder } from '@/lib/order-fulfillment'
import { verifyAccessToken } from '@/lib/auth-utils'

/**
 * POST /api/orders/instant
 * Creates an order and pays with wallet balance instantly
 * Used for virtual numbers, eSIMs, and other digital products
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const userId = payload.userId
    const body = await req.json()
    const { items, paymentMethod, total } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided' },
        { status: 400 }
      )
    }

    if (paymentMethod !== 'wallet') {
      return NextResponse.json(
        { success: false, error: 'Only wallet payment is supported for instant checkout' },
        { status: 400 }
      )
    }

    // Calculate total from items
    const calculatedTotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price * (item.quantity || 1))
    }, 0)

    // Verify total matches
    if (Math.abs(calculatedTotal - total) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'Total amount mismatch' },
        { status: 400 }
      )
    }

    // Get user's wallet balance
    const walletResult = await query(
      `SELECT balance FROM wallets WHERE "userId" = $1`,
      [userId]
    )

    if (walletResult.rows.length === 0) {
      // Create wallet if doesn't exist
      await query(
        `INSERT INTO wallets ("userId", balance, currency, "createdAt", "updatedAt")
         VALUES ($1, 0, 'USD', NOW(), NOW())`,
        [userId]
      )
      return NextResponse.json(
        { success: false, error: 'Insufficient wallet balance' },
        { status: 400 }
      )
    }

    const walletBalance = parseFloat(walletResult.rows[0].balance)
    if (walletBalance < total) {
      return NextResponse.json(
        { success: false, error: `Insufficient wallet balance. Available: $${walletBalance.toFixed(2)}, Required: $${total.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Generate order number
    const orderNumber = `ZN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (
         id, "orderNumber", "userId", status, total, "paymentMethod",
         "paymentStatus", "createdAt", "updatedAt"
       ) VALUES (
         gen_random_uuid()::text, $1, $2, 'PROCESSING', $3, 'WALLET',
         'PAID', NOW(), NOW()
       ) RETURNING id, "orderNumber"`,
      [orderNumber, userId, total]
    )

    const orderId = orderResult.rows[0].id
    const finalOrderNumber = orderResult.rows[0].orderNumber

    // Create order items
    for (const item of items) {
      await query(
        `INSERT INTO order_items (
           id, "orderId", "productId", name, quantity, price, license, metadata
         ) VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7
         )`,
        [
          orderId,
          item.productId || `dynamic-${Date.now()}`,
          item.metadata?.friendlyName || `Virtual Number`,
          item.quantity || 1,
          item.price,
          null,
          JSON.stringify({
            ...item.metadata,
            // Convert camelCase to snake_case for fulfillment
            phone_number: item.metadata?.phoneNumber,
            country_id: item.metadata?.countryId,
            plan_id: item.metadata?.planCategory === 'basic' ? 'basic' : 'business',
            number_type: item.metadata?.numberType,
            duration_days: item.metadata?.durationDays,
            sms_limit: item.metadata?.smsLimit,
            minute_tier: item.metadata?.minuteTier,
            minute_included: item.metadata?.minuteIncluded,
            minute_tier_price: item.metadata?.minuteTierPrice,
            amount_paid: item.price,
          })
        ]
      )
    }

    // Deduct from wallet
    const balanceBefore = walletBalance
    const balanceAfter = walletBalance - total

    await query(
      `UPDATE wallets SET balance = $1, "updatedAt" = NOW() WHERE "userId" = $2`,
      [balanceAfter, userId]
    )

    // Record wallet transaction
    await query(
      `INSERT INTO wallet_transactions (
         id, "walletId", type, amount, "balanceBefore", "balanceAfter",
         description, "orderId", "createdAt"
       ) VALUES (
         gen_random_uuid()::text,
         (SELECT id FROM wallets WHERE "userId" = $1),
         'DEBIT', $2, $3, $4, $5, $6, NOW()
       )`,
      [userId, total, balanceBefore, balanceAfter, `Order #${finalOrderNumber}`, orderId]
    )

    // Run fulfillment
    const fulfillmentResult = await fulfillOrder(orderId)

    if (!fulfillmentResult.success) {
      // Log the issue but don't fail the order - it can be retried
      console.error('Fulfillment had issues:', fulfillmentResult)
    }

    // Send notification
    await query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata)
       VALUES (gen_random_uuid()::text, $1, 'ORDER_COMPLETED'::"NotificationType",
               'Order Complete',
               'Your order #' || $2 || ' has been processed.',
               $3::jsonb)`,
      [userId, finalOrderNumber, JSON.stringify({ orderId, orderNumber: finalOrderNumber })]
    ).catch(err => console.error('Failed to send notification:', err))

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        orderNumber: finalOrderNumber,
        total,
        newBalance: balanceAfter,
        fulfillment: fulfillmentResult
      }
    })

  } catch (error: any) {
    console.error('Instant checkout error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process order' },
      { status: 500 }
    )
  }
}
