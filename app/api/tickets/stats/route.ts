import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export const dynamic = 'force-dynamic'

// GET /api/tickets/stats — Ticket statistics (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    // Total count
    const totalResult = await executeQuery(`SELECT COUNT(*)::int AS total FROM tickets`)

    // By status
    const byStatusResult = await executeQuery(`
      SELECT status, COUNT(*)::int AS count
      FROM tickets
      GROUP BY status
      ORDER BY count DESC
    `)

    // By priority
    const byPriorityResult = await executeQuery(`
      SELECT priority, COUNT(*)::int AS count
      FROM tickets
      GROUP BY priority
      ORDER BY count DESC
    `)

    // By category (column may not exist in all DB setups)
    let byCategoryRows: any[] = []
    try {
      const byCategoryResult = await executeQuery(`
        SELECT category, COUNT(*)::int AS count
        FROM tickets
        GROUP BY category
        ORDER BY count DESC
      `)
      byCategoryRows = byCategoryResult.rows
    } catch { /* column may not exist */ }

    // Average resolution time (column may not exist in all DB setups)
    let avgResolutionTime = 0
    try {
      const avgTimeResult = await executeQuery(`
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600), 0
        )::float AS "avgResolutionTime"
        FROM tickets
        WHERE "resolvedAt" IS NOT NULL
      `)
      avgResolutionTime = Math.round(avgTimeResult.rows[0].avgResolutionTime * 10) / 10
    } catch { /* column may not exist */ }

    return successResponse({
      total: totalResult.rows[0].total,
      byStatus: byStatusResult.rows,
      byCategory: byCategoryRows,
      byPriority: byPriorityResult.rows,
      avgResolutionTime,
    })
  } catch (error) {
    console.error('Error fetching ticket stats:', error)
    return errorResponse('Failed to fetch ticket stats', 500)
  }
})
