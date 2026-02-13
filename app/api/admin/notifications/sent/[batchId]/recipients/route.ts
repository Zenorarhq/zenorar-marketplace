import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(
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
  const { searchParams } = new URL(request.url)
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = (page - 1) * limit

  try {
    // Detect if this is a legacy notification (individual notification without batchId)
    const isLegacy = batchId.startsWith('legacy-')
    let result

    if (isLegacy) {
      // Extract notification ID from 'legacy-<uuid>' format
      const notificationId = batchId.substring(7)
      result = await executeQuery(
        `SELECT
          n.id,
          n."userId" as user_id,
          u.name,
          u.email,
          n."isRead" as is_read,
          n."readAt" as read_at,
          n."createdAt" as received_at
        FROM notifications n
        LEFT JOIN users u ON n."userId" = u.id
        WHERE n.id = $1
        ORDER BY n."createdAt" DESC
        LIMIT $2 OFFSET $3`,
        [notificationId, limit, offset]
      )
    } else {
      // Real batch - query by batchId
      result = await executeQuery(
        `SELECT
          n.id,
          n."userId" as user_id,
          u.name,
          u.email,
          n."isRead" as is_read,
          n."readAt" as read_at,
          n."createdAt" as received_at
        FROM notifications n
        LEFT JOIN users u ON n."userId" = u.id
        WHERE n.metadata->>'batchId' = $1
        ORDER BY n."createdAt" DESC
        LIMIT $2 OFFSET $3`,
        [batchId, limit, offset]
      )
    }

    const recipients = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      isRead: row.is_read,
      readAt: row.read_at,
      receivedAt: row.received_at,
    }))

    return NextResponse.json({ success: true, data: recipients })
  } catch (error) {
    console.error('Error fetching notification recipients:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch recipients' }, { status: 500 })
  }
}
