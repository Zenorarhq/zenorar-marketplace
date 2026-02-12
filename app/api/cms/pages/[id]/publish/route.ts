import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// PATCH /api/cms/pages/[id]/publish
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await executeQuery(
      `UPDATE cms_pages SET status = 'PUBLISHED', published_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, slug, title, status, published_at as "publishedAt"`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('CMS page publish error:', error)
    return NextResponse.json({ success: false, error: 'Failed to publish page' }, { status: 500 })
  }
}
