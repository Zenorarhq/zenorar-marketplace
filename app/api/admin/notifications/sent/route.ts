import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const type = searchParams.get('type')
  const offset = (page - 1) * limit

  try {
    const params: any[] = []
    let paramIndex = 1

    // Build WHERE clause for type filter (used in both parts of UNION)
    const typeFilter = type ? `type = $${paramIndex}::"NotificationType"` : '1=1'
    if (type) {
      params.push(type)
      paramIndex++
    }

    // UNION query: legacy notifications + real batches
    const query = `
      SELECT * FROM (
        -- Legacy notifications (without batchId) - each notification is its own batch
        SELECT
          'legacy-' || id::text as batch_id,
          metadata->>'sentBy' as sent_by_id,
          type,
          title,
          message,
          "createdAt" as sent_at,
          1 as total_recipients,
          CASE WHEN "isRead" = false THEN 1 ELSE 0 END as unread_count,
          CASE WHEN "isRead" = true THEN 1 ELSE 0 END as read_count
        FROM notifications
        WHERE metadata->>'batchId' IS NULL AND ${typeFilter}

        UNION ALL

        -- Real batches (with batchId) - grouped by batchId
        SELECT
          metadata->>'batchId' as batch_id,
          metadata->>'sentBy' as sent_by_id,
          type,
          title,
          message,
          MIN("createdAt") as sent_at,
          COUNT(DISTINCT "userId")::int as total_recipients,
          COUNT(CASE WHEN "isRead" = false THEN 1 END)::int as unread_count,
          COUNT(CASE WHEN "isRead" = true THEN 1 END)::int as read_count
        FROM notifications
        WHERE metadata->>'batchId' IS NOT NULL AND ${typeFilter}
        GROUP BY metadata->>'batchId', metadata->>'sentBy', type, title, message
      ) combined
      ORDER BY sent_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const result = await executeQuery(query, params)

    const batches = result.rows.map((row: any) => ({
      batchId: row.batch_id,
      sentBy: row.sent_by_id,
      type: row.type,
      title: row.title,
      message: row.message,
      sentAt: row.sent_at,
      stats: {
        total: parseInt(row.total_recipients),
        unread: parseInt(row.unread_count),
        read: parseInt(row.read_count),
      },
    }))

    return NextResponse.json({ success: true, data: batches })
  } catch (error) {
    console.error('Error fetching sent notifications:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch sent notifications' }, { status: 500 })
  }
}
