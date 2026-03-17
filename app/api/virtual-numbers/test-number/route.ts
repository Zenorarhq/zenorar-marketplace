import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * POST /api/virtual-numbers/test-number
 * Create a test virtual number for testing settings/SMS flows
 * Only available for admin users
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdmin = user.role?.toUpperCase() === 'ADMIN'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Generate a test phone number
    const testNumber = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`
    const testLastFour = testNumber.slice(-4)

    // Create a test virtual number directly in the DB
    const result = await query(
      `INSERT INTO user_virtual_numbers (
         user_id, phone_number, phone_number_display, number_type, provider,
         status, plan_id, plan_category, plan_duration_days, sms_limit,
         expires_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, 'local', 'test',
         'active', 'basic', 'basic', 30, 500,
         NOW() + INTERVAL '30 days', NOW(), NOW()
       ) RETURNING id, phone_number, status, expires_at`,
      [user.id, testNumber, `(555) ${testLastFour.slice(0,3)}-${testLastFour.slice(3)}`]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error: any) {
    console.error('Error creating test number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create test number' },
      { status: 500 }
    )
  }
}