export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/blog/categories — Public list of categories with post counts
export async function GET() {
  try {
    const result = await executeQuery(
      `SELECT bc.id, bc.name, bc.slug, COUNT(bpc.post_id) as post_count
      FROM blog_categories bc
      LEFT JOIN blog_post_categories bpc ON bc.id = bpc.category_id
      LEFT JOIN blog_posts bp ON bpc.post_id = bp.id AND bp.status = 'PUBLISHED' AND bp.published_at <= NOW()
      GROUP BY bc.id
      HAVING COUNT(bpc.post_id) > 0
      ORDER BY bc.name`
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('[Blog] Categories error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}