import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { reserveCode, releaseCode } from '@/lib/gift-cards/inventory'

/**
 * POST /api/gift-cards/reserve
 * Reserve a gift card code when adding to cart
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

    const { giftCardId, denomination } = await request.json()

    if (!giftCardId || !denomination) {
      return NextResponse.json(
        { success: false, error: 'giftCardId and denomination are required' },
        { status: 400 }
      )
    }

    const result = await reserveCode(giftCardId, denomination, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reserve code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      codeId: result.codeId,
      message: 'Code reserved successfully. Reservation expires in 15 minutes.'
    })
  } catch (error: any) {
    console.error('Error reserving gift card code:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reserve code' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/gift-cards/reserve
 * Release a reserved gift card code when removing from cart
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { codeId } = await request.json()

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: 'codeId is required' },
        { status: 400 }
      )
    }

    const result = await releaseCode(codeId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to release code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Code released successfully'
    })
  } catch (error: any) {
    console.error('Error releasing gift card code:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to release code' },
      { status: 500 }
    )
  }
}
