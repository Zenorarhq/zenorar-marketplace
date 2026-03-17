export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/virtual-numbers
 * List all virtual numbers with stats
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const country = searchParams.get('country')
    const offset = (page - 1) * limit

    // Build WHERE clause
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      conditions.push(`uvn.status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    if (search) {
      conditions.push(`(uvn.phone_number ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (country) {
      conditions.push(`vnc.iso_code = $${paramIndex}`)
      params.push(country)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM user_virtual_numbers uvn
       LEFT JOIN users u ON uvn.user_id = u.id
       LEFT JOIN virtual_number_countries vnc ON uvn.country_id = vnc.id
       ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total)

    // Get numbers with pagination
    const numbersResult = await query(
      `SELECT
         uvn.*,
         u.email as user_email,
         u.name as user_name,
         vnc.name as country_name,
         vnc.iso_code as country_code,
         vnc.flag_emoji,
         vnp.name as plan_name,
         vnp.base_price as plan_price
       FROM user_virtual_numbers uvn
       LEFT JOIN users u ON uvn.user_id = u.id
       LEFT JOIN virtual_number_countries vnc ON uvn.country_id = vnc.id
       LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
       ${whereClause}
       ORDER BY uvn.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    // Get summary stats
    const statsResult = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE status = 'expired') as expired,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
         SUM(sms_sent_count) as total_sms_sent,
         SUM(sms_received_count) as total_sms_received
       FROM user_virtual_numbers`
    )

    return NextResponse.json({
      success: true,
      data: {
        numbers: numbersResult.rows,
        stats: statsResult.rows[0],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error: any) {
    console.error('Error getting virtual numbers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get virtual numbers' },
      { status: 500 }
    )
  }
}
