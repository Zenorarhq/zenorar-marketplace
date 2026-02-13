import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await executeQuery(
      `UPDATE notifications SET "isRead" = true, "readAt" = NOW() WHERE "userId" = $1 AND "isRead" = false`,
      [user.id]
    )

    return NextResponse.json({ success: true, data: { message: 'All notifications marked as read' } })
  } catch (error) {
    console.error('Error marking all as read:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark all as read' }, { status: 500 })
  }
}
