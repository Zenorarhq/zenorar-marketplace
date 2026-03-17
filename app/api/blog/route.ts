export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/blog — List published blog posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    let where = `WHERE bp.status = 'PUBLISHED' AND bp.published_at <= NOW()`
    const params: any[] = []

    if (category) {
      params.push(category)
      where += ` AND EXISTS (
        SELECT 1 FROM blog_post_categories bpc2
        JOIN blog_categories bc2 ON bpc2.category_id = bc2.id
        WHERE bpc2.post_id = bp.id AND bc2.slug = $${params.length}
      )`
    }
    if (tag) {
      params.push(tag)
      where += ` AND EXISTS (
        SELECT 1 FROM blog_post_tags bpt2
        JOIN blog_tags bt2 ON bpt2.tag_id = bt2.id
        WHERE bpt2.post_id = bp.id AND bt2.slug = $${params.length}
      )`
    }
    if (search) {
      params.push(`%${search}%`)
      where += ` AND (bp.title ILIKE $${params.length} OR bp.excerpt ILIKE $${params.length})`
    }

    const countResult = await executeQuery(
      `SELECT COUNT(*) FROM blog_posts bp ${where}`, params
    )
    const total = parseInt(countResult.rows[0].count)

    params.push(limit, offset)
    const result = await executeQuery(
      `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.cover_image_url, bp.cover_image_alt,
        bp.author_name, bp.published_at, bp.created_at,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', bc.id, 'name', bc.name, 'slug', bc.slug))
          FILTER (WHERE bc.id IS NOT NULL), '[]'
        ) as categories,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', bt.id, 'name', bt.name, 'slug', bt.slug))
          FILTER (WHERE bt.id IS NOT NULL), '[]'
        ) as tags
      FROM blog_posts bp
      LEFT JOIN blog_post_categories bpc ON bp.id = bpc.post_id
      LEFT JOIN blog_categories bc ON bpc.category_id = bc.id
      LEFT JOIN blog_post_tags bpt ON bp.id = bpt.post_id
      LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
      ${where}
      GROUP BY bp.id
      ORDER BY bp.published_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('[Blog] List error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}