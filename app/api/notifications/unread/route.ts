export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await executeQuery(
      `SELECT COUNT(*) as count FROM notifications WHERE "userId" = $1 AND "isRead" = false`,
      [user.id]
    )

    return NextResponse.json({ success: true, data: { count: parseInt(result.rows[0].count) } })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch unread count' }, { status: 500 })
  }
}
