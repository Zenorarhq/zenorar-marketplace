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
      `SELECT id, balance, is_frozen FROM wallet_balances WHERE user_id = $1`,
      [userId]
    )

    if (walletResult.rows.length === 0) {
      // Create wallet if doesn't exist
      await query(
        `INSERT INTO wallet_balances (id, user_id, balance, currency, is_frozen, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, 0, 'USD', false, NOW(), NOW())`,
        [userId]
      )
      return NextResponse.json(
        { success: false, error: 'Insufficient wallet balance' },
        { status: 400 }
      )
    }

    const walletBalanceId = walletResult.rows[0].id
    const isFrozen = walletResult.rows[0].is_frozen

    // Check if wallet is frozen
    if (isFrozen) {
      return NextResponse.json(
        { success: false, error: 'Your wallet is currently frozen. Please contact support.' },
        { status: 403 }
      )
    }

    const walletBalance = parseFloat(walletResult.rows[0].balance)
    if (walletBalance < total) {
      return NextResponse.json(
        { success: false, error: `Insufficient wallet balance. Available: $${walletBalance.toFixed(2)}, Required: $${total.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Get user's email for the order
    const userResult = await query(
      `SELECT email FROM users WHERE id = $1`,
      [userId]
    )
    const userEmail = userResult.rows[0]?.email || 'unknown@zenorar.com'

    // Generate order number
    const orderNumber = `ZN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    // Create order with all required columns
    const orderResult = await query(
      `INSERT INTO orders (
         id, "orderNumber", "userId", status, subtotal, total, email,
         "paymentMethod", "paymentStatus", "paidAt", "createdAt", "updatedAt"
       ) VALUES (
         gen_random_uuid()::text, $1, $2, 'PROCESSING', $3, $4, $5,
         'WALLET', 'PAID', NOW(), NOW(), NOW()
       ) RETURNING id, "orderNumber"`,
      [orderNumber, userId, total, total, userEmail]
    )

    const orderId = orderResult.rows[0].id
    const finalOrderNumber = orderResult.rows[0].orderNumber

    // Create order items with all required columns
    // productId is null for dynamic products (requires migration to allow null)
    for (const item of items) {
      const itemQuantity = item.quantity || 1
      const itemPrice = item.price
      const itemTotal = itemPrice * itemQuantity

      await query(
        `INSERT INTO order_items (
           id, "orderId", "productId", name, quantity, price, total, license, metadata, product_type
         ) VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9
         )`,
        [
          orderId,
          item.productId || null,
          item.metadata?.friendlyName || 'Virtual Number',
          itemQuantity,
          itemPrice,
          itemTotal,
          null,
          JSON.stringify({
            ...item.metadata,
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
          }),
          'virtual_number'
        ]
      )
    }

    // Deduct from wallet
    const balanceBefore = walletBalance
    const balanceAfter = walletBalance - total

    await query(
      `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE user_id = $2`,
      [balanceAfter, userId]
    )

    // Record wallet transaction
    await query(
      `INSERT INTO wallet_transactions (
         id, wallet_balance_id, type, amount, balance_before, balance_after,
         description, order_id, created_at
       ) VALUES (
         gen_random_uuid()::text, $1, 'DEBIT', $2, $3, $4, $5, $6, NOW()
       )`,
      [walletBalanceId, total, balanceBefore, balanceAfter, `Order #${finalOrderNumber}`, orderId]
    )

    // Run fulfillment
    const fulfillmentResult = await fulfillOrder(orderId)

    if (!fulfillmentResult.success) {
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
