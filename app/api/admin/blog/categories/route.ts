export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// GET /api/admin/blog/categories
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    if (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const result = await executeQuery(
      `SELECT bc.*, COUNT(bpc.post_id) as post_count
      FROM blog_categories bc
      LEFT JOIN blog_post_categories bpc ON bc.id = bpc.category_id
      GROUP BY bc.id
      ORDER BY bc.name`
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('[AdminBlog] Categories list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/admin/blog/categories
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    if (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { name } = await request.json()
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })

    const slug = slugify(name)
    const result = await executeQuery(
      'INSERT INTO blog_categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING RETURNING *',
      [name, slug]
    )

    if (result.rows.length === 0) {
      // Already exists, return existing
      const existing = await executeQuery('SELECT * FROM blog_categories WHERE slug = $1', [slug])
      return NextResponse.json({ success: true, data: existing.rows[0] })
    }

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('[AdminBlog] Category create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 })
  }
}