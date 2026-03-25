import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/phone-refills/operators
 * Returns all featured phone refill operators with curated flags
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const result = await query(`
      SELECT
        id, operator_name, country_code, image_url,
        is_recommended, is_staff_pick, created_at
      FROM featured_phone_refill_operators
      ORDER BY operator_name ASC
    `)

    const countResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_recommended = true) as recommended_count,
        COUNT(*) FILTER (WHERE is_staff_pick = true) as staff_pick_count
      FROM featured_phone_refill_operators
    `)

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: countResult.rows[0],
    })
  } catch (error: any) {
    console.error('Error fetching featured operators:', error)
    return NextResponse.json({ success: false, error: 'Failed to load operators' }, { status: 500 })
  }
}
