export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery, executeTransaction } from '@/lib/db-helpers'

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// GET /api/admin/blog — List all blog posts (any status)
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    if (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      params.push(status)
      where += ` AND bp.status = $${params.length}`
    }
    if (search) {
      params.push(`%${search}%`)
      where += ` AND (bp.title ILIKE $${params.length} OR bp.excerpt ILIKE $${params.length})`
    }

    // Count
    const countResult = await executeQuery(
      `SELECT COUNT(*) FROM blog_posts bp ${where}`, params
    )
    const total = parseInt(countResult.rows[0].count)

    // Fetch posts with categories
    params.push(limit, offset)
    const result = await executeQuery(
      `SELECT bp.*,
        COALESCE(
          json_agg(json_build_object('id', bc.id, 'name', bc.name, 'slug', bc.slug))
          FILTER (WHERE bc.id IS NOT NULL), '[]'
        ) as categories
      FROM blog_posts bp
      LEFT JOIN blog_post_categories bpc ON bp.id = bpc.post_id
      LEFT JOIN blog_categories bc ON bpc.category_id = bc.id
      ${where}
      GROUP BY bp.id
      ORDER BY bp.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('[AdminBlog] List error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}

// POST /api/admin/blog — Create a new blog post
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    if (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, excerpt, cover_image_url, cover_image_alt, og_image_url,
      seo_title, seo_description, status: postStatus, published_at, category_ids, tag_ids } = body

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    let slug = body.slug || slugify(title)

    // Ensure unique slug
    const existing = await executeQuery('SELECT id FROM blog_posts WHERE slug = $1', [slug])
    if (existing.rows.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const finalStatus = postStatus || 'DRAFT'
    const publishedAt = finalStatus === 'PUBLISHED' ? (published_at || new Date().toISOString()) : (published_at || null)

    const result = await executeTransaction(async (client) => {
      // Insert post
      const postResult = await client.query(
        `INSERT INTO blog_posts (title, slug, content, excerpt, cover_image_url, cover_image_alt,
          og_image_url, seo_title, seo_description, author_name, author_id, status, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [title, slug, content || '', excerpt || '', cover_image_url || null, cover_image_alt || null,
          og_image_url || null, seo_title || null, seo_description || null,
          user.name, user.id, finalStatus, publishedAt]
      )
      const post = postResult.rows[0]

      // Insert category links
      if (category_ids?.length) {
        for (const catId of category_ids) {
          await client.query(
            'INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [post.id, catId]
          )
        }
      }

      // Insert tag links
      if (tag_ids?.length) {
        for (const tagId of tag_ids) {
          await client.query(
            'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [post.id, tagId]
          )
        }
      }

      return post
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('[AdminBlog] Create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create blog post' }, { status: 500 })
  }
}