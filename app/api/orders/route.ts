import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fulfillOrder } from '@/lib/order-fulfillment'
import { verifyAccessToken } from '@/lib/auth-utils'

/**
 * POST /api/orders
 * Creates an order from cart checkout
 * Supports wallet balance, Paystack, PayPal, and crypto payments
 */
export async function POST(req: NextRequest) {
  try {
    // Get auth token if present
    const authHeader = req.headers.get('authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const payload = verifyAccessToken(token)
      if (payload) {
        userId = payload.userId
      }
    }

    const body = await req.json()
    const {
      fullName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      customerNote,
      paymentMethod,
      discountCode,
      discountAmount,
      useWalletBalance,
      items,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided' },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Calculate total from items
    let subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.price * (item.quantity || 1))
    }, 0)

    // Apply discount if any
    let finalTotal = subtotal - (discountAmount || 0)
    if (finalTotal < 0) finalTotal = 0

    // Check wallet balance if using wallet
    let walletBalanceId: string | null = null
    let walletBalance = 0
    let walletDeduction = 0

    if (userId && useWalletBalance) {
      const walletResult = await query(
        `SELECT id, balance, is_frozen FROM wallet_balances WHERE user_id = $1`,
        [userId]
      )

      if (walletResult.rows.length > 0) {
        walletBalanceId = walletResult.rows[0].id
        walletBalance = parseFloat(walletResult.rows[0].balance)
        const isFrozen = walletResult.rows[0].is_frozen

        if (isFrozen) {
          return NextResponse.json(
            { success: false, error: 'Your wallet is currently frozen. Please contact support.' },
            { status: 403 }
          )
        }
      }
    }

    // Determine payment method and amounts
    let paymentMethodToStore = paymentMethod?.toUpperCase() || 'PENDING'
    let paymentStatus = 'PENDING'
    let amountToPayExternally = finalTotal

    // If using wallet balance
    if (userId && useWalletBalance && walletBalance > 0) {
      if (walletBalance >= finalTotal) {
        // Wallet covers entire order
        walletDeduction = finalTotal
        amountToPayExternally = 0
        paymentMethodToStore = 'WALLET'
        paymentStatus = 'PAID'
      } else {
        // Partial wallet payment
        walletDeduction = walletBalance
        amountToPayExternally = finalTotal - walletBalance
      }
    }

    // If payment method is wallet_credits and wallet doesn't cover it
    if (paymentMethod === 'wallet_credits' && amountToPayExternally > 0) {
      return NextResponse.json(
        { success: false, error: `Insufficient wallet balance. Available: $${walletBalance.toFixed(2)}, Required: $${finalTotal.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Generate order number
    const orderNumber = `ZN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (
         id, "orderNumber", "userId", status, subtotal, total, email,
         "paymentMethod", "paymentStatus", "customerNote",
         "shippingAddress", "shippingCity", "shippingState", "shippingZip",
         "createdAt", "updatedAt"
       ) VALUES (
         gen_random_uuid()::text, $1, $2, 'PROCESSING', $3, $4, $5,
         $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
       ) RETURNING id, "orderNumber"`,
      [
        orderNumber,
        userId,
        subtotal,
        finalTotal,
        email,
        paymentMethodToStore,
        paymentStatus,
        customerNote || null,
        address || 'Digital Delivery',
        city || 'N/A',
        state || 'N/A',
        zipCode || '00000',
      ]
    )

    const orderId = orderResult.rows[0].id
    const finalOrderNumber = orderResult.rows[0].orderNumber

    // Create order items
    for (const item of items) {
      const itemQuantity = item.quantity || 1
      const itemPrice = item.price
      const itemTotal = itemPrice * itemQuantity

      // Determine product type from metadata or item
      const productType = item.productType || item.metadata?.productType || 'default'

      await query(
        `INSERT INTO order_items (
           id, "orderId", "productId", name, quantity, price, total, license, metadata, product_type
         ) VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9
         )`,
        [
          orderId,
          item.productId,
          item.name || 'Product',
          itemQuantity,
          itemPrice,
          itemTotal,
          item.license || null,
          JSON.stringify(item.metadata || {}),
          productType,
        ]
      )
    }

    // Deduct from wallet if applicable
    if (walletDeduction > 0 && walletBalanceId) {
      const balanceBefore = walletBalance
      const balanceAfter = walletBalance - walletDeduction

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
        [walletBalanceId, walletDeduction, balanceBefore, balanceAfter, `Order #${finalOrderNumber}`, orderId]
      )
    }

    // If order is fully paid with wallet, run fulfillment
    let fulfillmentResult = null
    if (paymentStatus === 'PAID') {
      fulfillmentResult = await fulfillOrder(orderId)

      if (!fulfillmentResult.success) {
        console.error('Fulfillment failed:', fulfillmentResult)

        // Check if all items failed
        const allFailed = fulfillmentResult.details?.every((d: any) => d.status === 'failed')

        if (allFailed && walletDeduction > 0 && walletBalanceId) {
          // Refund the wallet
          await query(
            `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
            [walletDeduction, userId]
          )

          // Record refund transaction
          await query(
            `INSERT INTO wallet_transactions (
               id, wallet_balance_id, type, amount, balance_before, balance_after,
               description, order_id, created_at
             ) VALUES (
               gen_random_uuid()::text, $1, 'CREDIT', $2, $3, $4, $5, $6, NOW()
             )`,
            [walletBalanceId, walletDeduction, walletBalance - walletDeduction, walletBalance, `Refund for failed order #${finalOrderNumber}`, orderId]
          )

          // Update order status
          await query(
            `UPDATE orders SET status = 'CANCELLED', "paymentStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1`,
            [orderId]
          )

          const failedItem = fulfillmentResult.details?.find((d: any) => d.status === 'failed')
          const errorMessage = failedItem?.error || 'Failed to provision items'

          return NextResponse.json({
            success: false,
            error: errorMessage,
            data: {
              id: orderId,
              orderNumber: finalOrderNumber,
              refunded: true,
            }
          })
        }
      } else {
        // Update order to confirmed
        await query(
          `UPDATE orders SET status = 'CONFIRMED', "updatedAt" = NOW() WHERE id = $1`,
          [orderId]
        )
      }
    }

    // Apply discount code if used
    if (discountCode && discountAmount > 0) {
      await query(
        `UPDATE discounts SET current_uses = current_uses + 1, "updatedAt" = NOW()
         WHERE code = $1`,
        [discountCode]
      ).catch(err => console.error('Failed to update discount usage:', err))
    }

    return NextResponse.json({
      success: true,
      data: {
        id: orderId,
        orderNumber: finalOrderNumber,
        total: finalTotal,
        walletDeduction,
        amountToPayExternally,
        paymentStatus,
        fulfillment: fulfillmentResult,
      }
    })

  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/orders
 * Get orders for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
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
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const ordersResult = await query(
      `SELECT
         o.id, o."orderNumber", o.status, o.subtotal, o.total,
         o."paymentMethod", o."paymentStatus", o."createdAt",
         COUNT(*) OVER() as total_count
       FROM orders o
       WHERE o."userId" = $1
       ORDER BY o."createdAt" DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    const totalCount = ordersResult.rows[0]?.total_count || 0

    return NextResponse.json({
      success: true,
      data: ordersResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(totalCount),
        pages: Math.ceil(totalCount / limit),
      }
    })

  } catch (error: any) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get orders' },
      { status: 500 }
    )
  }
}
