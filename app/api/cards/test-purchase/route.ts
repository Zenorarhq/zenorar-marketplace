import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { canUseTestMode } from '@/lib/test-mode'
import crypto from 'crypto'

/**
 * POST /api/cards/test-purchase
 * Create a test virtual/instant card with mock data (no real provider API call)
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
    const cardType = body.cardType || 'virtual' // 'virtual' or 'instant'
    const denomination = parseFloat(body.denomination) || 25.00
    const price = cardType === 'virtual' ? 3.00 : denomination // Virtual = creation fee, Instant = denomination

    // Check wallet balance
    const walletResult = await query(`SELECT id, balance FROM wallet_balances WHERE user_id = $1`, [user.id])
    if (walletResult.rows.length === 0 || parseFloat(walletResult.rows[0].balance) < price) {
      return NextResponse.json({ success: false, error: 'Insufficient wallet balance' }, { status: 400 })
    }
    const walletId = walletResult.rows[0].id
    const balanceBefore = parseFloat(walletResult.rows[0].balance)

    // Generate mock card data
    const testCardNumber = '4111111111111111'
    const testCvv = '123'
    const testExpiry = `12/${new Date().getFullYear() + 3}`
    const lastFour = testCardNumber.slice(-4)

    // Simple encryption for test data
    const encryptionKey = process.env.CARD_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'test-key-32-chars-long-padding!!'
    const key = Buffer.from(encryptionKey.slice(0, 32).padEnd(32, '0'))
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    const encryptedNumber = Buffer.concat([iv, cipher.update(testCardNumber, 'utf8'), cipher.final()]).toString('base64')
    const iv2 = crypto.randomBytes(16)
    const cipher2 = crypto.createCipheriv('aes-256-cbc', key, iv2)
    const encryptedCvv = Buffer.concat([iv2, cipher2.update(testCvv, 'utf8'), cipher2.final()]).toString('base64')

    const orderNumber = `TCRD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const userEmail = (await query(`SELECT email FROM users WHERE id = $1`, [user.id])).rows[0]?.email || ''

    await query('BEGIN')
    try {
      // Deduct wallet
      await query(`UPDATE wallet_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`, [price, user.id])
      await query(
        `INSERT INTO wallet_transactions (id, wallet_balance_id, type, amount, balance_before, balance_after, description, metadata, created_at)
         VALUES (gen_random_uuid()::text, $1, 'DEBIT', $2, $3, $4, $5, $6, NOW())`,
        [walletId, price, balanceBefore, balanceBefore - price, `Test ${cardType} Card`, JSON.stringify({ reference_type: 'test_card', test_mode: true })]
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
         VALUES (gen_random_uuid()::text, $1, NULL, $2, $3, 1, $4, 'card', $5, NOW())`,
        [orderId, `Test ${cardType === 'virtual' ? 'Virtual' : 'Instant'} Card`, price, price, JSON.stringify({ test_mode: 'true', cardType, denomination })]
      )

      // Create user_cards record
      const cardResult = await query(
        `INSERT INTO user_cards (user_id, provider, provider_card_id, card_type, card_brand, card_last_four, card_number_encrypted, card_cvv_encrypted, card_expiry, currency, balance, denomination, status, is_premium, created_at, updated_at, expires_at)
         VALUES ($1, 'test', $2, $3, 'visa', $4, $5, $6, $7, 'USD', $8, $9, 'active', false, NOW(), NOW(), NOW() + INTERVAL '1 year') RETURNING id`,
        [user.id, `TEST-${Date.now()}`, cardType, lastFour, encryptedNumber, encryptedCvv, testExpiry, cardType === 'virtual' ? denomination : 0, cardType === 'instant' ? denomination : 0]
      )
      const cardId = cardResult.rows[0].id

      // Create creation transaction
      await query(
        `INSERT INTO card_transactions (id, card_id, user_id, provider, type, amount, fee, status, description, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'test', 'creation', $3, 0, 'completed', 'Test card creation', NOW())`,
        [cardId, user.id, price]
      )

      await query('COMMIT')

      return NextResponse.json({
        success: true,
        data: { id: cardId, cardType, lastFour, price },
      })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    console.error('Test card purchase error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create test card' }, { status: 500 })
  }
}
