import { NextRequest, NextResponse } from 'next/server'
import { virtualNumberService } from '@/lib/virtual-numbers/service'
import { twilioService } from '@/lib/virtual-numbers/providers/twilio'

/**
 * POST /api/webhooks/twilio/sms
 * Handle incoming SMS from Twilio
 *
 * Twilio sends form-encoded data with:
 * - MessageSid: Unique message ID
 * - From: Sender's phone number
 * - To: Your Twilio number
 * - Body: Message text
 * - NumMedia: Number of media items
 * - MediaUrl0, MediaUrl1, etc.: Media URLs
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData()

    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')

    // Get media URLs if any
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string
      if (mediaUrl) {
        mediaUrls.push(mediaUrl)
      }
    }

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature')
      const url = request.url

      // Convert form data to params object for signature validation
      const params: Record<string, string> = {}
      formData.forEach((value, key) => {
        params[key] = value as string
      })

      if (signature && !twilioService.validateWebhookSignature(signature, url, params)) {
        console.warn('Invalid Twilio signature')
        return new NextResponse('Invalid signature', { status: 403 })
      }
    }

    // Log webhook data for debugging
    console.log('📨 Twilio SMS Webhook received:', {
      messageSid,
      from,
      to,
      bodyLength: body?.length || 0,
      numMedia
    })

    // Process the incoming SMS
    const result = await virtualNumberService.handleIncomingSms(
      to,
      from,
      body,
      messageSid,
      mediaUrls.length > 0 ? mediaUrls : undefined
    )

    console.log('📨 SMS processing result:', { success: result.success, forwarded: result.forwarded })

    if (!result.success) {
      console.warn('❌ Failed to process incoming SMS:', { to, from, messageSid })
    }

    // Return TwiML response (empty response acknowledges receipt)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: {
          'Content-Type': 'text/xml'
        }
      }
    )
  } catch (error) {
    console.error('Twilio SMS webhook error:', error)

    // Return TwiML even on error to prevent Twilio retries
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: {
          'Content-Type': 'text/xml'
        }
      }
    )
  }
}
