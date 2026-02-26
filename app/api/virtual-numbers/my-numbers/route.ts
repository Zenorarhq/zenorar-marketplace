import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/virtual-numbers/my-numbers
 * Get user's purchased virtual numbers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const result = await query(
      `SELECT
         uvn.id,
         uvn.user_id as "userId",
         uvn.plan_id as "planId",
         vnp.name as "planName",
         uvn.country_id as "countryId",
         vnc.name as "countryName",
         vnc.flag_emoji as "flagEmoji",
         uvn.phone_number as "phoneNumber",
         uvn.phone_number_display as "phoneNumberDisplay",
         uvn.number_type as "numberType",
         uvn.status,
         uvn.started_at as "startedAt",
         uvn.expires_at as "expiresAt",
         uvn.next_billing_at as "nextBillingAt",
         uvn.sms_forwarding_enabled as "smsForwardingEnabled",
         uvn.sms_forward_to as "smsForwardTo",
         uvn.sms_forward_email as "smsForwardEmail",
         uvn.voice_forwarding_enabled as "voiceForwardingEnabled",
         uvn.voice_forward_to as "voiceForwardTo",
         uvn.voicemail_enabled as "voicemailEnabled",
         uvn.sms_sent_count as "smsSentCount",
         uvn.sms_received_count as "smsReceivedCount",
         uvn.voice_minutes_used as "voiceMinutesUsed",
         uvn.current_period_sms as "currentPeriodSms",
         uvn.current_period_voice as "currentPeriodVoice",
         uvn.nickname,
         uvn.created_at as "createdAt",
         (SELECT COUNT(*) FROM virtual_number_messages vnm
          WHERE vnm.virtual_number_id = uvn.id AND vnm.is_read = false AND vnm.direction = 'inbound'
         ) as "unreadCount"
       FROM user_virtual_numbers uvn
       LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
       LEFT JOIN virtual_number_countries vnc ON uvn.country_id = vnc.id
       WHERE uvn.user_id = $1
       ORDER BY uvn.created_at DESC`,
      [user.id]
    )

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    console.error('Error fetching user virtual numbers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch numbers' },
      { status: 500 }
    )
  }
}
