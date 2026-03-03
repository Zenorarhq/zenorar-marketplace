export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/orders/stats — Order statistics (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const result = await executeQuery(`
      SELECT
        COUNT(*)::int AS "totalOrders",
        COALESCE(SUM(total), 0)::float AS "totalRevenue",
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS "pendingOrders",
        COUNT(*) FILTER (WHERE "paymentStatus" = 'PAID')::int AS "completedOrders"
      FROM orders
    `)

    return successResponse(result.rows[0])
  } catch (error) {
    console.error('Error fetching order stats:', error)
    return errorResponse('Failed to fetch order stats', 500)
  }
})
