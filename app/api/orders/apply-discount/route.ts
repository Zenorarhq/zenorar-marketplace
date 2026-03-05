import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, parseRequestBody } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// POST /api/orders/apply-discount — Save discount code and amount to an order
export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await parseRequestBody(request)
    if (!body || !body.orderId || !body.discountCode || body.discountAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'orderId, discountCode, and discountAmount are required' },
        { status: 400 }
      )
    }

    const result = await executeQuery(
      `UPDATE orders
       SET "discountCode" = $1, "discountAmount" = $2
       WHERE id = $3
       RETURNING id, "orderNumber", "discountCode", "discountAmount"`,
      [body.discountCode.toUpperCase(), body.discountAmount, body.orderId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Error applying discount to order:', error)
    return NextResponse.json({ success: false, error: 'Failed to apply discount' }, { status: 500 })
  }
}
