export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// DELETE /api/admin/blog/tags/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    if (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const result = await executeQuery('DELETE FROM blog_tags WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Tag deleted' })
  } catch (error) {
    console.error('[AdminBlog] Tag delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete tag' }, { status: 500 })
  }
}