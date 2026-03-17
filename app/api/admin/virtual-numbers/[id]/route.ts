import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { virtualNumberService } from '@/lib/virtual-numbers/service'

/**
 * GET /api/admin/virtual-numbers/[id]
 * Get virtual number details with usage stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get number details
    const numberResult = await query(
      `SELECT
         uvn.*,
         u.email as user_email,
         u.name as user_name,
         vnc.name as country_name,
         vnc.iso_code as country_code,
         vnc.flag_emoji,
         vnp.name as plan_name,
         vnp.base_price as plan_price,
         vnp.sms_included,
         vnp.voice_minutes_included,
         vnp.unlimited_sms,
         vnp.unlimited_voice
       FROM user_virtual_numbers uvn
       LEFT JOIN users u ON uvn.user_id = u.id
       LEFT JOIN virtual_number_countries vnc ON uvn.country_id = vnc.id
       LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
       WHERE uvn.id = $1`,
      [id]
    )

    if (numberResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Virtual number not found' },
        { status: 404 }
      )
    }

    // Get recent messages
    const messagesResult = await query(
      `SELECT * FROM virtual_number_messages
       WHERE virtual_number_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [id]
    )

    // Get recent calls
    const callsResult = await query(
      `SELECT * FROM virtual_number_calls
       WHERE virtual_number_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [id]
    )

    return NextResponse.json({
      success: true,
      data: {
        number: numberResult.rows[0],
        recentMessages: messagesResult.rows,
        recentCalls: callsResult.rows
      }
    })
  } catch (error: any) {
    console.error('Error getting virtual number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get virtual number' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/virtual-numbers/[id]
 * Update virtual number settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Allowed fields to update
    const allowedFields = [
      'status',
      'sms_forwarding_enabled',
      'sms_forward_to',
      'sms_forward_email',
      'voice_forwarding_enabled',
      'voice_forward_to',
      'voicemail_enabled',
      'nickname',
      'expires_at'
    ]

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`)
        values.push(body[field])
        paramIndex++
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(id)
    const result = await query(
      `UPDATE user_virtual_numbers
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Virtual number not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating virtual number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update virtual number' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/virtual-numbers/[id]
 * Cancel/release a virtual number
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get number details
    const numberResult = await query(
      `SELECT user_id FROM user_virtual_numbers WHERE id = $1`,
      [id]
    )

    if (numberResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Virtual number not found' },
        { status: 404 }
      )
    }

    // Use service to properly release the number
    const result = await virtualNumberService.cancelNumber(id, numberResult.rows[0].user_id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Virtual number cancelled successfully'
    })
  } catch (error: any) {
    console.error('Error cancelling virtual number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel virtual number' },
      { status: 500 }
    )
  }
}
