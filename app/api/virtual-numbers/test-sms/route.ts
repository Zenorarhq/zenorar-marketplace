import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { virtualNumberService } from '@/lib/virtual-numbers/service'
import { query } from '@/lib/db'

/**
 * POST /api/virtual-numbers/test-sms
 * Simulate receiving an SMS for testing purposes
 *
 * Only works in development or for admin users
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Only allow in development or for admin users
    const isDevMode = process.env.NODE_ENV === 'development'
    const isAdmin = session?.user?.role === 'ADMIN'

    if (!isDevMode && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Test endpoint only available in development mode or for admins' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { virtualNumberId, fromNumber, message } = body

    if (!virtualNumberId || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing virtualNumberId or message' },
        { status: 400 }
      )
    }

    // Get the virtual number
    const numberResult = await query(
      `SELECT phone_number FROM user_virtual_numbers WHERE id = $1 AND status = 'active'`,
      [virtualNumberId]
    )

    if (numberResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Virtual number not found or not active' },
        { status: 404 }
      )
    }

    const toNumber = numberResult.rows[0].phone_number
    const testFromNumber = fromNumber || '+15551234567'
    const testMessageSid = `TEST_${Date.now()}`

    // Process the test SMS using the same handler as real webhooks
    const result = await virtualNumberService.handleIncomingSms(
      toNumber,
      testFromNumber,
      message,
      testMessageSid
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test SMS simulated successfully',
        data: {
          to: toNumber,
          from: testFromNumber,
          body: message,
          messageSid: testMessageSid
        }
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to process test SMS' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Test SMS error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
