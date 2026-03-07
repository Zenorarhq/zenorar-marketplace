import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// POST /api/cms/pages/[id]/versions/[versionId]/restore
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id, versionId } = await params

    // Get the version content
    const version = await executeQuery(
      `SELECT content, title FROM cms_page_versions WHERE id = $1 AND page_id = $2`,
      [versionId, id]
    )

    if (version.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 })
    }

    const versionData = version.rows[0]
    const content = typeof versionData.content === 'string' ? versionData.content : JSON.stringify(versionData.content)

    // Save current state as a new version before restoring
    const currentPage = await executeQuery(`SELECT title, content FROM cms_pages WHERE id = $1`, [id])
    if (currentPage.rows.length > 0) {
      const maxVersion = await executeQuery(
        `SELECT COALESCE(MAX(version), 0) as max_version FROM cms_page_versions WHERE page_id = $1`,
        [id]
      )
      const nextVersion = (maxVersion.rows[0]?.max_version || 0) + 1

      await executeQuery(
        `INSERT INTO cms_page_versions (page_id, version, title, content, author_id) VALUES ($1, $2, $3, $4, $5)`,
        [id, nextVersion, currentPage.rows[0].title + ' (before restore)', JSON.stringify(currentPage.rows[0].content), user.id]
      )
    }

    // Restore the version
    const result = await executeQuery(
      `UPDATE cms_pages SET content = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, slug, title, description, status, content, meta_title as "metaTitle", meta_description as "metaDescription", og_image as "ogImage", author_id as "authorId", published_at as "publishedAt", created_at as "createdAt", updated_at as "updatedAt"`,
      [content, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 })
    }

    const page = result.rows[0]
    page.content = typeof page.content === 'string' ? JSON.parse(page.content) : page.content

    return NextResponse.json({ success: true, data: page })
  } catch (error) {
    console.error('CMS page version restore error:', error)
    return NextResponse.json({ success: false, error: 'Failed to restore version' }, { status: 500 })
  }
}