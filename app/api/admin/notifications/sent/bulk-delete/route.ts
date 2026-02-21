import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { batchIds } = body as { batchIds: string[] }

  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return NextResponse.json({ success: false, error: 'No batch IDs provided' }, { status: 400 })
  }

  try {
    const legacyIds = batchIds.filter((id) => id.startsWith('legacy-')).map((id) => id.substring(7))
    const realBatchIds = batchIds.filter((id) => !id.startsWith('legacy-'))

    let totalDeleted = 0

    if (legacyIds.length > 0) {
      const result = await executeQuery(
        `DELETE FROM notifications WHERE id = ANY($1)`,
        [legacyIds]
      )
      totalDeleted += result.rowCount ?? 0
    }

    if (realBatchIds.length > 0) {
      const result = await executeQuery(
        `DELETE FROM notifications WHERE metadata->>'batchId' = ANY($1)`,
        [realBatchIds]
      )
      totalDeleted += result.rowCount ?? 0
    }

    return NextResponse.json({
      success: true,
      data: { count: totalDeleted },
    })
  } catch (error) {
    console.error('Error bulk deleting notifications:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete notifications' }, { status: 500 })
  }
}
