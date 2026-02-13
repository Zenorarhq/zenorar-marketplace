import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// PATCH /api/chat/conversations/[id]/status — Update conversation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { status } = await request.json()

    const validStatuses = ['OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    await executeQuery(
      `UPDATE chat_conversations SET status = $1 WHERE id = $2`,
      [status, id]
    )

    // Insert system message for status changes
    const statusLabels: Record<string, string> = {
      RESOLVED: `${user.name} marked this conversation as resolved`,
      CLOSED: `${user.name} closed this conversation`,
      OPEN: `${user.name} reopened this conversation`,
    }
    if (statusLabels[status]) {
      await executeQuery(
        `INSERT INTO chat_messages (conversation_id, sender_type, content)
         VALUES ($1, 'SYSTEM', $2)`,
        [id, statusLabels[status]]
      )
    }

    return NextResponse.json({ success: true, data: { status } })
  } catch (error) {
    console.error('Chat status PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update status' }, { status: 500 })
  }
}
