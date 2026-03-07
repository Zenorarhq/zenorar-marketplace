import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// GET /api/cms/pages/[id]/versions/[versionId]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, versionId } = await params
    const result = await executeQuery(
      `SELECT v.id, v.page_id as "pageId", v.version, v.title, v.content, v.author_id as "authorId", v.created_at as "createdAt"
       FROM cms_page_versions v
       WHERE v.id = $1 AND v.page_id = $2`,
      [versionId, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 })
    }

    const row = result.rows[0]
    row.content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content

    return NextResponse.json({ success: true, data: row })
  } catch (error) {
    console.error('CMS page version error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load version' }, { status: 500 })
  }
}