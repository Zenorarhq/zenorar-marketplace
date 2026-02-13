import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

// GET /api/chat/settings — Get chat online/offline status (public)
export async function GET() {
  try {
    const result = await executeQuery(
      'SELECT is_online, offline_message FROM chat_settings LIMIT 1'
    )
    const settings = result.rows[0] || { is_online: false, offline_message: '' }
    return NextResponse.json({
      success: true,
      data: {
        isOnline: settings.is_online,
        offlineMessage: settings.offline_message,
      },
    })
  } catch (error) {
    console.error('Chat settings GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load chat settings' }, { status: 500 })
  }
}

// PATCH /api/chat/settings — Update chat settings (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: string[] = []
    const values: any[] = []
    let idx = 1

    if (typeof body.isOnline === 'boolean') {
      updates.push(`is_online = $${idx++}`)
      values.push(body.isOnline)
    }
    if (typeof body.offlineMessage === 'string') {
      updates.push(`offline_message = $${idx++}`)
      values.push(body.offlineMessage)
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)

    const result = await executeQuery(
      `UPDATE chat_settings SET ${updates.join(', ')} WHERE id = 1 RETURNING is_online, offline_message`,
      values
    )

    const settings = result.rows[0]
    return NextResponse.json({
      success: true,
      data: {
        isOnline: settings.is_online,
        offlineMessage: settings.offline_message,
      },
    })
  } catch (error) {
    console.error('Chat settings PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update chat settings' }, { status: 500 })
  }
}
