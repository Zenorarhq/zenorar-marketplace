import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fulfillOrder } from '@/lib/order-fulfillment'
import { verifyAccessToken } from '@/lib/auth-utils'

/**
 * Get or create a product by type
 */
async function getOrCreateProduct(productType: string): Promise<string> {
  const config: Record<string, { slug: string; name: string; description: string }> = {
    virtual_number: {
      slug: 'virtual-number',
      name: 'Virtual Number',
      description: 'Virtual phone number rental service for SMS verification and calls'
    },
    gift_card: {
      slug: 'gift-card-service',
      name: 'Gift Card',
      description: 'Digital gift card delivery service'
    },
    esim: {
      slug: 'esim-service',
      name: 'eSIM',
      description: 'Digital eSIM service'
    }
  }

  const productConfig = config[productType] || config.virtual_number

  const existing = await query(
    `SELECT id, product_type FROM products WHERE slug = $1`,
    [productConfig.slug]
  )

  if (existing.rows.length > 0) {
    if (existing.rows[0].product_type !== productType) {
      await query(
        `UPDATE products SET product_type = $1, "updatedAt" = NOW() WHERE id = $2`,
        [productType, existing.rows[0].id]
      )
    }
    return existing.rows[0].id
  }

  const result = await query(
    `INSERT INTO products (
       id, name, slug, description, price, stock, status,
       "is_digital", product_type, "createdAt", "updatedAt"
     ) VALUES (
       gen_random_uuid()::text, $1, $2, $3, 0, 999999, 'ACTIVE', true, $4, NOW(), NOW()
     )
     ON CONFLICT (slug) DO UPDATE SET product_type = $4, "updatedAt" = NOW()
     RETURNING id`,
    [productConfig.name, productConfig.slug, productConfig.description, productType]
  )

  return result.rows[0].id
}

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

    // Create order items - handle different product types
    for (const item of items) {
      const itemQuantity = item.quantity || 1
      const itemPrice = item.price
      const itemTotal = itemPrice * itemQuantity
      const productType = item.productType || item.metadata?.productType || 'virtual_number'

      // Get appropriate product ID for this item type
      const productId = await getOrCreateProduct(productType)

      // Build metadata based on product type
      let metadata: Record<string, any> = { ...item.metadata, amount_paid: item.price }

      if (productType === 'virtual_number') {
        metadata = {
          ...metadata,
          phone_number: item.metadata?.phoneNumber,
          country_id: item.metadata?.countryId,
          plan_id: item.metadata?.planCategory === 'basic' ? 'basic' : 'business',
          number_type: item.metadata?.numberType,
          duration_days: item.metadata?.durationDays,
          sms_limit: item.metadata?.smsLimit,
          minute_tier: item.metadata?.minuteTier,
          minute_included: item.metadata?.minuteIncluded,
          minute_tier_price: item.metadata?.minuteTierPrice,
        }
      } else if (productType === 'gift_card') {
        metadata = {
          ...metadata,
          gift_card_id: item.metadata?.gift_card_id,
          denomination: item.metadata?.denomination,
          brand: item.metadata?.brand,
          imageUrl: item.metadata?.imageUrl,
        }
      }

      const itemName = productType === 'virtual_number'
        ? (item.metadata?.friendlyName || 'Virtual Number')
        : productType === 'gift_card'
          ? `${item.metadata?.brand || 'Gift Card'} ($${item.metadata?.denomination || itemPrice})`
          : (item.name || 'Digital Product')

      await query(
        `INSERT INTO order_items (
           id, "orderId", "productId", name, quantity, price, total, license, metadata, product_type
         ) VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9
         )`,
        [
          orderId,
          productId,
          itemName,
          itemQuantity,
          itemPrice,
          itemTotal,
          null,
          JSON.stringify(metadata),
          productType
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
      console.error('Fulfillment failed:', fulfillmentResult)

      // Check if any items actually failed
      const allFailed = fulfillmentResult.details?.every((d: any) => d.status === 'failed')

      if (allFailed) {
        // Refund the wallet
        await query(
          `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [total, userId]
        )

        // Record refund transaction
        await query(
          `INSERT INTO wallet_transactions (
             id, wallet_balance_id, type, amount, balance_before, balance_after,
             description, order_id, created_at
           ) VALUES (
             gen_random_uuid()::text, $1, 'CREDIT', $2, $3, $4, $5, $6, NOW()
           )`,
          [walletBalanceId, total, balanceAfter, balanceAfter + total, `Refund for failed order #${finalOrderNumber}`, orderId]
        )

        // Update order status to cancelled (FAILED is not a valid enum value)
        await query(
          `UPDATE orders SET status = 'CANCELLED', "paymentStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1`,
          [orderId]
        )

        // Get the error message from failed items
        const failedItem = fulfillmentResult.details?.find((d: any) => d.status === 'failed')
        const errorMessage = failedItem?.error || 'Failed to provision virtual number'

        // Send failure notification (using ORDER_CANCELLED type which exists in enum)
        await query(
          `INSERT INTO notifications (id, "userId", type, title, message, metadata)
           VALUES (gen_random_uuid()::text, $1, 'ORDER_CANCELLED'::"NotificationType",
                   'Order Failed - Refunded',
                   $2,
                   $3::jsonb)`,
          [userId, `Your order #${finalOrderNumber} could not be completed. ${errorMessage}. Your wallet has been refunded.`, JSON.stringify({ orderId, orderNumber: finalOrderNumber, error: errorMessage })]
        ).catch(err => console.error('Failed to send notification:', err))

        return NextResponse.json({
          success: false,
          error: errorMessage,
          data: {
            orderId,
            orderNumber: finalOrderNumber,
            refunded: true,
            newBalance: balanceAfter + total,
            fulfillment: fulfillmentResult
          }
        })
      }
    }

    // Update order status to confirmed (digital products are instant, no physical delivery)
    await query(
      `UPDATE orders SET status = 'CONFIRMED', "updatedAt" = NOW() WHERE id = $1`,
      [orderId]
    )

    // Send success notification
    await query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata)
       VALUES (gen_random_uuid()::text, $1, 'ORDER_CONFIRMED'::"NotificationType",
               'Order Confirmed',
               $2,
               $3::jsonb)`,
      [userId, `Your order #${finalOrderNumber} has been confirmed. Your virtual number is ready!`, JSON.stringify({ orderId, orderNumber: finalOrderNumber })]
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
