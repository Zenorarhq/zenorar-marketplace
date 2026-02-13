import { NextRequest } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/chat/stream/admin — SSE stream for admin conversation list updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      let lastCheck = new Date().toISOString()

      const poll = async () => {
        if (closed) return

        try {
          // Get conversations updated since last check
          const result = await executeQuery(
            `SELECT c.id, c.status, c.assigned_to, c.updated_at,
              COALESCE(c.guest_name, c.guest_email, u.name, 'Guest') as display_name,
              (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND is_read = false AND sender_type = 'USER') as unread_count,
              a.name as agent_name
            FROM chat_conversations c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN users a ON c.assigned_to = a.id
            WHERE c.updated_at > $1 OR EXISTS (
              SELECT 1 FROM chat_messages WHERE conversation_id = c.id AND created_at > $1
            )
            ORDER BY c.updated_at DESC`,
            [lastCheck]
          )

          if (result.rows.length > 0) {
            const updates = result.rows.map(row => ({
              id: row.id,
              status: row.status,
              assignedTo: row.assigned_to,
              agentName: row.agent_name,
              displayName: row.display_name,
              lastMessage: row.last_message,
              unreadCount: parseInt(row.unread_count) || 0,
              updatedAt: row.updated_at,
            }))

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'updates', data: updates })}\n\n`))
          }

          // Also send overall stats
          const statsResult = await executeQuery(`
            SELECT
              COUNT(*) FILTER (WHERE status IN ('OPEN', 'ASSIGNED')) as active,
              COUNT(*) FILTER (WHERE status = 'OPEN' AND assigned_to IS NULL) as unassigned,
              (SELECT COUNT(*) FROM chat_messages WHERE is_read = false AND sender_type = 'USER') as total_unread
            FROM chat_conversations
          `)
          const stats = statsResult.rows[0]
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'stats',
            data: {
              active: parseInt(stats.active) || 0,
              unassigned: parseInt(stats.unassigned) || 0,
              totalUnread: parseInt(stats.total_unread) || 0,
            }
          })}\n\n`))

          lastCheck = new Date().toISOString()
        } catch (error) {
          if (!closed) {
            console.error('Admin SSE poll error:', error)
          }
        }

        if (!closed) {
          setTimeout(poll, 2000)
        }
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))
      poll()

      request.signal.addEventListener('abort', () => {
        closed = true
        controller.close()
      })
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
