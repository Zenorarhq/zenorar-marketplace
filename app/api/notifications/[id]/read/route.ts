import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await executeQuery(
      `UPDATE notifications SET "isRead" = true, "readAt" = NOW() WHERE id = $1 AND "userId" = $2`,
      [id, user.id]
    )

    return NextResponse.json({ success: true, data: { message: 'Notification marked as read' } })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 })
  }
}
