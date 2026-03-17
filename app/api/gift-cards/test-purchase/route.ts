import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { canUseTestMode } from '@/lib/test-mode'

/**
 * POST /api/gift-cards/test-purchase
 * Create a test gift card purchase with mock data (no real provider API call)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    if (!(await canUseTestMode(user.role))) {
      return NextResponse.json({ success: false, error: 'Test mode is not enabled. An admin can enable it in Settings → API Keys.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const denomination = parseFloat(body.denomination) || 25.00
    const brand = body.brand || 'Test Brand'

    const price = denomination

    // Check wallet balance
    const walletResult = await query(`SELECT id, balance FROM wallet_balances WHERE user_id = $1`, [user.id])
    if (walletResult.rows.length === 0 || parseFloat(walletResult.rows[0].balance) < price) {
      return NextResponse.json({ success: false, error: 'Insufficient wallet balance' }, { status: 400 })
    }
    const walletId = walletResult.rows[0].id
    const balanceBefore = parseFloat(walletResult.rows[0].balance)

    const testCode = `TEST-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const testPin = Math.floor(1000 + Math.random() * 9000).toString()
    const orderNumber = `TGC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const userEmail = (await query(`SELECT email FROM users WHERE id = $1`, [user.id])).rows[0]?.email || ''

    await query('BEGIN')
    try {
      // Deduct wallet
      await query(`UPDATE wallet_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`, [price, user.id])
      await query(
        `INSERT INTO wallet_transactions (id, wallet_balance_id, type, amount, balance_before, balance_after, description, metadata, created_at)
         VALUES (gen_random_uuid()::text, $1, 'DEBIT', $2, $3, $4, $5, $6, NOW())`,
        [walletId, price, balanceBefore, balanceBefore - price, `Test Gift Card: ${brand} $${denomination}`, JSON.stringify({ reference_type: 'test_gift_card', test_mode: true })]
      )

      // Create order
      const orderResult = await query(
        `INSERT INTO orders (id, "orderNumber", "userId", status, subtotal, total, email, "paymentMethod", "paymentStatus", "paidAt", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'CONFIRMED', $3, $4, $5, 'WALLET', 'PAID', NOW(), NOW(), NOW()) RETURNING id`,
        [orderNumber, user.id, price, price, userEmail]
      )
      const orderId = orderResult.rows[0].id

      // Create order item
      await query(
        `INSERT INTO order_items (id, "orderId", "productId", name, price, quantity, total, product_type, metadata, "createdAt")
         VALUES (gen_random_uuid()::text, $1, NULL, $2, $3, 1, $4, 'gift_card', $5, NOW())`,
        [orderId, `Test Gift Card: ${brand} $${denomination}`, price, price, JSON.stringify({ test_mode: 'true', brand, denomination })]
      )

      // Create user_gift_cards record
      const gcResult = await query(
        `INSERT INTO user_gift_cards (user_id, order_id, brand, denomination, code, pin, status, source, delivered_at, created_at)
         VALUES ($1, $2::uuid, $3, $4, $5, $6, 'delivered', 'test', NOW(), NOW()) RETURNING id`,
        [user.id, orderId, brand, denomination, testCode, testPin]
      )

      await query('COMMIT')

      return NextResponse.json({
        success: true,
        data: { id: gcResult.rows[0].id, brand, denomination, code: testCode, pin: testPin, price },
      })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    console.error('Test gift card purchase error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create test gift card' }, { status: 500 })
  }
}
