import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// GET /api/cms/pages - List pages
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = `SELECT id, slug, title, description, status, content, meta_title as "metaTitle", meta_description as "metaDescription", og_image as "ogImage", author_id as "authorId", published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt" FROM cms_pages`
    const params: any[] = []

    if (status) {
      params.push(status)
      query += ` WHERE status = $${params.length}`
    }

    query += ` ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await executeQuery(query, params)

    // Parse content from JSONB
    const pages = result.rows.map(row => ({
      ...row,
      content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
    }))

    return NextResponse.json({ success: true, data: pages })
  } catch (error) {
    console.error('CMS pages list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load pages' }, { status: 500 })
  }
}

// POST /api/cms/pages - Create page
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { slug, title, description, content } = await request.json()

    if (!slug || !title) {
      return NextResponse.json({ success: false, error: 'Slug and title are required' }, { status: 400 })
    }

    const result = await executeQuery(
      `INSERT INTO cms_pages (slug, title, description, content, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, slug, title, description, status, content, meta_title as "metaTitle", meta_description as "metaDescription", og_image as "ogImage", author_id as "authorId", published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt"`,
      [slug, title, description || null, JSON.stringify(content || []), user.id]
    )

    const page = result.rows[0]
    page.content = typeof page.content === 'string' ? JSON.parse(page.content) : page.content

    return NextResponse.json({ success: true, data: page })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A page with this slug already exists' }, { status: 409 })
    }
    console.error('CMS page create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create page' }, { status: 500 })
  }
}
