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

    const result = await query(`
      SELECT
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(oi.price::numeric), 0)::float AS total_revenue,
        COUNT(DISTINCT oi.metadata->>'operatorName')::int AS unique_operators,
        COUNT(DISTINCT oi.metadata->>'country')::int AS unique_countries
      FROM order_items oi
      WHERE oi.product_type = 'phone_refill'
    `)

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
