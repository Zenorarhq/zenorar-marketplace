export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/analytics/revenue-by-category — Revenue breakdown by category (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const result = await executeQuery(`
      SELECT
        c.name as category,
        COALESCE(SUM(oi.total), 0)::float as revenue,
        COUNT(DISTINCT oi."orderId")::int as orders
      FROM "OrderItem" oi
      JOIN products p ON oi."productId" = p.id
      JOIN categories c ON p."categoryId" = c.id
      JOIN orders o ON oi."orderId" = o.id
      WHERE o."paymentStatus" = 'PAID'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT 10
    `)

    return successResponse(result.rows)
  } catch (error) {
    console.error('Error fetching revenue by category:', error)
    return errorResponse('Failed to fetch revenue by category', 500)
  }
})
