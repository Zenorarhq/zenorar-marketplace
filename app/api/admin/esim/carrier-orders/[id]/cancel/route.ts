import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * POST /api/admin/esim/carrier-orders/[id]/cancel
 * Admin cancels a carrier eSIM order and refunds wallet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { reason } = body

    // Get carrier order with order total
    const orderResult = await query(
      `SELECT ceo.*, o.total as order_total, o."orderNumber",
              cep.carrier_name, cep.plan_name
       FROM carrier_esim_orders ceo
       JOIN orders o ON ceo.order_id = o.id
       JOIN carrier_esim_plans cep ON ceo.carrier_plan_id = cep.id
       WHERE ceo.id = $1`,
      [params.id]
    )

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const order = orderResult.rows[0]

    if (order.status !== 'pending_fulfillment') {
      return NextResponse.json(
        { success: false, error: `Order cannot be cancelled (status: ${order.status})` },
        { status: 400 }
      )
    }

    const refundAmount = parseFloat(order.order_total)

    // Update carrier order status
    await query(
      `UPDATE carrier_esim_orders
       SET status = 'cancelled', cancellation_reason = $1, cancelled_at = NOW(),
           refunded_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [reason || 'Cancelled by admin', params.id]
    )

    // Refund wallet
    await query(
      `UPDATE wallet_balances SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
      [refundAmount, order.user_id]
    )

    // Record refund transaction
    await query(
      `INSERT INTO wallet_transactions
        (id, user_id, type, amount, balance_after, description, reference_type, reference_id, created_at)
       VALUES (gen_random_uuid()::text, $1, 'CREDIT', $2,
               (SELECT balance FROM wallet_balances WHERE user_id = $1),
               $3, 'order', $4, NOW())`,
      [
        order.user_id,
        refundAmount,
        `Refund for cancelled carrier eSIM order (${order.carrier_name} ${order.plan_name})`,
        order.order_id,
      ]
    )

    // Update order status
    await query(
      `UPDATE orders SET status = 'CANCELLED', "paymentStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1`,
      [order.order_id]
    )

    // Send notification
    query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata)
       VALUES (gen_random_uuid()::text, $1, 'ORDER_CANCELLED'::"NotificationType",
               'Carrier eSIM Order Cancelled',
               $2,
               $3::jsonb)`,
      [
        order.user_id,
        `Your ${order.carrier_name} eSIM order #${order.orderNumber} has been cancelled. $${refundAmount.toFixed(2)} has been refunded to your wallet.`,
        JSON.stringify({ orderId: order.order_id, carrierOrderId: params.id, refundAmount }),
      ]
    ).catch(err => console.error('Failed to send cancellation notification:', err))

    return NextResponse.json({ success: true, data: { refundAmount } })
  } catch (error: any) {
    console.error('Carrier order cancellation error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
