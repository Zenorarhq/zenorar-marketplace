import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'
import { createNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { type, title, message } = body

    if (!type || !title || !message) {
      return NextResponse.json({ success: false, error: 'type, title, and message are required' }, { status: 400 })
    }

    if (type !== 'PROMOTIONAL' && type !== 'SYSTEM') {
      return NextResponse.json({ success: false, error: 'type must be PROMOTIONAL or SYSTEM' }, { status: 400 })
    }

    // Get all users (exclude system accounts if needed)
    const usersResult = await executeQuery(`SELECT id FROM users`)
    const userIds = usersResult.rows.map((row: any) => row.id)

    // Generate batch ID to track this notification batch
    const batchId = randomUUID()

    // Create notification for each user
    for (const userId of userIds) {
      await createNotification(userId, type, title, message, { sentBy: user.id, batchId })
    }

    return NextResponse.json({ success: true, data: { message: `Notification sent to ${userIds.length} users`, batchId } })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 })
  }
}
