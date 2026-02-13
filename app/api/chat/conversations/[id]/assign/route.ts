import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// POST /api/chat/conversations/[id]/assign — Assign conversation to agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const agentId = body.agentId || user.id // Default: assign to self

    // Check conversation exists and current assignment
    const convResult = await executeQuery(
      `SELECT c.assigned_to, a.name as agent_name
       FROM chat_conversations c
       LEFT JOIN users a ON c.assigned_to = a.id
       WHERE c.id = $1`,
      [id]
    )

    if (convResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 })
    }

    const conv = convResult.rows[0]

    // Prevent double-assignment (unless admin is reassigning)
    if (conv.assigned_to && conv.assigned_to !== agentId) {
      return NextResponse.json({
        success: false,
        error: `Already assigned to ${conv.agent_name}`,
        data: { assignedTo: { id: conv.assigned_to, name: conv.agent_name } },
      }, { status: 409 })
    }

    // Assign
    await executeQuery(
      `UPDATE chat_conversations SET assigned_to = $1, status = 'ASSIGNED' WHERE id = $2`,
      [agentId, id]
    )

    // Insert system message
    await executeQuery(
      `INSERT INTO chat_messages (conversation_id, sender_type, content)
       VALUES ($1, 'SYSTEM', $2)`,
      [id, `${user.name} picked up this conversation`]
    )

    return NextResponse.json({ success: true, data: { assignedTo: agentId } })
  } catch (error) {
    console.error('Chat assign error:', error)
    return NextResponse.json({ success: false, error: 'Failed to assign conversation' }, { status: 500 })
  }
}
