import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

/**
 * GET /api/deposits/paypal/lookup?depositId=xxx
 * Looks up the PayPal order ID from a deposit record (fallback if token missing from URL)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const depositId = req.nextUrl.searchParams.get('depositId')
    if (!depositId) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID is required' },
        { status: 400 }
      )
    }

    const result = await executeQuery(
      `SELECT paypal_order_id FROM deposits WHERE id = $1 AND user_id = $2 AND payment_method = 'PAYPAL'`,
      [depositId, user.id]
    )

    if (result.rows.length === 0 || !result.rows[0].paypal_order_id) {
      return NextResponse.json(
        { success: false, error: 'PayPal order ID not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { orderId: result.rows[0].paypal_order_id },
    })
  } catch (error: any) {
    console.error('PayPal lookup error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to lookup deposit' },
      { status: 500 }
    )
  }
}
