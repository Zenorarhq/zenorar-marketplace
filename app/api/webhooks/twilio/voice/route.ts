import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * POST /api/webhooks/twilio/voice
 * Handle incoming voice calls from Twilio
 *
 * Returns TwiML to control call flow:
 * - Forward to another number
 * - Go to voicemail
 * - Play message and hang up
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()

    const callSid = formData.get('CallSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callStatus = formData.get('CallStatus') as string

    // Find the virtual number
    const numberResult = await query(
      `SELECT uvn.*, vnp.voice_minutes_included, vnp.unlimited_voice
       FROM user_virtual_numbers uvn
       LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
       WHERE uvn.phone_number = $1 AND uvn.status = 'active'`,
      [to]
    )

    if (numberResult.rows.length === 0) {
      // Number not found - play error message
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>This number is no longer in service.</Say>
          <Hangup/>
        </Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const virtualNumber = numberResult.rows[0]

    // Log the call
    await query(
      `INSERT INTO virtual_number_calls
         (virtual_number_id, user_id, direction, from_number, to_number, status, provider_call_sid)
       VALUES ($1, $2, 'inbound', $3, $4, $5, $6)`,
      [virtualNumber.id, virtualNumber.user_id, from, to, callStatus, callSid]
    )

    // Check voice forwarding
    if (virtualNumber.voice_forwarding_enabled && virtualNumber.voice_forward_to) {
      // Forward the call
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Dial callerId="${to}">
            <Number>${virtualNumber.voice_forward_to}</Number>
          </Dial>
        </Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Check voicemail
    if (virtualNumber.voicemail_enabled) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>The person you are calling is not available. Please leave a message after the beep.</Say>
          <Record maxLength="120" playBeep="true" action="/api/webhooks/twilio/voicemail"/>
          <Say>I did not receive a recording. Goodbye.</Say>
          <Hangup/>
        </Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // No forwarding configured - play message
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>This number is not accepting calls at this time.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('Twilio voice webhook error:', error)

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Please try again later.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
