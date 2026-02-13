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
      conditions.push(`c.assigned_to = $${idx++}`)
      values.push(assignedTo)
    }
    if (unassigned === 'true') {
      conditions.push(`c.assigned_to IS NULL AND c.status = 'OPEN'`)
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
        (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND is_read = false AND sender_type = 'USER') as unread_count
      FROM chat_conversations c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users a ON c.assigned_to = a.id
      ${where}
      ORDER BY c.updated_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    )

    const conversations = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      user: row.user_name ? { id: row.user_id, name: row.user_name, email: row.user_email, avatar: row.user_avatar } : null,
      guestEmail: row.guest_email,
      guestName: row.guest_name,
      sessionId: row.session_id,
      status: row.status,
      assignedTo: row.assigned_to ? { id: row.assigned_to, name: row.agent_name, avatar: row.agent_avatar } : null,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unreadCount: parseInt(row.unread_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
    const settingsResult = await executeQuery('SELECT is_online, offline_message FROM chat_settings LIMIT 1')
    const isOnline = settingsResult.rows[0]?.is_online ?? true
    const offlineMessage = settingsResult.rows[0]?.offline_message || "We're currently offline. We'll reach out via email when we're back, or you can create a support ticket."

    const result = await executeTransaction(async (client) => {
      // Create conversation
      const convResult = await client.query(
        `INSERT INTO chat_conversations (user_id, guest_email, guest_name, session_id, status)
         VALUES ($1, $2, $3, $4, 'OPEN')
         RETURNING *`,
        [user?.id || null, user ? null : guestEmail, user ? null : guestName, sessionId]
      )
      const conversation = convResult.rows[0]

      // Insert initial user message
      await client.query(
        `INSERT INTO chat_messages (conversation_id, sender_type, sender_id, content)
         VALUES ($1, 'USER', $2, $3)`,
        [conversation.id, user?.id || null, initialMessage.trim()]
      )

      // If offline, insert system auto-reply
      if (!isOnline) {
        await client.query(
          `INSERT INTO chat_messages (conversation_id, sender_type, content)
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
        createdAt: result.created_at,
      },
    })
  } catch (error) {
    console.error('Chat conversations POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 })
  }
}
