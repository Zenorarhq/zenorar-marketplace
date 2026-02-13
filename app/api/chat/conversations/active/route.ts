import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/chat/conversations/active — Find active conversation for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 })
    }

    // Find the most recent non-closed conversation for this session
    const result = await executeQuery(
      `SELECT id, status, "createdAt"
       FROM chat_conversations
       WHERE "sessionId" = $1 AND status IN ('OPEN', 'ASSIGNED')
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [sessionId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, data: null })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        createdAt: result.rows[0].createdAt,
      },
    })
  } catch (error) {
    console.error('Active conversation GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to find active conversation' }, { status: 500 })
  }
}
