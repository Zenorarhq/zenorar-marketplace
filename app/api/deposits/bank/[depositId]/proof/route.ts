import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

/**
 * POST /api/deposits/bank/[depositId]/proof
 * Uploads proof of bank transfer for admin review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { depositId } = await params
    const body = await request.json()
    const { proofUrl } = body

    if (!depositId) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID is required' },
        { status: 400 }
      )
    }

    if (!proofUrl) {
      return NextResponse.json(
        { success: false, error: 'Proof URL is required' },
        { status: 400 }
      )
    }

    // Update deposit with proof URL
    const result = await executeQuery(
      `UPDATE deposits
       SET bank_proof = $2, updated_at = NOW()
       WHERE id = $1 AND user_id = $3 AND payment_method = 'BANK_TRANSFER' AND status IN ('PENDING', 'PROCESSING')
       RETURNING id`,
      [depositId, proofUrl, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found or cannot be updated' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Proof submitted successfully. An admin will review and credit your wallet.',
      },
    })
  } catch (error: any) {
    console.error('Bank proof upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload proof' },
      { status: 500 }
    )
  }
}
