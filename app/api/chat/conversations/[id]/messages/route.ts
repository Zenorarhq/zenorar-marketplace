import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// GET /api/chat/conversations/[id]/messages — Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const after = searchParams.get('after') // For polling: only get messages after this timestamp

    let query = `
      SELECT m.*, s.name as sender_name, s.avatar as sender_avatar
      FROM chat_messages m
      LEFT JOIN users s ON m.sender_id = s.id
      WHERE m.conversation_id = $1
    `
    const values: any[] = [id]

    if (after) {
      query += ` AND m.created_at > $2`
      values.push(after)
    }

    query += ` ORDER BY m.created_at ASC`

    const result = await executeQuery(query, values)

    const messages = result.rows.map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderType: m.sender_type,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderAvatar: m.sender_avatar,
      content: m.content,
      attachments: m.attachments || [],
      isRead: m.is_read,
      createdAt: m.created_at,
    }))

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error('Chat messages GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load messages' }, { status: 500 })
  }
}

// POST /api/chat/conversations/[id]/messages — Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { content, attachments } = body

    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 })
    }

    // Check conversation exists
    const convResult = await executeQuery(
      'SELECT id, status, assigned_to FROM chat_conversations WHERE id = $1',
      [id]
    )
    if (convResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 })
    }

    const conversation = convResult.rows[0]

    // Determine sender type
    const user = await authenticateRequest(request)
    const isAgent = user && (user.role === 'ADMIN' || user.role === 'EDITOR')
    const senderType = isAgent ? 'AGENT' : 'USER'

    // Insert message
    const msgResult = await executeQuery(
      `INSERT INTO chat_messages (conversation_id, sender_type, sender_id, content, attachments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, senderType, user?.id || null, content?.trim() || '', JSON.stringify(attachments || [])]
    )

    // If agent is sending and conversation is unassigned, auto-assign
    if (isAgent && !conversation.assigned_to) {
      await executeQuery(
        `UPDATE chat_conversations SET assigned_to = $1, status = 'ASSIGNED' WHERE id = $2`,
        [user.id, id]
      )
    }

    // Mark user messages as read when agent replies
    if (isAgent) {
      await executeQuery(
        `UPDATE chat_messages SET is_read = true WHERE conversation_id = $1 AND sender_type = 'USER' AND is_read = false`,
        [id]
      )
    }

    const msg = msgResult.rows[0]
    return NextResponse.json({
      success: true,
      data: {
        id: msg.id,
        conversationId: msg.conversation_id,
        senderType: msg.sender_type,
        senderId: msg.sender_id,
        senderName: user?.name || null,
        content: msg.content,
        attachments: msg.attachments || [],
        isRead: msg.is_read,
        createdAt: msg.created_at,
      },
    })
  } catch (error) {
    console.error('Chat messages POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 })
  }
}
