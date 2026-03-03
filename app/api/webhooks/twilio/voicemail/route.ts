import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { sendVoicemailNotificationEmail } from '@/lib/email-service'

/**
 * POST /api/webhooks/twilio/voicemail
 * Handle voicemail recording completion from Twilio
 *
 * Called after voicemail recording is complete
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()

    const callSid = formData.get('CallSid') as string
    const recordingUrl = formData.get('RecordingUrl') as string
    const recordingDuration = parseInt(formData.get('RecordingDuration') as string || '0')
    const from = formData.get('From') as string
    const to = formData.get('To') as string

    if (!recordingUrl) {
      // No recording was made
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Thank you. Goodbye.</Say>
          <Hangup/>
        </Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Find the virtual number and user
    const numberResult = await query(
      `SELECT uvn.*, u.email as user_email, u.name as user_name
       FROM user_virtual_numbers uvn
       LEFT JOIN users u ON uvn.user_id = u.id
       WHERE uvn.phone_number = $1`,
      [to]
    )

    if (numberResult.rows.length > 0) {
      const virtualNumber = numberResult.rows[0]

      // Update call record with voicemail
      await query(
        `UPDATE virtual_number_calls
         SET voicemail_url = $1, duration_seconds = $2, status = 'voicemail'
         WHERE provider_call_sid = $3`,
        [recordingUrl + '.mp3', recordingDuration, callSid]
      )

      // If no call record exists, create one
      const callResult = await query(
        `SELECT id FROM virtual_number_calls WHERE provider_call_sid = $1`,
        [callSid]
      )

      if (callResult.rows.length === 0) {
        await query(
          `INSERT INTO virtual_number_calls
             (virtual_number_id, user_id, direction, from_number, to_number,
              status, provider_call_sid, voicemail_url, duration_seconds)
           VALUES ($1, $2, 'inbound', $3, $4, 'voicemail', $5, $6, $7)`,
          [virtualNumber.id, virtualNumber.user_id, from, to, callSid, recordingUrl + '.mp3', recordingDuration]
        )
      }

      // Send email notification if user has email
      if (virtualNumber.user_email) {
        try {
          await sendVoicemailNotificationEmail({
            email: virtualNumber.user_email,
            customerName: virtualNumber.user_name || 'Customer',
            phoneNumber: virtualNumber.phone_number,
            phoneNumberDisplay: virtualNumber.phone_number_display || virtualNumber.phone_number,
            callerNumber: from,
            duration: recordingDuration,
            recordingUrl: recordingUrl + '.mp3',
            receivedAt: new Date()
          })
        } catch (emailError) {
          console.error('Failed to send voicemail notification email:', emailError)
        }
      }
    }

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Your message has been recorded. Thank you.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('Twilio voicemail webhook error:', error)

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Thank you for your message. Goodbye.</Say>
        <Hangup/>
      </Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
