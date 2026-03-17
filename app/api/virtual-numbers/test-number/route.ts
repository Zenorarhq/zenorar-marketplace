import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { canUseTestMode } from '@/lib/test-mode'

/**
 * POST /api/virtual-numbers/test-number
 * Create a test virtual number for testing settings/SMS flows
 * Available when globalTestMode is enabled in admin settings, or for admin users
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!(await canUseTestMode(user.role))) {
      return NextResponse.json(
        { success: false, error: 'Test mode is not enabled. An admin can enable it in Settings → API Keys.' },
        { status: 403 }
      )
    }

    const price = 5.00

    // Check wallet balance
    const walletResult = await query(`SELECT id, balance FROM wallet_balances WHERE user_id = $1`, [user.id])
    if (walletResult.rows.length === 0 || parseFloat(walletResult.rows[0].balance) < price) {
      return NextResponse.json({ success: false, error: 'Insufficient wallet balance' }, { status: 400 })
    }
    const walletId = walletResult.rows[0].id
    const balanceBefore = parseFloat(walletResult.rows[0].balance)

    // Get a valid country_id for the test number
    const countryResult = await query(`SELECT id FROM virtual_number_countries WHERE is_active = true LIMIT 1`)
    const countryId = countryResult.rows[0]?.id
    if (!countryId) {
      return NextResponse.json({ success: false, error: 'No active countries found. Sync virtual number providers first.' }, { status: 400 })
    }

    // Generate a test phone number
    const testNumber = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`
    const testLastFour = testNumber.slice(-4)
    const orderNumber = `TVN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const userEmail = (await query(`SELECT email FROM users WHERE id = $1`, [user.id])).rows[0]?.email || ''

    await query('BEGIN')
    try {
      // Deduct wallet
      await query(`UPDATE wallet_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`, [price, user.id])
      await query(
        `INSERT INTO wallet_transactions (id, wallet_balance_id, type, amount, balance_before, balance_after, description, metadata, created_at)
         VALUES (gen_random_uuid()::text, $1, 'DEBIT', $2, $3, $4, $5, $6, NOW())`,
        [walletId, price, balanceBefore, balanceBefore - price, `Test Virtual Number: ${testNumber}`, JSON.stringify({ reference_type: 'test_virtual_number', test_mode: true })]
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
         VALUES (gen_random_uuid()::text, $1, NULL, $2, $3, 1, $4, 'virtual_number', $5, NOW())`,
        [orderId, `Test Number: ${testNumber}`, price, price, JSON.stringify({ test_mode: 'true', phone_number: testNumber })]
      )

      // Create a test virtual number directly in the DB
      const result = await query(
        `INSERT INTO user_virtual_numbers (
           user_id, phone_number, phone_number_display, number_type, provider,
           country_id, status, plan_id, plan_category, plan_duration_days, sms_limit,
           expires_at, order_id, created_at, updated_at
         ) VALUES (
           $1, $2, $3, 'local', 'test',
           $5, 'active', 'basic', 'basic', 30, 500,
           NOW() + INTERVAL '30 days', $4, NOW(), NOW()
         ) RETURNING id, phone_number, status, expires_at`,
        [user.id, testNumber, `(555) ${testLastFour.slice(0,3)}-${testLastFour.slice(3)}`, orderId, countryId]
      )

      await query('COMMIT')

      return NextResponse.json({
        success: true,
        data: result.rows[0],
      })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    console.error('Error creating test number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create test number' },
      { status: 500 }
    )
  }
}
