import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getSessionId } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

const VALID_NETWORKS = ['BTC', 'ETH', 'USDT_ERC20', 'USDT_BEP20', 'USDT_TRC20', 'BNB', 'USDC', 'SOL', 'TRON']

/**
 * POST /api/payments/crypto/initiate
 * Creates a pending crypto payment record when user clicks "I've sent payment"
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    const sessionId = getSessionId(request)
    const body = await request.json()

    const { orderId, network, receivingAddress, expectedAmount, usdAmount, userTxHash } = body

    // Validate required fields
    if (!orderId || !network || !receivingAddress || !expectedAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: orderId, network, receivingAddress, expectedAmount' },
        { status: 400 }
      )
    }

    // Validate network
    if (!VALID_NETWORKS.includes(network)) {
      return NextResponse.json(
        { success: false, error: `Invalid network. Must be one of: ${VALID_NETWORKS.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if order exists and is pending
    const orderResult = await executeQuery(
      `SELECT id, order_number, "paymentStatus" FROM orders WHERE id = $1`,
      [orderId]
    )

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const order = orderResult.rows[0]

    // Check if order is already paid
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Order is already paid' },
        { status: 400 }
      )
    }

    // Check for existing pending payment for this order
    const existingResult = await executeQuery(
      `SELECT id, status, expires_at, user_tx_hash FROM pending_crypto_payments
       WHERE order_id = $1 AND status = 'PENDING'`,
      [orderId]
    )

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0]
      const expiresAt = new Date(existing.expires_at)

      // If not expired, return existing pending payment
      if (expiresAt > new Date()) {
        // Update user_tx_hash if provided
        if (userTxHash && userTxHash !== existing.user_tx_hash) {
          await executeQuery(
            `UPDATE pending_crypto_payments SET user_tx_hash = $1, updated_at = NOW() WHERE id = $2`,
            [userTxHash, existing.id]
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            paymentId: existing.id,
            expiresAt: existing.expires_at,
            status: 'PENDING',
            message: 'Existing pending payment found'
          }
        })
      } else {
        // Mark expired payment as expired
        await executeQuery(
          `UPDATE pending_crypto_payments SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
          [existing.id]
        )
      }
    }

    // Create new pending payment (45 minute expiry)
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000)

    const insertResult = await executeQuery(
      `INSERT INTO pending_crypto_payments
       (order_id, order_number, user_id, session_id, network, receiving_address,
        expected_amount, usd_amount, user_tx_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, expires_at, status`,
      [
        orderId,
        order.order_number,
        user?.id || null,
        sessionId,
        network,
        receivingAddress,
        expectedAmount,
        usdAmount || 0,
        userTxHash || null,
        expiresAt
      ]
    )

    const payment = insertResult.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        expiresAt: payment.expires_at,
        status: payment.status,
        orderNumber: order.order_number
      }
    })
  } catch (error: any) {
    console.error('Initiate crypto payment error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}
