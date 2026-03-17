export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/virtual-numbers/stats
 * Get virtual numbers dashboard statistics
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

    // Overall stats
    const overallStats = await query(
      `SELECT
         COUNT(*) as total_numbers,
         COUNT(*) FILTER (WHERE status = 'active') as active_numbers,
         COUNT(*) FILTER (WHERE status = 'expired') as expired_numbers,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_numbers,
         COUNT(DISTINCT user_id) as unique_users,
         SUM(sms_sent_count) as total_sms_sent,
         SUM(sms_received_count) as total_sms_received,
         SUM(voice_minutes_used) as total_voice_minutes
       FROM user_virtual_numbers`
    )

    // Numbers by country
    const byCountry = await query(
      `SELECT
         vnc.name as country,
         vnc.iso_code,
         vnc.flag_emoji,
         COUNT(*) as count,
         COUNT(*) FILTER (WHERE uvn.status = 'active') as active
       FROM user_virtual_numbers uvn
       LEFT JOIN virtual_number_countries vnc ON uvn.country_id = vnc.id
       GROUP BY vnc.id, vnc.name, vnc.iso_code, vnc.flag_emoji
       ORDER BY count DESC
       LIMIT 10`
    )

    // Numbers by plan
    const byPlan = await query(
      `SELECT
         vnp.name as plan,
         vnp.base_price as price,
         COUNT(*) as count,
         COUNT(*) FILTER (WHERE uvn.status = 'active') as active
       FROM user_virtual_numbers uvn
       LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id::text
       GROUP BY vnp.id, vnp.name, vnp.base_price
       ORDER BY count DESC`
    )

    // Recent activity (last 7 days)
    const recentActivity = await query(
      `SELECT
         date_trunc('day', created_at) as date,
         COUNT(*) as new_numbers
       FROM user_virtual_numbers
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY date_trunc('day', created_at)
       ORDER BY date DESC`
    )

    // Message stats (last 7 days)
    const messageStats = await query(
      `SELECT
         date_trunc('day', created_at) as date,
         COUNT(*) FILTER (WHERE direction = 'inbound') as inbound,
         COUNT(*) FILTER (WHERE direction = 'outbound') as outbound
       FROM virtual_number_messages
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY date_trunc('day', created_at)
       ORDER BY date DESC`
    )

    // Expiring soon (next 7 days)
    const expiringSoon = await query(
      `SELECT
         uvn.id,
         uvn.phone_number,
         uvn.phone_number_display,
         uvn.expires_at,
         u.email as user_email,
         vnc.flag_emoji
       FROM user_virtual_numbers uvn
       LEFT JOIN users u ON uvn.user_id = u.id
       LEFT JOIN virtual_number_countries vnc ON uvn.country_id = vnc.id
       WHERE uvn.status = 'active'
         AND uvn.expires_at < NOW() + INTERVAL '7 days'
         AND uvn.expires_at > NOW()
       ORDER BY uvn.expires_at ASC
       LIMIT 10`
    )

    // Revenue stats
    const revenue = await query(
      `SELECT
         COUNT(*) as total_orders,
         SUM(vnp.base_price) as total_revenue
       FROM user_virtual_numbers uvn
       LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id::text
       WHERE uvn.created_at > NOW() - INTERVAL '30 days'`
    )

    return NextResponse.json({
      success: true,
      data: {
        overview: overallStats.rows[0],
        byCountry: byCountry.rows,
        byPlan: byPlan.rows,
        recentActivity: recentActivity.rows,
        messageStats: messageStats.rows,
        expiringSoon: expiringSoon.rows,
        revenue: revenue.rows[0]
      }
    })
  } catch (error: any) {
    console.error('Error getting virtual number stats:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get stats' },
      { status: 500 }
    )
  }
}
