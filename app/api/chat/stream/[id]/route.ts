import { NextRequest } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/chat/stream/[id] — SSE stream for a single conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const lastTimestamp = searchParams.get('since') || new Date(0).toISOString()

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      let since = lastTimestamp

      const poll = async () => {
        if (closed) return

        try {
          const result = await executeQuery(
            `SELECT m.*, s.name as sender_name, s.avatar as sender_avatar
             FROM chat_messages m
             LEFT JOIN users s ON m.sender_id = s.id
             WHERE m.conversation_id = $1 AND m.created_at > $2
             ORDER BY m.created_at ASC`,
            [id, since]
          )

          if (result.rows.length > 0) {
            const messages = result.rows.map(m => ({
              id: m.id,
              conversationId: m.conversation_id,
              senderType: m.sender_type,
              senderId: m.sender_id,
              senderName: m.sender_name,
              content: m.content,
              attachments: m.attachments || [],
              isRead: m.is_read,
              createdAt: m.created_at,
            }))

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'messages', data: messages })}\n\n`))
            since = result.rows[result.rows.length - 1].created_at
          }

          // Also check conversation status
          const convResult = await executeQuery(
            `SELECT status, assigned_to FROM chat_conversations WHERE id = $1`,
            [id]
          )
          if (convResult.rows.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', data: { status: convResult.rows[0].status, assignedTo: convResult.rows[0].assigned_to } })}\n\n`))
          }
        } catch (error) {
          // Connection might be closed
          if (!closed) {
            console.error('SSE poll error:', error)
          }
        }

        if (!closed) {
          setTimeout(poll, 2000)
        }
      }

      // Send initial heartbeat
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))
      poll()

      // Cleanup on abort
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
