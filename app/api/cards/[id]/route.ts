export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getCardById, getCardTransactions, updateCardStatus } from '@/lib/cards/service'

/**
 * GET /api/cards/[id]
 * Get a single card's details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const card = await getCardById(id, user.id)

    if (!card) {
      return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 })
    }

    // Get recent transactions
    const transactions = await getCardTransactions(id, 20)

    return NextResponse.json({
      success: true,
      data: {
        id: card.id,
        provider: card.provider,
        cardType: card.cardType,
        cardBrand: card.cardBrand,
        cardLastFour: card.cardLastFour,
        cardExpiry: card.cardExpiry,
        balance: card.balance,
        denomination: card.denomination,
        status: card.status,
        nickname: card.nickname,
        isPremium: card.isPremium,
        createdAt: card.createdAt,
        expiresAt: card.expiresAt,
        transactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          fee: tx.fee,
          merchantName: tx.merchantName,
          status: tx.status,
          description: tx.description,
          createdAt: tx.createdAt
        }))
      }
    })
  } catch (error: any) {
    console.error('Error fetching card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch card' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/cards/[id]
 * Update card (nickname, status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const card = await getCardById(id, user.id)

    if (!card) {
      return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 })
    }

    const body = await request.json()
    const { nickname, status } = body

    // Only allow updating nickname for now
    // Status changes should go through dedicated endpoints
    if (nickname !== undefined) {
      const { executeQuery } = await import('@/lib/db-helpers')
      await executeQuery(
        'UPDATE user_cards SET nickname = $1 WHERE id = $2',
        [nickname, id]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Card updated'
    })
  } catch (error: any) {
    console.error('Error updating card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update card' },
      { status: 500 }
    )
  }
}
