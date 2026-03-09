import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/orders/lookup/[orderNumber]
 * Fetch order details by order number for the success page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const { orderNumber } = params

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      )
    }

    // Fetch order with items
    const orderResult = await query(
      `SELECT
         o.id,
         o."orderNumber",
         o.total,
         o.status,
         o."paymentStatus",
         o.email,
         o."createdAt"
       FROM orders o
       WHERE o."orderNumber" = $1`,
      [orderNumber]
    )

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const order = orderResult.rows[0]

    // Fetch order items
    const itemsResult = await query(
      `SELECT
         oi.id,
         oi."productId",
         oi.name,
         oi.quantity,
         oi.price,
         oi.product_type
       FROM order_items oi
       WHERE oi."orderId" = $1`,
      [order.id]
    )

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      productId: item.productId,
      product: {
        id: item.productId,
        name: item.name,
        slug: item.productId,
      },
      quantity: item.quantity,
      price: parseFloat(item.price),
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: parseFloat(order.total),
        status: order.status,
        paymentStatus: order.paymentStatus,
        email: order.email,
        items,
        createdAt: order.createdAt,
      }
    })

  } catch (error: any) {
    console.error('Order lookup error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
