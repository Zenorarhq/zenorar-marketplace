import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeTransaction } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// GET /api/chat/conversations — List conversations (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const unassigned = searchParams.get('unassigned')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const values: any[] = []
    let idx = 1

    if (status) {
      conditions.push(`c.status = $${idx++}`)
      values.push(status)
    }
    if (assignedTo) {
      conditions.push(`c."assignedToId" = $${idx++}`)
      values.push(assignedTo)
    }
    if (unassigned === 'true') {
      conditions.push(`c."assignedToId" IS NULL AND c.status = 'OPEN'`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count
    const countResult = await executeQuery(
      `SELECT COUNT(*) FROM chat_conversations c ${where}`,
      values
    )
    const total = parseInt(countResult.rows[0].count)

    // Conversations with last message and assigned agent name
    const result = await executeQuery(
      `SELECT c.*,
        u.name as user_name, u.email as user_email, u.avatar as user_avatar,
        a.name as agent_name, a.avatar as agent_avatar,
        (SELECT content FROM chat_messages WHERE "conversationId" = c.id ORDER BY "createdAt" DESC LIMIT 1) as last_message,
        (SELECT "createdAt" FROM chat_messages WHERE "conversationId" = c.id ORDER BY "createdAt" DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM chat_messages WHERE "conversationId" = c.id AND "isRead" = false AND "senderType" = 'USER') as unread_count
      FROM chat_conversations c
      LEFT JOIN users u ON c."userId" = u.id
      LEFT JOIN users a ON c."assignedToId" = a.id
      ${where}
      ORDER BY c."updatedAt" DESC
      LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    )

    const conversations = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      user: row.user_name ? { id: row.userId, name: row.user_name, email: row.user_email, avatar: row.user_avatar } : null,
      guestEmail: row.guestEmail,
      guestName: row.guestName,
      sessionId: row.sessionId,
      status: row.status,
      assignedTo: row.assignedToId ? { id: row.assignedToId, name: row.agent_name, avatar: row.agent_avatar } : null,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unreadCount: parseInt(row.unread_count) || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      data: conversations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Chat conversations GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load conversations' }, { status: 500 })
  }
}

// POST /api/chat/conversations — Create new conversation (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestEmail, guestName, sessionId, initialMessage } = body

    // Try to get authenticated user
    const user = await authenticateRequest(request)

    if (!user && !guestEmail) {
      return NextResponse.json({ success: false, error: 'Email is required for guest users' }, { status: 400 })
    }
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 })
    }
    if (!initialMessage?.trim()) {
      return NextResponse.json({ success: false, error: 'Initial message is required' }, { status: 400 })
    }

    // Check if chat is online
    const settingsResult = await executeQuery('SELECT "isOnline", "offlineMessage" FROM chat_settings LIMIT 1')
    const isOnline = settingsResult.rows[0]?.isOnline ?? true
    const offlineMessage = settingsResult.rows[0]?.offlineMessage || "We're currently offline. We'll reach out via email when we're back, or you can create a support ticket."

    const result = await executeTransaction(async (client) => {
      // Create conversation
      const convResult = await client.query(
        `INSERT INTO chat_conversations ("userId", "guestEmail", "guestName", "sessionId", status)
         VALUES ($1, $2, $3, $4, 'OPEN')
         RETURNING *`,
        [user?.id || null, user ? null : guestEmail, user ? null : guestName, sessionId]
      )
      const conversation = convResult.rows[0]

      // Insert initial user message
      await client.query(
        `INSERT INTO chat_messages ("conversationId", "senderType", "senderId", content)
         VALUES ($1, 'USER', $2, $3)`,
        [conversation.id, user?.id || null, initialMessage.trim()]
      )

      // If offline, insert system auto-reply
      if (!isOnline) {
        await client.query(
          `INSERT INTO chat_messages ("conversationId", "senderType", content)
           VALUES ($1, 'SYSTEM', $2)`,
          [conversation.id, offlineMessage]
        )
      }

      return conversation
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        isOnline,
        createdAt: result.createdAt,
      },
    })
  } catch (error) {
    console.error('Chat conversations POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 })
  }
}
