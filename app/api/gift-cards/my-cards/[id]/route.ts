import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getUserGiftCard, markAsRedeemed } from '@/lib/gift-cards/provisioning'

/**
 * GET /api/gift-cards/my-cards/[id]
 * Get a single purchased gift card with full code revealed
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

    const card = await getUserGiftCard(id, user.id)

    if (!card) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    // Return full code details
    return NextResponse.json({
      success: true,
      card
    })
  } catch (error: any) {
    console.error('Error fetching user gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gift card' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/gift-cards/my-cards/[id]
 * Mark a gift card as redeemed
 */
export async function PATCH(
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
    const body = await request.json()

    if (body.action === 'redeem') {
      const result = await markAsRedeemed(id, user.id)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error updating gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update gift card' },
      { status: 500 }
    )
  }
}
