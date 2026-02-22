import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

/**
 * POST /api/admin/deposits/[depositId]/reset-pending
 * Resets a PROCESSING bank transfer deposit back to PENDING (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const user = await authenticateRequest(request)

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { depositId } = await params

    if (!depositId) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID is required' },
        { status: 400 }
      )
    }

    const result = await executeQuery(
      `UPDATE deposits
       SET status = 'PENDING', updated_at = NOW()
       WHERE id = $1 AND status = 'PROCESSING' AND payment_method = 'BANK_TRANSFER'
       RETURNING id`,
      [depositId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found or cannot be reset' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Reset deposit to pending error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset deposit' },
      { status: 500 }
    )
  }
}
