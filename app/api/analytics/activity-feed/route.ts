export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/analytics/activity-feed — Recent activity across orders, signups, tickets (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)

    // Fetch recent events from 3 sources in parallel
    const [ordersResult, usersResult, ticketsResult] = await Promise.all([
      executeQuery(
        `SELECT 'order' as type, id, "orderNumber" as label,
                total::float as value, status as detail, "createdAt" as timestamp
         FROM orders ORDER BY "createdAt" DESC LIMIT $1`,
        [limit]
      ),
      executeQuery(
        `SELECT 'signup' as type, id, name as label,
                email as value, NULL as detail, "createdAt" as timestamp
         FROM users ORDER BY "createdAt" DESC LIMIT $1`,
        [limit]
      ),
      executeQuery(
        `SELECT 'ticket' as type, id, subject as label,
                status as value, priority as detail, created_at as timestamp
         FROM tickets ORDER BY created_at DESC LIMIT $1`,
        [limit]
      ).catch(() => ({ rows: [] })), // tickets table may not exist
    ])

    // Merge and sort by timestamp
    const all = [
      ...ordersResult.rows,
      ...usersResult.rows,
      ...ticketsResult.rows,
    ]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return successResponse(all)
  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return errorResponse('Failed to fetch activity feed', 500)
  }
})
