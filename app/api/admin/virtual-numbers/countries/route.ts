import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/virtual-numbers/countries
 * List all countries with number stats
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
         vnc.*,
         COUNT(uvn.id) as total_numbers,
         COUNT(uvn.id) FILTER (WHERE uvn.status = 'active') as active_numbers
       FROM virtual_number_countries vnc
       LEFT JOIN user_virtual_numbers uvn ON uvn.country_id = vnc.id
       GROUP BY vnc.id
       ORDER BY vnc.display_order ASC, vnc.name ASC`
    )

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    console.error('Error getting countries:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get countries' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/virtual-numbers/countries
 * Add a new country
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
      iso_code,
      dial_code,
      flag_emoji,
      sms_enabled = true,
      voice_enabled = true,
      mms_enabled = false,
      provider = 'twilio',
      cost_monthly,
      retail_monthly,
      is_active = true
    } = body

    if (!name || !iso_code || !dial_code) {
      return NextResponse.json(
        { success: false, error: 'Name, ISO code, and dial code are required' },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO virtual_number_countries
         (name, iso_code, dial_code, flag_emoji, sms_enabled, voice_enabled, mms_enabled,
          provider, cost_monthly, retail_monthly, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (iso_code)
       DO UPDATE SET
         name = EXCLUDED.name,
         dial_code = EXCLUDED.dial_code,
         flag_emoji = EXCLUDED.flag_emoji,
         sms_enabled = EXCLUDED.sms_enabled,
         voice_enabled = EXCLUDED.voice_enabled,
         mms_enabled = EXCLUDED.mms_enabled,
         provider = EXCLUDED.provider,
         cost_monthly = EXCLUDED.cost_monthly,
         retail_monthly = EXCLUDED.retail_monthly,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [name, iso_code, dial_code, flag_emoji, sms_enabled, voice_enabled, mms_enabled,
       provider, cost_monthly, retail_monthly, is_active]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error adding country:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add country' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/virtual-numbers/countries
 * Update a country (pass id in body)
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
        { success: false, error: 'Country ID is required' },
        { status: 400 }
      )
    }

    const allowedFields = [
      'name', 'dial_code', 'flag_emoji', 'sms_enabled', 'voice_enabled', 'mms_enabled',
      'provider', 'cost_monthly', 'retail_monthly', 'is_active', 'stock_available', 'display_order'
    ]

    const updateClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateClauses.push(`${field} = $${paramIndex}`)
        values.push(updates[field])
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
      `UPDATE virtual_number_countries
       SET ${updateClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Country not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating country:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update country' },
      { status: 500 }
    )
  }
}
