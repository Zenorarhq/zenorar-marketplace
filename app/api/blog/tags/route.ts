export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/blog/tags — Public list of tags with post counts
export async function GET() {
  try {
    const result = await executeQuery(
      `SELECT bt.id, bt.name, bt.slug, COUNT(bpt.post_id) as post_count
      FROM blog_tags bt
      LEFT JOIN blog_post_tags bpt ON bt.id = bpt.tag_id
      LEFT JOIN blog_posts bp ON bpt.post_id = bp.id AND bp.status = 'PUBLISHED' AND bp.published_at <= NOW()
      GROUP BY bt.id
      HAVING COUNT(bpt.post_id) > 0
      ORDER BY bt.name`
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('[Blog] Tags error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch tags' }, { status: 500 })
  }
}