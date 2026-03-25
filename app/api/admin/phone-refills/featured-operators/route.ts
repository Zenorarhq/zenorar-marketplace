import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * POST /api/admin/phone-refills/featured-operators
 * Upsert a featured phone refill operator (insert or update curated flags)
 * Body: { operator_name, country_code, image_url?, is_recommended, is_staff_pick }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const body = await request.json()
    const { operator_name, country_code, image_url, is_recommended, is_staff_pick } = body

    if (!operator_name || !country_code) {
      return NextResponse.json({ success: false, error: 'operator_name and country_code are required' }, { status: 400 })
    }

    const existing = await query(
      `SELECT id FROM featured_phone_refill_operators WHERE operator_name = $1`,
      [operator_name]
    )

    if (existing.rows.length > 0) {
      await query(`
        UPDATE featured_phone_refill_operators
        SET country_code = $1,
            image_url = COALESCE($2, image_url),
            is_recommended = $3,
            is_staff_pick = $4
        WHERE operator_name = $5
      `, [country_code, image_url ?? null, is_recommended ?? false, is_staff_pick ?? false, operator_name])
    } else {
      await query(`
        INSERT INTO featured_phone_refill_operators (operator_name, country_code, image_url, is_recommended, is_staff_pick)
        VALUES ($1, $2, $3, $4, $5)
      `, [operator_name, country_code, image_url ?? null, is_recommended ?? false, is_staff_pick ?? false])
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error upserting featured operator:', error)
    return NextResponse.json({ success: false, error: 'Failed to update operator' }, { status: 500 })
  }
}
