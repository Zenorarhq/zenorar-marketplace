export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getCardById, getCardTransactions } from '@/lib/cards/service'

/**
 * GET /api/cards/[id]/transactions
 * Get transaction history for a card
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
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')

    // Verify card belongs to user
    const card = await getCardById(id, user.id)
    if (!card) {
      return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 })
    }

    const transactions = await getCardTransactions(id, limit)

    return NextResponse.json({
      success: true,
      data: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        fee: tx.fee,
        merchantName: tx.merchantName,
        merchantCategory: tx.merchantCategory,
        status: tx.status,
        description: tx.description,
        createdAt: tx.createdAt
      }))
    })
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
