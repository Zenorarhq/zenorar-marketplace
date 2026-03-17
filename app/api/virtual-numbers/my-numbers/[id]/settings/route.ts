import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * PATCH /api/virtual-numbers/my-numbers/[id]/settings
 * Update virtual number settings (forwarding, nickname, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    const { id: numberId } = await params

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      smsForwardingEnabled,
      smsForwardTo,
      smsForwardEmail,
      voiceForwardingEnabled,
      voiceForwardTo,
      voicemailEnabled,
      nickname
    } = body

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

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (smsForwardingEnabled !== undefined) {
      updates.push(`sms_forwarding_enabled = $${paramIndex++}`)
      values.push(smsForwardingEnabled)
    }

    if (smsForwardTo !== undefined) {
      updates.push(`sms_forward_to = $${paramIndex++}`)
      values.push(smsForwardTo || null)
    }

    if (smsForwardEmail !== undefined) {
      if (smsForwardEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smsForwardEmail)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format for SMS forwarding' },
          { status: 400 }
        )
      }
      updates.push(`sms_forward_email = $${paramIndex++}`)
      values.push(smsForwardEmail || null)
    }

    if (voiceForwardingEnabled !== undefined) {
      updates.push(`voice_forwarding_enabled = $${paramIndex++}`)
      values.push(voiceForwardingEnabled)
    }

    if (voiceForwardTo !== undefined) {
      updates.push(`voice_forward_to = $${paramIndex++}`)
      values.push(voiceForwardTo || null)
    }

    if (voicemailEnabled !== undefined) {
      updates.push(`voicemail_enabled = $${paramIndex++}`)
      values.push(voicemailEnabled)
    }

    if (nickname !== undefined) {
      updates.push(`nickname = $${paramIndex++}`)
      values.push(nickname || null)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No settings to update' },
        { status: 400 }
      )
    }

    updates.push(`updated_at = NOW()`)
    values.push(numberId)

    const result = await query(
      `UPDATE user_virtual_numbers
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING
         id,
         sms_forwarding_enabled as "smsForwardingEnabled",
         sms_forward_to as "smsForwardTo",
         sms_forward_email as "smsForwardEmail",
         voice_forwarding_enabled as "voiceForwardingEnabled",
         voice_forward_to as "voiceForwardTo",
         voicemail_enabled as "voicemailEnabled",
         nickname`,
      values
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}
