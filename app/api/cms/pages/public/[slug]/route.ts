import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/cms/pages/public/[slug] - Public route, no auth required
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const result = await executeQuery(
      `SELECT id, slug, title, description, status, content, meta_title as "metaTitle", meta_description as "metaDescription", og_image as "ogImage", author_id as "authorId", published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt" FROM cms_pages WHERE slug = $1 AND status = 'PUBLISHED'`,
      [slug]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 })
    }

    const page = result.rows[0]
    page.content = typeof page.content === 'string' ? JSON.parse(page.content) : page.content

    return NextResponse.json({ success: true, data: page })
  } catch (error) {
    console.error('CMS public page error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load page' }, { status: 500 })
  }
}
