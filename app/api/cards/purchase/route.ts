export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import {
  getProviderPricing,
  createCardRecord,
  recordTransaction,
  calculateInstantCardPrice
} from '@/lib/cards/service'
import { getProvider } from '@/lib/cards/providers'
import type { CardProvider, CardType, CardBrand } from '@/lib/cards/types'
import { executeQuery, getSiteSettingsByGroup } from '@/lib/db-helpers'
import { query } from '@/lib/db'
import { isTestModeEnabled } from '@/lib/test-mode'

/**
 * Get or create the Virtual Card product
 */
async function getCardProductId(): Promise<string> {
  const existing = await query(
    `SELECT id, product_type FROM products WHERE slug = 'virtual-card-service'`
  )

  if (existing.rows.length > 0) {
    if (existing.rows[0].product_type !== 'virtual_card') {
      await query(
        `UPDATE products SET product_type = 'virtual_card', "updatedAt" = NOW() WHERE id = $1`,
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
       'Virtual Card',
       'virtual-card-service',
       'Virtual card delivery service',
       0,
       999999,
       'ACTIVE',
       true,
       'virtual_card',
       NOW(),
       NOW()
     )
     ON CONFLICT (slug) DO UPDATE SET product_type = 'virtual_card', "updatedAt" = NOW()
     RETURNING id`
  )

  return result.rows[0].id
}

/**
 * POST /api/cards/purchase
 * Purchase a virtual or instant card with wallet balance
 * Creates an order record for order history
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      provider: providerName,
      cardType,
      denomination,
      cardBrand = 'visa',
      nickname,
      paymentMethod
    } = body as {
      provider: CardProvider
      cardType: CardType
      denomination?: number
      cardBrand?: CardBrand
      nickname?: string
      paymentMethod?: string
    }

    // Validate payment method
    if (paymentMethod !== 'wallet') {
      return NextResponse.json(
        { success: false, error: 'Only wallet payment is supported for instant purchase' },
        { status: 400 }
      )
    }

    // Validate input
    if (!providerName || !cardType) {
      return NextResponse.json(
        { success: false, error: 'Provider and card type are required' },
        { status: 400 }
      )
    }

    if (cardType === 'instant' && !denomination) {
      return NextResponse.json(
        { success: false, error: 'Denomination is required for instant cards' },
        { status: 400 }
      )
    }

    // Get provider pricing
    const pricing = await getProviderPricing(providerName)
    if (!pricing || !pricing.isEnabled) {
      return NextResponse.json(
        { success: false, error: 'Provider is not available' },
        { status: 400 }
      )
    }

    // Calculate cost
    let totalCost = 0
    if (cardType === 'instant') {
      totalCost = calculateInstantCardPrice(denomination!, pricing.instantMarkupPercent)
    } else {
      totalCost = pricing.creationFee
    }

    // Get user's wallet balance
    const walletResult = await executeQuery<any>(
      'SELECT id, balance, is_frozen FROM wallet_balances WHERE user_id = $1',
      [user.id]
    )

    if (walletResult.rows.length === 0) {
      // Create wallet if doesn't exist
      await executeQuery(
        `INSERT INTO wallet_balances (id, user_id, balance, currency, is_frozen, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, 0, 'USD', false, NOW(), NOW())`,
        [user.id]
      )
      return NextResponse.json(
        { success: false, error: 'Insufficient wallet balance. Please add funds to your wallet.' },
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

    const walletBalance = parseFloat(walletResult.rows[0]?.balance || '0')

    if (walletBalance < totalCost) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${walletBalance.toFixed(2)}`
        },
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
    const cardProductId = await getCardProductId()

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
      [orderNumber, user.id, totalCost, totalCost, userEmail]
    )

    const orderId = orderResult.rows[0].id
    const finalOrderNumber = orderResult.rows[0].orderNumber

    // Determine card display name
    const brandName = cardBrand === 'mastercard' ? 'Mastercard' : 'Visa'
    const isPremium = providerName === 'lithic'
    const cardDisplayName = cardType === 'instant'
      ? `${brandName} $${denomination} Instant Card`
      : `${isPremium ? 'Premium ' : ''}${brandName} Virtual Card`

    // Create order item with metadata
    await query(
      `INSERT INTO order_items (
         id, "orderId", "productId", name, quantity, price, total, license, metadata, product_type
       ) VALUES (
         gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9
       )`,
      [
        orderId,
        cardProductId,
        cardDisplayName,
        1,
        totalCost,
        totalCost,
        null,
        JSON.stringify({
          provider: providerName,
          cardType,
          cardBrand,
          denomination: denomination || null,
          isPremium,
          nickname: nickname || null
        }),
        cardType === 'instant' ? 'instant_card' : 'virtual_card'
      ]
    )

    // Deduct from wallet
    const balanceBefore = walletBalance
    const balanceAfter = walletBalance - totalCost

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
      [walletBalanceId, totalCost, balanceBefore, balanceAfter, `${cardDisplayName} - Order #${finalOrderNumber}`, orderId]
    )

    // In sandbox/test mode, skip real provider and use mock data
    const testMode = await isTestModeEnabled()
    const apiSettings = testMode ? {} : await getSiteSettingsByGroup('api')
    const lithicSandbox = apiSettings.lithicMode === 'sandbox' || apiSettings.lithicSandbox === true
    if (testMode || lithicSandbox) {
      const mockResult = {
        success: true,
        cardId: `TEST-${Date.now()}`,
        cardNumber: '4111111111111111',
        cvv: '123',
        expiry: `12/${new Date().getFullYear() + 3}`,
        lastFour: '1111',
        balance: cardType === 'virtual' ? (denomination || 0) : 0,
      }

      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + (cardType === 'instant' ? 1 : 3))

      const card = await createCardRecord(
        user.id, 'test' as CardProvider, mockResult.cardId, cardType, cardBrand,
        mockResult.lastFour, mockResult.cardNumber, mockResult.cvv, mockResult.expiry,
        mockResult.balance, cardType === 'instant' ? denomination ?? null : null,
        isPremium, expiresAt, { nickname, orderId }
      )

      await recordTransaction(card.id, user.id, 'test' as CardProvider, 'creation', totalCost, 0, mockResult.cardId, undefined, undefined, `Test ${cardType} card - Order #${finalOrderNumber}`)
      await query(`UPDATE orders SET status = 'CONFIRMED', "updatedAt" = NOW() WHERE id = $1`, [orderId])
      await query(`UPDATE order_items SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"test_mode":"true"}'::jsonb WHERE "orderId" = $1`, [orderId])

      return NextResponse.json({
        success: true,
        data: {
          cardId: card.id, orderId, orderNumber: finalOrderNumber,
          cardType, cardBrand, lastFour: mockResult.lastFour,
          balance: mockResult.balance, totalCost, newWalletBalance: balanceAfter,
        }
      })
    }

    // Get provider implementation
    const provider = getProvider(providerName)
    if (!provider) {
      // Refund and cancel order
      await query(
        `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [totalCost, user.id]
      )
      await query(
        `UPDATE orders SET status = 'CANCELLED', "paymentStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1`,
        [orderId]
      )
      await query(
        `INSERT INTO wallet_transactions (
           id, wallet_balance_id, type, amount, balance_before, balance_after,
           description, order_id, created_at
         ) VALUES (
           gen_random_uuid()::text, $1, 'CREDIT', $2, $3, $4, $5, $6, NOW()
         )`,
        [walletBalanceId, totalCost, balanceAfter, balanceAfter + totalCost, `Refund for failed order #${finalOrderNumber}`, orderId]
      )

      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 400 }
      )
    }

    // Create the card with the provider
    const result = await provider.createCard({
      userId: user.id,
      currency: 'USD',
      denomination,
      cardBrand
    })

    if (!result.success) {
      // Refund and cancel order
      await query(
        `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [totalCost, user.id]
      )
      await query(
        `UPDATE orders SET status = 'CANCELLED', "paymentStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1`,
        [orderId]
      )
      await query(
        `INSERT INTO wallet_transactions (
           id, wallet_balance_id, type, amount, balance_before, balance_after,
           description, order_id, created_at
         ) VALUES (
           gen_random_uuid()::text, $1, 'CREDIT', $2, $3, $4, $5, $6, NOW()
         )`,
        [walletBalanceId, totalCost, balanceAfter, balanceAfter + totalCost, `Refund for failed order #${finalOrderNumber}`, orderId]
      )

      // Send notification
      await query(
        `INSERT INTO notifications (id, "userId", type, title, message, metadata)
         VALUES (gen_random_uuid()::text, $1, 'ORDER_CANCELLED'::"NotificationType",
                 'Order Failed - Refunded',
                 $2,
                 $3::jsonb)`,
        [user.id, `Your card order #${finalOrderNumber} could not be completed. ${result.error || 'Provider error'}. Your wallet has been refunded.`, JSON.stringify({ orderId, orderNumber: finalOrderNumber, error: result.error })]
      ).catch(err => console.error('Failed to send notification:', err))

      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to create card',
        data: {
          orderId,
          orderNumber: finalOrderNumber,
          refunded: true,
          newBalance: balanceAfter + totalCost
        }
      })
    }

    // Calculate expiry date (3 years for virtual, 1 year for instant)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + (cardType === 'instant' ? 1 : 3))

    // Save card to database
    const card = await createCardRecord(
      user.id,
      providerName,
      result.cardId || null,
      cardType,
      cardBrand,
      result.lastFour || '',
      result.cardNumber || null,
      result.cvv || null,
      result.expiry || '',
      result.balance || 0,
      cardType === 'instant' ? denomination ?? null : null,
      isPremium,
      expiresAt,
      { nickname, orderId }
    )

    // Record the creation transaction
    await recordTransaction(
      card.id,
      user.id,
      providerName,
      'creation',
      totalCost,
      cardType === 'virtual' ? pricing.creationFee : 0,
      result.cardId,
      undefined,
      undefined,
      `Created ${cardType} card - Order #${finalOrderNumber}`
    )

    // Update order status to confirmed
    await query(
      `UPDATE orders SET status = 'CONFIRMED', "updatedAt" = NOW() WHERE id = $1`,
      [orderId]
    )

    // Send success notification
    await query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata)
       VALUES (gen_random_uuid()::text, $1, 'ORDER_CONFIRMED'::"NotificationType",
               'Card Delivered',
               $2,
               $3::jsonb)`,
      [user.id, `Your ${cardDisplayName} is ready! Order #${finalOrderNumber}`, JSON.stringify({ orderId, orderNumber: finalOrderNumber, cardId: card.id })]
    ).catch(err => console.error('Failed to send notification:', err))

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        orderNumber: finalOrderNumber,
        cardId: card.id,
        provider: card.provider,
        cardType: card.cardType,
        cardBrand: card.cardBrand,
        cardLastFour: card.cardLastFour,
        cardExpiry: card.cardExpiry,
        balance: card.balance,
        denomination: card.denomination,
        status: card.status,
        isPremium: card.isPremium,
        createdAt: card.createdAt,
        cost: totalCost,
        newBalance: balanceAfter
      }
    })
  } catch (error: any) {
    console.error('Error purchasing card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process purchase' },
      { status: 500 }
    )
  }
}
