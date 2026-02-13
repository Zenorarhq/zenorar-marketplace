import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/chat/conversations/[id] — Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get conversation
    const convResult = await executeQuery(
      `SELECT c.*,
        u.name as user_name, u.email as user_email, u.avatar as user_avatar,
        a.name as agent_name, a.avatar as agent_avatar
      FROM chat_conversations c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users a ON c.assigned_to = a.id
      WHERE c.id = $1`,
      [id]
    )

    if (convResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 })
    }

    const conv = convResult.rows[0]

    // Get messages
    const msgResult = await executeQuery(
      `SELECT m.*, s.name as sender_name, s.avatar as sender_avatar
       FROM chat_messages m
       LEFT JOIN users s ON m.sender_id = s.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    )

    const messages = msgResult.rows.map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderType: m.sender_type,
      senderId: m.sender_id,
      senderName: m.sender_name || (m.sender_type === 'USER' ? (conv.guest_name || conv.guest_email || 'Guest') : null),
      senderAvatar: m.sender_avatar,
      content: m.content,
      attachments: m.attachments || [],
      isRead: m.is_read,
      createdAt: m.created_at,
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: conv.id,
        userId: conv.user_id,
        user: conv.user_name ? { id: conv.user_id, name: conv.user_name, email: conv.user_email, avatar: conv.user_avatar } : null,
        guestEmail: conv.guest_email,
        guestName: conv.guest_name,
        sessionId: conv.session_id,
        status: conv.status,
        assignedTo: conv.assigned_to ? { id: conv.assigned_to, name: conv.agent_name, avatar: conv.agent_avatar } : null,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        messages,
      },
    })
  } catch (error) {
    console.error('Chat conversation GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load conversation' }, { status: 500 })
  }
}
