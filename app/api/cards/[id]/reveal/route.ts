export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getCardWithDetails } from '@/lib/cards/service'

/**
 * POST /api/cards/[id]/reveal
 * Reveal full card details (number, CVV)
 * This is a sensitive operation - requires authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const cardWithDetails = await getCardWithDetails(id, user.id)

    if (!cardWithDetails) {
      return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 })
    }

    // Check if card is still active
    if (cardWithDetails.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Card is not active' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        cardNumber: cardWithDetails.cardNumber,
        cvv: cardWithDetails.cardCvv,
        expiry: cardWithDetails.cardExpiry,
        cardBrand: cardWithDetails.cardBrand
      }
    })
  } catch (error: any) {
    console.error('Error revealing card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reveal card details' },
      { status: 500 }
    )
  }
}
