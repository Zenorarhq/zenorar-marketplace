export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getCardById, updateCardStatus } from '@/lib/cards/service'
import { getProvider } from '@/lib/cards/providers'

/**
 * POST /api/cards/[id]/freeze
 * Freeze a virtual card
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
    const card = await getCardById(id, user.id)

    if (!card) {
      return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 })
    }

    // Only virtual cards can be frozen
    if (card.cardType !== 'virtual') {
      return NextResponse.json(
        { success: false, error: 'Instant cards cannot be frozen' },
        { status: 400 }
      )
    }

    // Check current status
    if (card.status === 'frozen') {
      return NextResponse.json(
        { success: false, error: 'Card is already frozen' },
        { status: 400 }
      )
    }

    if (card.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Card is not active' },
        { status: 400 }
      )
    }

    // Try to freeze with provider
    const provider = getProvider(card.provider)
    if (provider?.freeze && card.providerCardId) {
      const result = await provider.freeze(card.providerCardId)
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to freeze card' },
          { status: 500 }
        )
      }
    }

    // Update status in database
    await updateCardStatus(id, 'frozen')

    return NextResponse.json({
      success: true,
      message: 'Card frozen successfully'
    })
  } catch (error: any) {
    console.error('Error freezing card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to freeze card' },
      { status: 500 }
    )
  }
}
