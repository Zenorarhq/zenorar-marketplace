import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/virtual-numbers/my-numbers/[id]/messages
 * Get messages for a virtual number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    const { id: numberId } = await params

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Verify ownership
    const ownershipCheck = await query(
      `SELECT id FROM user_virtual_numbers WHERE id = $1 AND user_id = $2`,
      [numberId, user.id]
    )

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Virtual number not found' },
        { status: 404 }
      )
    }

    // Get messages
    const messagesResult = await query(
      `SELECT
         id,
         virtual_number_id as "virtualNumberId",
         direction,
         from_number as "fromNumber",
         to_number as "toNumber",
         body,
         media_urls as "mediaUrls",
         status,
         is_read as "isRead",
         created_at as "createdAt"
       FROM virtual_number_messages
       WHERE virtual_number_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [numberId, limit, offset]
    )

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM virtual_number_messages WHERE virtual_number_id = $1`,
      [numberId]
    )

    const total = parseInt(countResult.rows[0]?.count || '0')

    return NextResponse.json({
      success: true,
      data: {
        messages: messagesResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
