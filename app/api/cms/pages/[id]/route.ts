import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

const PAGE_COLUMNS = `id, slug, title, description, status, content, meta_title as "metaTitle", meta_description as "metaDescription", og_image as "ogImage", author_id as "authorId", published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt"`

function parsePageRow(row: any) {
  return { ...row, content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content }
}

// GET /api/cms/pages/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await executeQuery(`SELECT ${PAGE_COLUMNS} FROM cms_pages WHERE id = $1`, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: parsePageRow(result.rows[0]) })
  } catch (error) {
    console.error('CMS page get error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load page' }, { status: 500 })
  }
}

// PUT /api/cms/pages/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Build dynamic update query
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (body.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(body.title) }
    if (body.slug !== undefined) { fields.push(`slug = $${paramIndex++}`); values.push(body.slug) }
    if (body.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(body.description) }
    if (body.content !== undefined) { fields.push(`content = $${paramIndex++}`); values.push(JSON.stringify(body.content)) }
    if (body.metaTitle !== undefined) { fields.push(`meta_title = $${paramIndex++}`); values.push(body.metaTitle) }
    if (body.metaDescription !== undefined) { fields.push(`meta_description = $${paramIndex++}`); values.push(body.metaDescription) }
    if (body.ogImage !== undefined) { fields.push(`og_image = $${paramIndex++}`); values.push(body.ogImage) }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const result = await executeQuery(
      `UPDATE cms_pages SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING ${PAGE_COLUMNS}`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: parsePageRow(result.rows[0]) })
  } catch (error) {
    console.error('CMS page update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update page' }, { status: 500 })
  }
}

// DELETE /api/cms/pages/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch slug before deleting so we can revalidate the cached public route
    const existing = await executeQuery(`SELECT slug FROM cms_pages WHERE id = $1`, [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 })
    }
    const slug = existing.rows[0].slug

    await executeQuery(`DELETE FROM cms_pages WHERE id = $1`, [id])

    // Purge the Next.js cache for this page so it 404s immediately
    revalidatePath(`/p/${slug}`)

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('CMS page delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete page' }, { status: 500 })
  }
}
