export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/blog/[slug] — Get single published post
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const result = await executeQuery(
      `SELECT bp.*,
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
      WHERE bp.slug = $1 AND bp.status = 'PUBLISHED' AND bp.published_at <= NOW()
      GROUP BY bp.id`,
      [slug]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    // Fetch related posts (same category, exclude current)
    const post = result.rows[0]
    const categories = typeof post.categories === 'string' ? JSON.parse(post.categories) : post.categories
    let relatedPosts: any[] = []

    if (categories.length > 0) {
      const catIds = categories.map((c: any) => c.id)
      const relatedResult = await executeQuery(
        `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.cover_image_url, bp.cover_image_alt,
          bp.author_name, bp.published_at
        FROM blog_posts bp
        JOIN blog_post_categories bpc ON bp.id = bpc.post_id
        WHERE bpc.category_id = ANY($1)
          AND bp.id != $2
          AND bp.status = 'PUBLISHED'
          AND bp.published_at <= NOW()
        GROUP BY bp.id
        ORDER BY bp.published_at DESC
        LIMIT 3`,
        [catIds, post.id]
      )
      relatedPosts = relatedResult.rows
    }

    return NextResponse.json({ success: true, data: { ...post, relatedPosts } })
  } catch (error) {
    console.error('[Blog] Get error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch blog post' }, { status: 500 })
  }
}