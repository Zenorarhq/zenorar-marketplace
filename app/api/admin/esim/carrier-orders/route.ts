import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/esim/carrier-orders
 * List carrier eSIM orders with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'EDITOR'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      whereClause += ` AND ceo.status = $${paramIndex++}`
      params.push(status)
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM carrier_esim_orders ceo ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    const result = await query(
      `SELECT
        ceo.*,
        cep.carrier_name, cep.carrier_slug, cep.plan_name,
        cep.data_amount_display, cep.network_type, cep.retail_price,
        u.name as user_name, u.email as user_email
      FROM carrier_esim_orders ceo
      JOIN carrier_esim_plans cep ON ceo.carrier_plan_id = cep.id
      JOIN users u ON ceo.user_id = u.id
      ${whereClause}
      ORDER BY
        CASE WHEN ceo.status = 'pending_fulfillment' THEN 0 ELSE 1 END,
        ceo.fulfillment_deadline ASC,
        ceo.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    )

    // Get pending count for badge
    const pendingCount = await query(
      `SELECT COUNT(*) FROM carrier_esim_orders WHERE status = 'pending_fulfillment'`
    )

    return NextResponse.json({
      success: true,
      data: {
        orders: result.rows,
        total,
        page,
        limit,
        pendingCount: parseInt(pendingCount.rows[0].count),
      },
    })
  } catch (error: any) {
    console.error('Carrier orders fetch error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
