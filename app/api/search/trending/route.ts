export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    // Return names of popular/featured products as trending search terms
    const result = await executeQuery(`
      SELECT p.name
      FROM products p
      LEFT JOIN order_items oi ON oi."productId" = p.id
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name, p."isFeatured", p."createdAt"
      ORDER BY p."isFeatured" DESC, COALESCE(SUM(oi.quantity), 0) DESC, p."createdAt" DESC
      LIMIT $1
    `, [limit])

    const data = result.rows.map(row => row.name)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Trending search error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load trending' }, { status: 500 })
  }
}
