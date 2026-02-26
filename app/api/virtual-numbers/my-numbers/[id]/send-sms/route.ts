import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * POST /api/virtual-numbers/my-numbers/[id]/send-sms
 * Send outbound SMS from virtual number
 */
export async function POST(
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
    const { to, body: messageBody } = body

    if (!to || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Recipient (to) and message body are required' },
        { status: 400 }
      )
    }

    // Get virtual number and verify ownership
    const numberResult = await query(
      `SELECT
         uvn.*,
         vnp.sms_included,
         vnp.unlimited_sms
       FROM user_virtual_numbers uvn
       LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
       WHERE uvn.id = $1 AND uvn.user_id = $2`,
      [numberId, user.id]
    )

    if (numberResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Virtual number not found' },
        { status: 404 }
      )
    }

    const virtualNumber = numberResult.rows[0]

    // Check status
    if (virtualNumber.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Virtual number is not active' },
        { status: 400 }
      )
    }

    // Check usage limits
    if (!virtualNumber.unlimited_sms && virtualNumber.current_period_sms >= virtualNumber.sms_included) {
      return NextResponse.json(
        { success: false, error: 'SMS limit reached for this billing period' },
        { status: 400 }
      )
    }

    // For now, simulate sending (Twilio integration will be added)
    const messageSid = `SM${Date.now()}${Math.random().toString(36).substring(2, 10)}`

    // Log the outbound message
    const messageResult = await query(
      `INSERT INTO virtual_number_messages
         (virtual_number_id, user_id, direction, from_number, to_number, body, provider_message_sid, status)
       VALUES ($1, $2, 'outbound', $3, $4, $5, $6, 'sent')
       RETURNING id`,
      [numberId, user.id, virtualNumber.phone_number, to, messageBody, messageSid]
    )

    // Update usage counters
    await query(
      `UPDATE user_virtual_numbers
       SET sms_sent_count = sms_sent_count + 1,
           current_period_sms = current_period_sms + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [numberId]
    )

    return NextResponse.json({
      success: true,
      data: {
        messageId: messageResult.rows[0].id,
        status: 'sent'
      }
    })
  } catch (error: any) {
    console.error('Error sending SMS:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
