import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/finance/overview — Finance overview (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter = startDate && endDate ? `WHERE "createdAt" >= $1 AND "createdAt" <= $2` : ''
    const params = startDate && endDate ? [startDate, endDate] : []

    const result = await executeQuery(`
      SELECT
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAID' THEN total ELSE 0 END), 0)::float AS "totalRevenue",
        COUNT(*)::int AS "totalSales",
        COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN total ELSE 0 END), 0)::float AS "totalRefunds",
        0::float AS "totalFees",
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAID' THEN total ELSE 0 END), 0)::float AS "availableBalance",
        COALESCE(SUM(
          CASE
            WHEN "paymentStatus" = 'PENDING' THEN total
            WHEN "paymentStatus" IS NULL AND status = 'PENDING' THEN total
            ELSE 0
          END
        ), 0)::float AS "pendingBalance"
      FROM orders
      ${dateFilter}
    `, params)

    return successResponse({
      ...result.rows[0],
      currency: 'USD',
    })
  } catch (error) {
    console.error('Error fetching finance overview:', error)
    return errorResponse('Failed to fetch finance overview', 500)
  }
})
