import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/phone-refills/operators
 * Returns all distinct operators from phone refill orders, with curated flags from featured table
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const result = await query(`
      SELECT
        oi.metadata->>'operatorName' AS operator_name,
        oi.metadata->>'country' AS country_code,
        fpo.image_url,
        COALESCE(fpo.is_recommended, false) AS is_recommended,
        COALESCE(fpo.is_staff_pick, false) AS is_staff_pick,
        COUNT(*)::int AS order_count
      FROM order_items oi
      LEFT JOIN featured_phone_refill_operators fpo
        ON fpo.operator_name = oi.metadata->>'operatorName'
      WHERE oi.product_type = 'phone_refill'
        AND oi.metadata->>'operatorName' IS NOT NULL
      GROUP BY
        oi.metadata->>'operatorName',
        oi.metadata->>'country',
        fpo.image_url, fpo.is_recommended, fpo.is_staff_pick
      ORDER BY operator_name ASC
    `)

    const statsResult = await query(`
      SELECT
        COUNT(DISTINCT oi.metadata->>'operatorName')::int AS total_operators,
        COUNT(*) FILTER (WHERE fpo.is_recommended = true)::int AS recommended_count,
        COUNT(*) FILTER (WHERE fpo.is_staff_pick = true)::int AS staff_pick_count
      FROM order_items oi
      LEFT JOIN featured_phone_refill_operators fpo
        ON fpo.operator_name = oi.metadata->>'operatorName'
      WHERE oi.product_type = 'phone_refill'
        AND oi.metadata->>'operatorName' IS NOT NULL
    `)

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0],
    })
  } catch (error: any) {
    console.error('Error fetching phone refill operators:', error)
    return NextResponse.json({ success: false, error: 'Failed to load operators' }, { status: 500 })
  }
}
