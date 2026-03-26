import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    const statsResult = await query(`
      SELECT COUNT(*)::int as total_orders, COALESCE(SUM(oi.price), 0)::float as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p."categoryId" = c.id
      WHERE c.slug = 'scripts'
    `)

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM order_items oi
      JOIN orders o ON oi."orderId" = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p."categoryId" = c.id
      WHERE c.slug = 'scripts'
    `)

    const result = await query(`
      SELECT
        o.id as order_id,
        o."createdAt" as created_at,
        o."userId" as user_id,
        u.email as user_email,
        p.name as product_name,
        oi.quantity,
        oi.price,
        o.status as order_status
      FROM order_items oi
      JOIN orders o ON oi."orderId" = o.id
      JOIN users u ON o."userId" = u.id
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p."categoryId" = c.id
      WHERE c.slug = 'scripts'
      ORDER BY o."createdAt" DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset])

    const total = parseInt(countResult.rows[0]?.total || '0')

    return NextResponse.json({
      success: true,
      stats: statsResult.rows[0],
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    console.error('Scripts sales error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load sales' }, { status: 500 })
  }
}
