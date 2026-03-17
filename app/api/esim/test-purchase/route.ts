import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { canUseTestMode } from '@/lib/test-mode'

/**
 * POST /api/esim/test-purchase
 * Create a test eSIM purchase with mock data (no real provider API call)
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

    // Get a real plan to reference
    const planResult = await query(`SELECT id, name, retail_price FROM esim_plans LIMIT 1`)
    if (planResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No eSIM plans found. Sync providers first.' }, { status: 400 })
    }
    const plan = planResult.rows[0]
    const price = parseFloat(plan.retail_price) || 5.00

    // Check wallet balance
    const walletResult = await query(`SELECT id, balance FROM wallet_balances WHERE user_id = $1`, [user.id])
    if (walletResult.rows.length === 0 || parseFloat(walletResult.rows[0].balance) < price) {
      return NextResponse.json({ success: false, error: 'Insufficient wallet balance' }, { status: 400 })
    }
    const walletId = walletResult.rows[0].id
    const balanceBefore = parseFloat(walletResult.rows[0].balance)

    const testIccid = `8901${Math.floor(10000000000000 + Math.random() * 90000000000000)}`
    const testQrCode = `LPA:1$test.smdp.example.com$TEST${Date.now()}`
    const orderNumber = `TESIM${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const userEmail = (await query(`SELECT email FROM users WHERE id = $1`, [user.id])).rows[0]?.email || ''

    await query('BEGIN')
    try {
      // Deduct wallet
      await query(`UPDATE wallet_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`, [price, user.id])
      await query(
        `INSERT INTO wallet_transactions (id, wallet_balance_id, type, amount, balance_before, balance_after, description, metadata, created_at)
         VALUES (gen_random_uuid()::text, $1, 'DEBIT', $2, $3, $4, $5, $6, NOW())`,
        [walletId, price, balanceBefore, balanceBefore - price, `Test eSIM: ${plan.name}`, JSON.stringify({ reference_type: 'test_esim', test_mode: true })]
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
         VALUES (gen_random_uuid()::text, $1, NULL, $2, $3, 1, $4, 'esim', $5, NOW())`,
        [orderId, `Test eSIM: ${plan.name}`, price, price, JSON.stringify({ test_mode: 'true', plan_id: plan.id })]
      )

      // Create user_esims record
      const esimResult = await query(
        `INSERT INTO user_esims (user_id, plan_id, order_id, source_type, iccid, smdp_address, qr_code_data, activation_code, status, delivery_method, delivered_at, created_at, updated_at)
         VALUES ($1, $2, $3, 'test', $4, 'test.smdp.example.com', $5, $6, 'active', 'qr', NOW(), NOW(), NOW()) RETURNING id`,
        [user.id, plan.id, orderId, testIccid, testQrCode, `TEST-${testIccid.slice(-8)}`]
      )

      await query('COMMIT')

      return NextResponse.json({
        success: true,
        data: { id: esimResult.rows[0].id, iccid: testIccid, plan: plan.name, price },
      })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    console.error('Test eSIM purchase error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to create test eSIM' }, { status: 500 })
  }
}
