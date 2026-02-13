import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// GET /api/chat/stats — Chat stats for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const result = await executeQuery(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'OPEN') as open,
        COUNT(*) FILTER (WHERE status = 'ASSIGNED') as assigned,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as closed,
        COUNT(*) FILTER (WHERE status = 'OPEN' AND "assignedToId" IS NULL) as unassigned
      FROM chat_conversations
    `)

    const unreadResult = await executeQuery(`
      SELECT COUNT(*) as unread
      FROM chat_messages
      WHERE "isRead" = false AND "senderType" = 'USER'
    `)

    const stats = result.rows[0]
    return NextResponse.json({
      success: true,
      data: {
        total: parseInt(stats.total) || 0,
        open: parseInt(stats.open) || 0,
        assigned: parseInt(stats.assigned) || 0,
        resolved: parseInt(stats.resolved) || 0,
        closed: parseInt(stats.closed) || 0,
        unassigned: parseInt(stats.unassigned) || 0,
        unread: parseInt(unreadResult.rows[0].unread) || 0,
      },
    })
  } catch (error) {
    console.error('Chat stats error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load stats' }, { status: 500 })
  }
}
