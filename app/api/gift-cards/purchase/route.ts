import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fulfillOrder } from '@/lib/order-fulfillment'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { checkStock, reserveCode } from '@/lib/gift-cards/inventory'

/**
 * Get or create the Gift Card product
 */
async function getGiftCardProductId(): Promise<string> {
  const existing = await query(
    `SELECT id, product_type FROM products WHERE slug = 'gift-card-service'`
  )

  if (existing.rows.length > 0) {
    if (existing.rows[0].product_type !== 'gift_card') {
      await query(
        `UPDATE products SET product_type = 'gift_card', "updatedAt" = NOW() WHERE id = $1`,
        [existing.rows[0].id]
      )
    }
    return existing.rows[0].id
  }

  const result = await query(
    `INSERT INTO products (
       id, name, slug, description, price, stock, status,
       "is_digital", product_type, "createdAt", "updatedAt"
     ) VALUES (
       gen_random_uuid()::text,
       'Gift Card',
       'gift-card-service',
       'Digital gift card delivery service',
       0,
       999999,
       'ACTIVE',
       true,
       'gift_card',
       NOW(),
       NOW()
     )
     ON CONFLICT (slug) DO UPDATE SET product_type = 'gift_card', "updatedAt" = NOW()
     RETURNING id`
  )

  return result.rows[0].id
}

/**
 * Calculate final price with markup and discount
 */
async function calculateFinalPrice(amount: number, discountPercent: number): Promise<number> {
  // Get markup from settings
  let markupPercent = 10 // Default 10%
  try {
    const settings = await getSiteSettingsByGroup('markup')
    if (settings.giftCardMarkupPercent) {
      markupPercent = Number(settings.giftCardMarkupPercent) || 10
    }
  } catch {
    // Use default
  }

  const withMarkup = amount * (1 + markupPercent / 100)
  const discount = amount * (discountPercent / 100)
  return withMarkup - discount
}

