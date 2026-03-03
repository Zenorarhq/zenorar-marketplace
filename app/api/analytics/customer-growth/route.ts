export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/analytics/customer-growth — Daily customer signups (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(Number(searchParams.get('days')) || 30, 90)

    const result = await executeQuery(
      `SELECT DATE("createdAt") as date, COUNT(*)::int as signups
       FROM users
       WHERE "createdAt" >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE("createdAt")
       ORDER BY date`,
      [days]
    )

    // Fill gaps with 0 for days with no signups
    const dataMap = new Map(result.rows.map((r: any) => [r.date.toISOString().split('T')[0], r.signups]))
    const filled = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      filled.push({ date: key, signups: dataMap.get(key) || 0 })
    }

    return successResponse(filled)
  } catch (error) {
    console.error('Error fetching customer growth:', error)
    return errorResponse('Failed to fetch customer growth', 500)
  }
})
