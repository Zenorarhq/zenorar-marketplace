import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// POST /api/cms/pages/[id]/duplicate
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the original page
    const original = await executeQuery(`SELECT * FROM cms_pages WHERE id = $1`, [id])
    if (original.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 })
    }

    const page = original.rows[0]
    const newSlug = `${page.slug}-copy-${Date.now()}`
    const newTitle = `${page.title} (Copy)`

    const result = await executeQuery(
      `INSERT INTO cms_pages (slug, title, description, content, meta_title, meta_description, og_image, author_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, slug, title, description, status, content, meta_title as "metaTitle", meta_description as "metaDescription", og_image as "ogImage", author_id as "authorId", published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt"`,
      [newSlug, newTitle, page.description, JSON.stringify(page.content), page.meta_title, page.meta_description, page.og_image, user.id]
    )

    const newPage = result.rows[0]
    newPage.content = typeof newPage.content === 'string' ? JSON.parse(newPage.content) : newPage.content

    return NextResponse.json({ success: true, data: newPage })
  } catch (error) {
    console.error('CMS page duplicate error:', error)
    return NextResponse.json({ success: false, error: 'Failed to duplicate page' }, { status: 500 })
  }
}