/**
 * POST /api/gift-cards/purchase
 * Purchase a gift card with wallet balance
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { giftCardId, denomination, paymentMethod } = body

    if (!giftCardId || !denomination) {
      return NextResponse.json(
        { success: false, error: 'giftCardId and denomination are required' },
        { status: 400 }
      )
    }

    if (paymentMethod !== 'wallet') {
      return NextResponse.json(
        { success: false, error: 'Only wallet payment is supported for instant purchase' },
        { status: 400 }
      )
    }

    // Get gift card details
    const giftCardResult = await query(
      `SELECT id, brand, slug, description, denominations, discount_percent,
              min_custom_amount, max_custom_amount, is_active, image_url
       FROM gift_cards WHERE id = $1`,
      [giftCardId]
    )

    if (giftCardResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const giftCard = giftCardResult.rows[0]

    if (!giftCard.is_active) {
      return NextResponse.json(
        { success: false, error: 'This gift card is currently unavailable' },
        { status: 400 }
      )
    }

    // Validate denomination
    const denominations = Array.isArray(giftCard.denominations)
      ? giftCard.denominations
      : (typeof giftCard.denominations === 'string' ? JSON.parse(giftCard.denominations) : [])

    const isValidDenomination = denominations.includes(denomination) ||
      (giftCard.min_custom_amount && giftCard.max_custom_amount &&
       denomination >= giftCard.min_custom_amount && denomination <= giftCard.max_custom_amount)

    if (!isValidDenomination) {
      return NextResponse.json(
        { success: false, error: 'Invalid denomination for this gift card' },
        { status: 400 }
      )
    }

    // Check stock availability and reserve a code
    const bulkStock = await checkStock(giftCardId, denomination)
    let reservedCodeId: string | undefined

    if (bulkStock > 0) {
      // Reserve a code from bulk inventory
      const reserveResult = await reserveCode(giftCardId, denomination, user.id)
      if (reserveResult.success && reserveResult.codeId) {
        reservedCodeId = reserveResult.codeId
      }
    }

    // If no bulk stock and no API provider configured, fail early
    const providerResult = await query(
      `SELECT provider, provider_product_id FROM gift_cards WHERE id = $1`,
      [giftCardId]
    )
    const providerInfo = providerResult.rows[0]
    const hasApiProvider = providerInfo?.provider && providerInfo?.provider_product_id

    if (!reservedCodeId && !hasApiProvider) {
      return NextResponse.json(
        { success: false, error: 'This gift card is currently out of stock. Please try a different card or denomination.' },
        { status: 400 }
      )
    }

    // Calculate final price with markup and discount
    const discountPercent = giftCard.discount_percent || 0
    const finalPrice = await calculateFinalPrice(denomination, discountPercent)

    // Get user's wallet balance
    const walletResult = await query(
      `SELECT id, balance, is_frozen FROM wallet_balances WHERE user_id = $1`,
      [user.id]
    )

    if (walletResult.rows.length === 0) {
      // Create wallet if doesn't exist
      await query(
        `INSERT INTO wallet_balances (id, user_id, balance, currency, is_frozen, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, 0, 'USD', false, NOW(), NOW())`,
        [user.id]
      )
      return NextResponse.json(
        { success: false, error: 'Insufficient wallet balance' },
        { status: 400 }
      )
    }

    const walletBalanceId = walletResult.rows[0].id
    const isFrozen = walletResult.rows[0].is_frozen

    if (isFrozen) {
      return NextResponse.json(
        { success: false, error: 'Your wallet is currently frozen. Please contact support.' },
        { status: 403 }
      )
    }

    const walletBalance = parseFloat(walletResult.rows[0].balance)
    if (walletBalance < finalPrice) {
      return NextResponse.json(
        { success: false, error: `Insufficient wallet balance. Available: $${walletBalance.toFixed(2)}, Required: $${finalPrice.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Get user's email
    const userResult = await query(
      `SELECT email FROM users WHERE id = $1`,
      [user.id]
    )
    const userEmail = userResult.rows[0]?.email || 'unknown@zenorar.com'

    // Get product ID
    const giftCardProductId = await getGiftCardProductId()

    // Generate order number
    const orderNumber = `ZN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (
         id, "orderNumber", "userId", status, subtotal, total, email,
         "paymentMethod", "paymentStatus", "paidAt", "createdAt", "updatedAt"
       ) VALUES (
         gen_random_uuid()::text, $1, $2, 'PROCESSING', $3, $4, $5,
         'WALLET', 'PAID', NOW(), NOW(), NOW()
       ) RETURNING id, "orderNumber"`,
      [orderNumber, user.id, finalPrice, finalPrice, userEmail]
    )

    const orderId = orderResult.rows[0].id
    const finalOrderNumber = orderResult.rows[0].orderNumber

    // Create order item
    await query(
      `INSERT INTO order_items (
         id, "orderId", "productId", name, quantity, price, total, license, metadata, product_type
       ) VALUES (
         gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9
       )`,
      [
        orderId,
        giftCardProductId,
        `${giftCard.brand} Gift Card ($${denomination})`,
        1,
        finalPrice,
        finalPrice,
        null,
        JSON.stringify({
          gift_card_id: giftCardId,
          denomination,
          brand: giftCard.brand,
          imageUrl: giftCard.image_url,
          discountPercent,
          originalAmount: denomination,
          finalPrice,
          reservedCodeId: reservedCodeId || null
        }),
        'gift_card'
      ]
    )

    // Deduct from wallet
    const balanceBefore = walletBalance
    const balanceAfter = walletBalance - finalPrice

    await query(
      `UPDATE wallet_balances SET balance = $1, updated_at = NOW() WHERE user_id = $2`,
      [balanceAfter, user.id]
    )

    // Record wallet transaction
    await query(
      `INSERT INTO wallet_transactions (
         id, wallet_balance_id, type, amount, balance_before, balance_after,
         description, order_id, created_at
       ) VALUES (
         gen_random_uuid()::text, $1, 'DEBIT', $2, $3, $4, $5, $6, NOW()
       )`,
      [walletBalanceId, finalPrice, balanceBefore, balanceAfter, `Gift Card: ${giftCard.brand} ($${denomination}) - Order #${finalOrderNumber}`, orderId]
    )

    // Run fulfillment
    console.log('[Purchase] Running fulfillment for order:', orderId, { giftCardId, denomination, reservedCodeId })
    const fulfillmentResult = await fulfillOrder(orderId)
    console.log('[Purchase] Fulfillment result:', JSON.stringify(fulfillmentResult, null, 2))

    if (!fulfillmentResult.success) {
      console.error('[Purchase] Gift card fulfillment failed:', {
        success: fulfillmentResult.success,
        details: fulfillmentResult.details,
        fullResult: JSON.stringify(fulfillmentResult)
      })

      const allFailed = fulfillmentResult.details?.every((d: any) => d.status === 'failed')

      if (allFailed) {
        // Refund the wallet
        await query(
          `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [finalPrice, user.id]
        )

        // Record refund transaction
        await query(
          `INSERT INTO wallet_transactions (
             id, wallet_balance_id, type, amount, balance_before, balance_after,
             description, order_id, created_at
           ) VALUES (
             gen_random_uuid()::text, $1, 'CREDIT', $2, $3, $4, $5, $6, NOW()
           )`,
          [walletBalanceId, finalPrice, balanceAfter, balanceAfter + finalPrice, `Refund for failed order #${finalOrderNumber}`, orderId]
        )

        // Update order status
        await query(
          `UPDATE orders SET status = 'CANCELLED', "paymentStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1`,
          [orderId]
        )

        const failedItem = fulfillmentResult.details?.find((d: any) => d.status === 'failed')
        const errorMessage = failedItem?.error || 'Failed to provision gift card'
        console.error('[Purchase] All items failed. Error from provider:', { failedItem, errorMessage })

        // Send notification
        await query(
          `INSERT INTO notifications (id, "userId", type, title, message, metadata)
           VALUES (gen_random_uuid()::text, $1, 'ORDER_CANCELLED'::"NotificationType",
                   'Order Failed - Refunded',
                   $2,
                   $3::jsonb)`,
          [user.id, `Your gift card order #${finalOrderNumber} could not be completed. ${errorMessage}. Your wallet has been refunded.`, JSON.stringify({ orderId, orderNumber: finalOrderNumber, error: errorMessage })]
        ).catch(err => console.error('Failed to send notification:', err))

        return NextResponse.json({
          success: false,
          error: errorMessage,
          data: {
            orderId,
            orderNumber: finalOrderNumber,
            refunded: true,
            newBalance: balanceAfter + finalPrice
          }
        })
      }
    }

    // Update order status to confirmed
    await query(
      `UPDATE orders SET status = 'CONFIRMED', "updatedAt" = NOW() WHERE id = $1`,
      [orderId]
    )

    // Send success notification
    await query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata)
       VALUES (gen_random_uuid()::text, $1, 'ORDER_CONFIRMED'::"NotificationType",
               'Gift Card Delivered',
               $2,
               $3::jsonb)`,
      [user.id, `Your ${giftCard.brand} $${denomination} gift card is ready! Order #${finalOrderNumber}`, JSON.stringify({ orderId, orderNumber: finalOrderNumber, brand: giftCard.brand, denomination })]
    ).catch(err => console.error('Failed to send notification:', err))

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        orderNumber: finalOrderNumber,
        brand: giftCard.brand,
        denomination,
        finalPrice,
        newBalance: balanceAfter,
        fulfillment: fulfillmentResult
      }
    })

  } catch (error: any) {
    console.error('Gift card purchase error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process purchase' },
      { status: 500 }
    )
  }
}
