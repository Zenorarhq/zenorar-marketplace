export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const isRead = searchParams.get('isRead')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
  const offset = (page - 1) * limit

  let query = `SELECT id, "userId", type, title, message, link, "orderId", "productId", metadata, "isRead", "readAt", "emailSent", "pushSent", "createdAt" FROM notifications WHERE "userId" = $1`
  const params: any[] = [user.id]
  let paramIndex = 2

  if (type) {
    query += ` AND type = $${paramIndex}::"NotificationType"`
    params.push(type)
    paramIndex++
  }

  if (isRead === 'true') {
    query += ` AND "isRead" = true`
  } else if (isRead === 'false') {
    query += ` AND "isRead" = false`
  }

  query += ` ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
  params.push(limit, offset)

  try {
    const result = await executeQuery(query, params)

    const notifications = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link || null,
      orderId: row.orderId || null,
      productId: row.productId || null,
      metadata: row.metadata || null,
      isRead: row.isRead,
      readAt: row.readAt || null,
      emailSent: row.emailSent || false,
      pushSent: row.pushSent || false,
      createdAt: row.createdAt,
    }))

    return NextResponse.json({ success: true, data: notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
