import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { twilioService } from '@/lib/virtual-numbers/providers/twilio'

/**
 * GET /api/virtual-numbers/test-connection
 * Test the Twilio API connection with admin-configured credentials
 *
 * Admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    // Only allow admin users
    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Test the connection
    const result = await twilioService.testConnection()

    return NextResponse.json({
      success: result.success,
      mode: result.mode,
      error: result.error,
      message: result.success
        ? `Twilio connection successful (${result.mode} mode)`
        : `Twilio connection failed: ${result.error}`
    })
  } catch (error: any) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
