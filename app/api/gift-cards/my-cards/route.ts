export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getUserGiftCards } from '@/lib/gift-cards/provisioning'

/**
 * GET /api/gift-cards/my-cards
 * Get current user's purchased gift cards
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // delivered, redeemed, expired

    let cards = await getUserGiftCards(user.id, limit, offset)

    // Filter by status if specified
    if (status) {
      cards = cards.filter(c => c.status === status)
    }

    // Hide full codes for security - show masked version
    const maskedCards = cards.map(card => ({
      ...card,
      code: maskCode(card.code),
      pin: card.pin ? maskCode(card.pin) : undefined
    }))

    return NextResponse.json({
      success: true,
      cards: maskedCards,
      total: cards.length
    })
  } catch (error: any) {
    console.error('Error fetching user gift cards:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gift cards' },
      { status: 500 }
    )
  }
}

/**
 * Mask a code for display, showing only first and last 4 characters
 */
function maskCode(code: string): string {
  if (code.length <= 8) {
    return code.substring(0, 2) + '****' + code.substring(code.length - 2)
  }
  return code.substring(0, 4) + '****' + code.substring(code.length - 4)
}
