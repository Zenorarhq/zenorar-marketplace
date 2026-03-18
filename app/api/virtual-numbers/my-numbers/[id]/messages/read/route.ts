import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * POST /api/virtual-numbers/my-numbers/[id]/messages/read
 * Mark messages as read for a virtual number
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: numberId } = await params
    const body = await request.json().catch(() => ({}))
    const { messageIds } = body

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'messageIds array is required' },
        { status: 400 }
      )
    }

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

    // Mark messages as read (only messages belonging to this number)
    await query(
      `UPDATE virtual_number_messages
       SET is_read = true
       WHERE id = ANY($1::uuid[]) AND virtual_number_id = $2`,
      [messageIds, numberId]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to mark messages as read' },
      { status: 500 }
    )
  }
}
