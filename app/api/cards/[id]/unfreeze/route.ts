export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getCardById, updateCardStatus } from '@/lib/cards/service'
import { getProvider } from '@/lib/cards/providers'

/**
 * POST /api/cards/[id]/unfreeze
 * Unfreeze a virtual card
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

    // Check current status
    if (card.status !== 'frozen') {
      return NextResponse.json(
        { success: false, error: 'Card is not frozen' },
        { status: 400 }
      )
    }

    // Try to unfreeze with provider
    const provider = getProvider(card.provider)
    if (provider?.unfreeze && card.providerCardId) {
      const result = await provider.unfreeze(card.providerCardId)
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to unfreeze card' },
          { status: 500 }
        )
      }
    }

    // Update status in database
    await updateCardStatus(id, 'active')

    return NextResponse.json({
      success: true,
      message: 'Card unfrozen successfully'
    })
  } catch (error: any) {
    console.error('Error unfreezing card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to unfreeze card' },
      { status: 500 }
    )
  }
}
