import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'
import { getExplorerUrl } from '@/lib/blockchain/verify'

/**
 * GET /api/admin/orders/[id]/crypto-payment
 * Fetch pending crypto payment details for an order (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id: orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Fetch pending crypto payments for this order
    const result = await executeQuery(
      `SELECT
        id, order_id, order_number, network, receiving_address,
        expected_amount, usd_amount, user_tx_hash, status, tx_hash,
        confirmed_amount, confirmations, initiated_at, expires_at,
        confirmed_at, last_checked_at, admin_note, tolerance_percent
       FROM pending_crypto_payments
       WHERE order_id = $1
       ORDER BY created_at DESC`,
      [orderId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    // Get the most recent payment
    const payment = result.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        orderId: payment.order_id,
        orderNumber: payment.order_number,
        network: payment.network,
        receivingAddress: payment.receiving_address,
        expectedAmount: payment.expected_amount,
        usdAmount: payment.usd_amount,
        userTxHash: payment.user_tx_hash,
        status: payment.status,
        txHash: payment.tx_hash,
        confirmedAmount: payment.confirmed_amount,
        confirmations: payment.confirmations,
        initiatedAt: payment.initiated_at,
        expiresAt: payment.expires_at,
        confirmedAt: payment.confirmed_at,
        lastCheckedAt: payment.last_checked_at,
        adminNote: payment.admin_note,
        tolerancePercent: payment.tolerance_percent,
        explorerUrl: payment.tx_hash ? getExplorerUrl(payment.network, payment.tx_hash) : null,
        userExplorerUrl: payment.user_tx_hash ? getExplorerUrl(payment.network, payment.user_tx_hash) : null,
        allPayments: result.rows.map(p => ({
          id: p.id,
          status: p.status,
          userTxHash: p.user_tx_hash,
          txHash: p.tx_hash,
          network: p.network,
          expectedAmount: p.expected_amount,
          initiatedAt: p.initiated_at,
          expiresAt: p.expires_at
        }))
      }
    })
  } catch (error: any) {
    console.error('Fetch crypto payment error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch crypto payment' },
      { status: 500 }
    )
  }
}
