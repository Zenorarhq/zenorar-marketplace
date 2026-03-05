import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'
import { getExplorerUrl } from '@/lib/blockchain/verify'
import { fulfillOrder } from '@/lib/order-fulfillment'

/**
 * POST /api/admin/orders/[id]/mark-paid
 * Manually mark an order as paid (admin verification for crypto payments)
 */
export async function POST(
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
    const body = await request.json()
    const { txHash, adminNote, cryptoPaymentId } = body

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Verify order exists
    const orderResult = await executeQuery(
      `SELECT id, "orderNumber", "paymentStatus", status FROM orders WHERE id = $1`,
      [orderId]
    )

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const order = orderResult.rows[0]

    // Check if already paid
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Order is already marked as paid' },
        { status: 400 }
      )
    }

    // Update the order payment status
    await executeQuery(
      `UPDATE orders
       SET "paymentStatus" = 'PAID',
           status = CASE WHEN status = 'PENDING' THEN 'CONFIRMED' ELSE status END,
           "paidAt" = NOW(),
           "updatedAt" = NOW()
       WHERE id = $1`,
      [orderId]
    )

    // If there's a pending crypto payment, update it too
    if (cryptoPaymentId) {
      await executeQuery(
        `UPDATE pending_crypto_payments
         SET status = 'MANUALLY_CONFIRMED',
             tx_hash = COALESCE($2, tx_hash),
             admin_note = $3,
             confirmed_by = $4,
             confirmed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [cryptoPaymentId, txHash || null, adminNote || null, user.id]
      )
    } else {
      // Try to find and update any pending crypto payment for this order
      await executeQuery(
        `UPDATE pending_crypto_payments
         SET status = 'MANUALLY_CONFIRMED',
             tx_hash = COALESCE($2, tx_hash),
             admin_note = $3,
             confirmed_by = $4,
             confirmed_at = NOW(),
             updated_at = NOW()
         WHERE order_id = $1 AND status IN ('PENDING', 'EXPIRED')`,
        [orderId, txHash || null, adminNote || null, user.id]
      )
    }

    // Fulfill digital products (eSIMs, scripts, etc.)
    let fulfillmentResult = null
    try {
      fulfillmentResult = await fulfillOrder(orderId)
      if (!fulfillmentResult.success) {
        console.warn('Order fulfillment had issues:', fulfillmentResult)
      }
    } catch (fulfillmentError) {
      console.error('Order fulfillment error:', fulfillmentError)
    }

    // Fetch updated order
    const updatedOrderResult = await executeQuery(
      `SELECT id, "orderNumber", "paymentStatus", status, "paidAt" FROM orders WHERE id = $1`,
      [orderId]
    )

    const updatedOrder = updatedOrderResult.rows[0]

    // Fetch crypto payment details if exists
    let cryptoPayment = null
    const cryptoResult = await executeQuery(
      `SELECT id, network, tx_hash, status FROM pending_crypto_payments
       WHERE order_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [orderId]
    )
    if (cryptoResult.rows.length > 0) {
      const cp = cryptoResult.rows[0]
      cryptoPayment = {
        id: cp.id,
        network: cp.network,
        txHash: cp.tx_hash,
        status: cp.status,
        explorerUrl: cp.tx_hash ? getExplorerUrl(cp.network, cp.tx_hash) : null
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: updatedOrder.paymentStatus,
        status: updatedOrder.status,
        paidAt: updatedOrder.paidAt,
        cryptoPayment,
        fulfillment: fulfillmentResult ? {
          itemsProcessed: fulfillmentResult.itemsProcessed,
          itemsFailed: fulfillmentResult.itemsFailed,
          success: fulfillmentResult.success
        } : null,
        message: 'Order marked as paid successfully'
      }
    })
  } catch (error: any) {
    console.error('Mark paid error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to mark order as paid' },
      { status: 500 }
    )
  }
}
