import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function DELETE(
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
      `DELETE FROM notifications WHERE id = $1 AND "userId" = $2`,
      [id, user.id]
    )

    return NextResponse.json({ success: true, data: { message: 'Notification deleted' } })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete notification' }, { status: 500 })
  }
}
