import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { esimProvisioningService } from '@/lib/esim'

/**
 * GET /api/esim/my-esims/[id]/topup-options
 * Get available top-up options for an eSIM
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const result = await esimProvisioningService.getTopupOptions(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      options: result.options
    })
  } catch (error: any) {
    console.error('Error getting topup options:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get topup options' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/esim/my-esims/[id]/topup-options
 * Apply a top-up to an eSIM
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { topupId, orderId } = await request.json()

    if (!topupId) {
      return NextResponse.json(
        { success: false, error: 'topupId is required' },
        { status: 400 }
      )
    }

    // In a full implementation, you would:
    // 1. Create a payment intent/order for the topup
    // 2. Process payment
    // 3. Only then apply the topup

    // For now, we'll apply the topup (assuming payment was handled externally)
    const result = await esimProvisioningService.applyTopup(
      id,
      user.id,
      topupId,
      orderId || `topup-${Date.now()}`
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      newDataRemainingMb: result.newDataRemainingMb,
      newExpiresAt: result.newExpiresAt,
      message: 'Top-up applied successfully'
    })
  } catch (error: any) {
    console.error('Error applying topup:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply top-up' },
      { status: 500 }
    )
  }
}
