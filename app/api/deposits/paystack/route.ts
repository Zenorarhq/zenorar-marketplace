import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

/**
 * POST /api/deposits/paystack
 * Creates a pending deposit record before Paystack popup opens
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { amount, reference } = await req.json()

    if (!amount || amount < 5 || amount > 10000) {
      return NextResponse.json(
        { success: false, error: 'Amount must be between $5 and $10,000' },
        { status: 400 }
      )
    }

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      )
    }

    // Create deposit record
    const result = await executeQuery(
      `INSERT INTO deposits (id, user_id, amount, currency, payment_method, status, paystack_reference)
       VALUES (gen_random_uuid()::text, $1, $2, 'USD', 'PAYSTACK', 'PENDING', $3)
       RETURNING id`,
      [user.id, amount, reference]
    )

    return NextResponse.json({
      success: true,
      data: { depositId: result.rows[0].id },
    })
  } catch (error: any) {
    console.error('Paystack deposit creation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create deposit' },
      { status: 500 }
    )
  }
}
