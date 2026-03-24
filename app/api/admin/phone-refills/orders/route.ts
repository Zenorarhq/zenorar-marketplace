import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'))
    const offset = (page - 1) * limit

    const countResult = await query(`
      SELECT COUNT(*)::int FROM order_items WHERE product_type = 'phone_refill'
    `)
    const total = countResult.rows[0].count

    const result = await query(`
      SELECT
        oi.id,
        oi."orderId" AS order_id,
        oi.price,
        o.status,
        oi."createdAt" AS created_at,
        u.email AS user_email,
        oi.metadata->>'operatorName' AS operator_name,
        oi.metadata->>'recipientPhone' AS recipient_phone,
        oi.metadata->>'country' AS country,
        (oi.metadata->>'sendAmount')::float AS send_amount,
        oi.metadata->>'sendCurrency' AS send_currency,
        oi.metadata->>'offerId' AS offer_id
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      JOIN users u ON u.id = o."userId"
      WHERE oi.product_type = 'phone_refill'
      ORDER BY oi."createdAt" DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    return NextResponse.json({ success: true, data: result.rows, total, page, limit })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
