import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/virtual-numbers/plans
 * List all plans with subscription counts
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const result = await query(
      `SELECT
         vnp.*,
         COUNT(uvn.id) as total_subscriptions,
         COUNT(uvn.id) FILTER (WHERE uvn.status = 'active') as active_subscriptions
       FROM virtual_number_plans vnp
       LEFT JOIN user_virtual_numbers uvn ON uvn.plan_id = vnp.id
       GROUP BY vnp.id
       ORDER BY vnp.display_order ASC, vnp.base_price ASC`
    )

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    console.error('Error getting plans:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get plans' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/virtual-numbers/plans
 * Create a new plan
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      slug,
      duration_type = 'monthly',
      duration_days = 30,
      sms_included = 100,
      voice_minutes_included = 0,
      unlimited_sms = false,
      unlimited_voice = false,
      base_price,
      sms_overage_price = 0.05,
      voice_overage_price = 0.10,
      features = [],
      is_active = true,
      is_featured = false
    } = body

    if (!name || !slug || !base_price) {
      return NextResponse.json(
        { success: false, error: 'Name, slug, and base price are required' },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO virtual_number_plans
         (name, slug, duration_type, duration_days, sms_included, voice_minutes_included,
          unlimited_sms, unlimited_voice, base_price, sms_overage_price, voice_overage_price,
          features, is_active, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (slug)
       DO UPDATE SET
         name = EXCLUDED.name,
         duration_type = EXCLUDED.duration_type,
         duration_days = EXCLUDED.duration_days,
         sms_included = EXCLUDED.sms_included,
         voice_minutes_included = EXCLUDED.voice_minutes_included,
         unlimited_sms = EXCLUDED.unlimited_sms,
         unlimited_voice = EXCLUDED.unlimited_voice,
         base_price = EXCLUDED.base_price,
         sms_overage_price = EXCLUDED.sms_overage_price,
         voice_overage_price = EXCLUDED.voice_overage_price,
         features = EXCLUDED.features,
         is_active = EXCLUDED.is_active,
         is_featured = EXCLUDED.is_featured,
         updated_at = NOW()
       RETURNING *`,
      [name, slug, duration_type, duration_days, sms_included, voice_minutes_included,
       unlimited_sms, unlimited_voice, base_price, sms_overage_price, voice_overage_price,
       JSON.stringify(features), is_active, is_featured]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error creating plan:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create plan' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/virtual-numbers/plans
 * Update a plan (pass id in body)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    const allowedFields = [
      'name', 'duration_type', 'duration_days', 'sms_included', 'voice_minutes_included',
      'unlimited_sms', 'unlimited_voice', 'base_price', 'sms_overage_price', 'voice_overage_price',
      'features', 'is_active', 'is_featured', 'display_order'
    ]

    const updateClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        let value = updates[field]
        if (field === 'features' && Array.isArray(value)) {
          value = JSON.stringify(value)
        }
        updateClauses.push(`${field} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    if (updateClauses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(id)
    const result = await query(
      `UPDATE virtual_number_plans
       SET ${updateClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating plan:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update plan' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/virtual-numbers/plans
 * Delete a plan (pass id as query param)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    // Check if plan is in use
    const usageCheck = await query(
      `SELECT COUNT(*) as count FROM user_virtual_numbers WHERE plan_id = $1`,
      [id]
    )

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete plan with active subscriptions' },
        { status: 400 }
      )
    }

    await query(`DELETE FROM virtual_number_plans WHERE id = $1`, [id])

    return NextResponse.json({
      success: true,
      message: 'Plan deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting plan:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete plan' },
      { status: 500 }
    )
  }
}
