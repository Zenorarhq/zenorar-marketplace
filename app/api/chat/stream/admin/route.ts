import { NextRequest } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export const dynamic = 'force-dynamic'

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
            `SELECT c.id, c.status, c."assignedToId", c."updatedAt",
              COALESCE(c."guestName", c."guestEmail", u.name, 'Guest') as display_name,
              (SELECT content FROM chat_messages WHERE "conversationId" = c.id ORDER BY "createdAt" DESC LIMIT 1) as last_message,
              (SELECT COUNT(*) FROM chat_messages WHERE "conversationId" = c.id AND "isRead" = false AND "senderType" = 'USER') as unread_count,
              a.name as agent_name
            FROM chat_conversations c
            LEFT JOIN users u ON c."userId" = u.id
            LEFT JOIN users a ON c."assignedToId" = a.id
            WHERE c."updatedAt" > $1 OR EXISTS (
              SELECT 1 FROM chat_messages WHERE "conversationId" = c.id AND "createdAt" > $1
            )
            ORDER BY c."updatedAt" DESC`,
            [lastCheck]
          )

          if (result.rows.length > 0) {
            const updates = result.rows.map(row => ({
              id: row.id,
              status: row.status,
              assignedTo: row.assignedToId,
              agentName: row.agent_name,
              displayName: row.display_name,
              lastMessage: row.last_message,
              unreadCount: parseInt(row.unread_count) || 0,
              updatedAt: row.updatedAt,
            }))

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'updates', data: updates })}\n\n`))
          }

          // Also send overall stats
          const statsResult = await executeQuery(`
            SELECT
              COUNT(*) FILTER (WHERE status IN ('OPEN', 'ASSIGNED')) as active,
              COUNT(*) FILTER (WHERE status = 'OPEN' AND "assignedToId" IS NULL) as unassigned,
              (SELECT COUNT(*) FROM chat_messages WHERE "isRead" = false AND "senderType" = 'USER') as total_unread
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
