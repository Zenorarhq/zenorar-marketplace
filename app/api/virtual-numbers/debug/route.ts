import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/virtual-numbers/debug
 * Debug endpoint to check virtual number setup and messages
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

    // Get all virtual numbers
    const numbersResult = await query(`
      SELECT
        uvn.id,
        uvn.user_id,
        uvn.phone_number,
        uvn.phone_number_display,
        uvn.status,
        uvn.provider,
        uvn.provider_number_sid,
        uvn.created_at,
        uvn.expires_at,
        u.email as user_email
      FROM user_virtual_numbers uvn
      LEFT JOIN users u ON uvn.user_id = u.id
      ORDER BY uvn.created_at DESC
      LIMIT 10
    `)

    // Get recent messages
    const messagesResult = await query(`
      SELECT
        vnm.id,
        vnm.virtual_number_id,
        vnm.direction,
        vnm.from_number,
        vnm.to_number,
        vnm.body,
        vnm.provider_message_sid,
        vnm.status,
        vnm.created_at,
        uvn.phone_number as virtual_number
      FROM virtual_number_messages vnm
      LEFT JOIN user_virtual_numbers uvn ON vnm.virtual_number_id = uvn.id
      ORDER BY vnm.created_at DESC
      LIMIT 20
    `)

    return NextResponse.json({
      success: true,
      virtualNumbers: numbersResult.rows,
      recentMessages: messagesResult.rows,
      debug: {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV
      }
    })
  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
