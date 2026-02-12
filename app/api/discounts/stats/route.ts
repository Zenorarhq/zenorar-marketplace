import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/discounts/stats — Aggregate statistics (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const result = await executeQuery(`
      SELECT
        COUNT(*)::int AS "totalCodes",
        COUNT(*) FILTER (WHERE "isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > NOW()))::int AS "activeCodes",
        COALESCE(SUM("usageCount"), 0)::int AS "totalUsage"
      FROM discounts
    `)

    const savingsResult = await executeQuery(`
      SELECT COALESCE(SUM("discountAmount"), 0)::float AS "totalSavings"
      FROM orders
      WHERE "discountAmount" > 0
    `)

    return successResponse({
      ...result.rows[0],
      totalSavings: savingsResult.rows[0].totalSavings
    })
  } catch (error) {
    console.error('Error fetching discount stats:', error)
    return errorResponse('Failed to fetch discount stats', 500)
  }
})
