import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { createNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, title, message, data } = body

    if (!type || !title || !message) {
      return NextResponse.json({ success: false, error: 'type, title, and message are required' }, { status: 400 })
    }

    await createNotification(user.id, type, title, message, data)

    return NextResponse.json({ success: true, data: { message: 'Notification created' } })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 })
  }
}
