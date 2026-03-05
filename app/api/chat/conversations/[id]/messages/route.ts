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

    // Verify access: must be conversation owner, matching session, or admin
    const user = await authenticateRequest(request)
    const sessionId = request.headers.get('x-session-id')
    const convCheck = await executeQuery(
      'SELECT "userId", "sessionId" FROM chat_conversations WHERE id = $1',
      [id]
    )
    if (convCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 })
    }
    const conv = convCheck.rows[0]
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'EDITOR')
    if (!isAdmin && conv.userId !== user?.id && conv.sessionId !== sessionId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const after = searchParams.get('after') // For polling: only get messages after this timestamp

    let query = `
      SELECT m.*, s.name as sender_name, s.avatar as sender_avatar
      FROM chat_messages m
      LEFT JOIN users s ON m."senderId" = s.id
      WHERE m."conversationId" = $1
    `
    const values: any[] = [id]

    if (after) {
      query += ` AND m."createdAt" > $2`
      values.push(after)
    }

    query += ` ORDER BY m."createdAt" ASC`

    const result = await executeQuery(query, values)

    const messages = result.rows.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      senderType: m.senderType,
      senderId: m.senderId,
      senderName: m.sender_name,
      senderAvatar: m.sender_avatar,
      content: m.content,
      attachments: m.attachments || [],
      isRead: m.isRead,
      createdAt: m.createdAt,
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
      'SELECT id, status, "assignedToId" FROM chat_conversations WHERE id = $1',
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
      `INSERT INTO chat_messages ("conversationId", "senderType", "senderId", content, attachments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, senderType, user?.id || null, content?.trim() || '', JSON.stringify(attachments || [])]
    )

    // If agent is sending and conversation is unassigned, auto-assign
    if (isAgent && !conversation.assignedToId) {
      await executeQuery(
        `UPDATE chat_conversations SET "assignedToId" = $1, status = 'ASSIGNED' WHERE id = $2`,
        [user.id, id]
      )
    }

    // Mark user messages as read when agent replies
    if (isAgent) {
      await executeQuery(
        `UPDATE chat_messages SET "isRead" = true WHERE "conversationId" = $1 AND "senderType" = 'USER' AND "isRead" = false`,
        [id]
      )
    }

    const msg = msgResult.rows[0]
    return NextResponse.json({
      success: true,
      data: {
        id: msg.id,
        conversationId: msg.conversationId,
        senderType: msg.senderType,
        senderId: msg.senderId,
        senderName: user?.name || null,
        content: msg.content,
        attachments: msg.attachments || [],
        isRead: msg.isRead,
        createdAt: msg.createdAt,
      },
    })
  } catch (error) {
    console.error('Chat messages POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 })
  }
}
