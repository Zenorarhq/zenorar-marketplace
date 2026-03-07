import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// GET /api/cms/pages/[id]/versions
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await executeQuery(
      `SELECT v.id, v.page_id as "pageId", v.version, v.title, v.author_id as "authorId", v.created_at as "createdAt"
       FROM cms_page_versions v
       WHERE v.page_id = $1
       ORDER BY v.version DESC
       LIMIT 50`,
      [id]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('CMS page versions error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load versions' }, { status: 500 })
  }
}