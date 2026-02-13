import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { batchId } = await params

  try {
    // Detect if this is a legacy notification (individual notification without batchId)
    const isLegacy = batchId.startsWith('legacy-')
    let result

    if (isLegacy) {
      // Extract notification ID from 'legacy-<uuid>' format
      const notificationId = batchId.substring(7)
      result = await executeQuery(
        `DELETE FROM notifications WHERE id = $1`,
        [notificationId]
      )
    } else {
      // Real batch - delete by batchId
      result = await executeQuery(
        `DELETE FROM notifications WHERE metadata->>'batchId' = $1`,
        [batchId]
      )
    }

    return NextResponse.json({
      success: true,
      data: { message: `Deleted ${result.rowCount} notifications`, count: result.rowCount },
    })
  } catch (error) {
    console.error('Error deleting notification batch:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete notification batch' }, { status: 500 })
  }
}
