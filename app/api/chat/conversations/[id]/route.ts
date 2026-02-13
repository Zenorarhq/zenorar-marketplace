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
      LEFT JOIN users u ON c."userId" = u.id
      LEFT JOIN users a ON c."assignedToId" = a.id
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
       LEFT JOIN users s ON m."senderId" = s.id
       WHERE m."conversationId" = $1
       ORDER BY m."createdAt" ASC`,
      [id]
    )

    const messages = msgResult.rows.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      senderType: m.senderType,
      senderId: m.senderId,
      senderName: m.sender_name || (m.senderType === 'USER' ? (conv.guestName || conv.guestEmail || 'Guest') : null),
      senderAvatar: m.sender_avatar,
      content: m.content,
      attachments: m.attachments || [],
      isRead: m.isRead,
      createdAt: m.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: conv.id,
        userId: conv.userId,
        user: conv.user_name ? { id: conv.userId, name: conv.user_name, email: conv.user_email, avatar: conv.user_avatar } : null,
        guestEmail: conv.guestEmail,
        guestName: conv.guestName,
        sessionId: conv.sessionId,
        status: conv.status,
        assignedTo: conv.assignedToId ? { id: conv.assignedToId, name: conv.agent_name, avatar: conv.agent_avatar } : null,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messages,
      },
    })
  } catch (error) {
    console.error('Chat conversation GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load conversation' }, { status: 500 })
  }
}
