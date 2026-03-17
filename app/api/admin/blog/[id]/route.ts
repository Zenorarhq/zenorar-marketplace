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

// GET /api/admin/blog/[id] — Get single post for editing
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    if (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

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
      WHERE bp.id = $1
      GROUP BY bp.id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('[AdminBlog] Get error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch blog post' }, { status: 500 })
  }
}

// PATCH /api/admin/blog/[id] — Update blog post
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    if (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, excerpt, cover_image_url, cover_image_alt, og_image_url,
      seo_title, seo_description, status: postStatus, published_at, category_ids, tag_ids } = body

    // Build dynamic update
    const fields: string[] = []
    const values: any[] = []
    let idx = 1

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title) }
    if (body.slug !== undefined) {
      let slug = slugify(body.slug)
      const existing = await executeQuery('SELECT id FROM blog_posts WHERE slug = $1 AND id != $2', [slug, id])
      if (existing.rows.length > 0) slug = `${slug}-${Date.now().toString(36)}`
      fields.push(`slug = $${idx++}`); values.push(slug)
    }
    if (content !== undefined) { fields.push(`content = $${idx++}`); values.push(content) }
    if (excerpt !== undefined) { fields.push(`excerpt = $${idx++}`); values.push(excerpt) }
    if (cover_image_url !== undefined) { fields.push(`cover_image_url = $${idx++}`); values.push(cover_image_url || null) }
    if (cover_image_alt !== undefined) { fields.push(`cover_image_alt = $${idx++}`); values.push(cover_image_alt || null) }
    if (og_image_url !== undefined) { fields.push(`og_image_url = $${idx++}`); values.push(og_image_url || null) }
    if (seo_title !== undefined) { fields.push(`seo_title = $${idx++}`); values.push(seo_title || null) }
    if (seo_description !== undefined) { fields.push(`seo_description = $${idx++}`); values.push(seo_description || null) }
    if (postStatus !== undefined) {
      fields.push(`status = $${idx++}`); values.push(postStatus)
      // Auto-set published_at when publishing for the first time
      if (postStatus === 'PUBLISHED' && !published_at) {
        fields.push(`published_at = COALESCE(published_at, NOW())`)
      }
    }
    if (published_at !== undefined) { fields.push(`published_at = $${idx++}`); values.push(published_at) }

    if (fields.length === 0 && !category_ids && !tag_ids) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)

    const result = await executeTransaction(async (client) => {
      let post
      if (fields.length > 0) {
        const updateResult = await client.query(
          `UPDATE blog_posts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
          values
        )
        if (updateResult.rows.length === 0) {
          throw new Error('Post not found')
        }
        post = updateResult.rows[0]
      } else {
        const existing = await client.query('SELECT * FROM blog_posts WHERE id = $1', [id])
        if (existing.rows.length === 0) throw new Error('Post not found')
        post = existing.rows[0]
      }

      // Update categories if provided
      if (category_ids !== undefined) {
        await client.query('DELETE FROM blog_post_categories WHERE post_id = $1', [id])
        for (const catId of (category_ids || [])) {
          await client.query(
            'INSERT INTO blog_post_categories (post_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, catId]
          )
        }
      }

      // Update tags if provided
      if (tag_ids !== undefined) {
        await client.query('DELETE FROM blog_post_tags WHERE post_id = $1', [id])
        for (const tagId of (tag_ids || [])) {
          await client.query(
            'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, tagId]
          )
        }
      }

      return post
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    if (error.message === 'Post not found') {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }
    console.error('[AdminBlog] Update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update blog post' }, { status: 500 })
  }
}

// DELETE /api/admin/blog/[id] — Delete blog post
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    if (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const result = await executeQuery('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Post deleted' })
  } catch (error) {
    console.error('[AdminBlog] Delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete blog post' }, { status: 500 })
  }
}