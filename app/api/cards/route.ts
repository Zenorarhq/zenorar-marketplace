export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import {
  getUserCards,
  getProviderPricing,
  createCardRecord,
  recordTransaction,
  calculateInstantCardPrice,
  calculateTopUpFee
} from '@/lib/cards/service'
import { getProvider } from '@/lib/cards/providers'
import type { CardProvider, CardType, CardBrand } from '@/lib/cards/types'
import { executeQuery } from '@/lib/db-helpers'

/**
 * GET /api/cards
 * List user's active cards (excludes used/expired)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cards = await getUserCards(user.id)

    return NextResponse.json({
      success: true,
      data: cards.map(card => ({
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
        expiresAt: card.expiresAt
      }))
    })
  } catch (error: any) {
    console.error('Error fetching cards:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch cards' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cards
 * Create a new virtual or instant card
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      provider: providerName,
      cardType,
      denomination,
      cardBrand = 'visa',
      nickname
    } = body as {
      provider: CardProvider
      cardType: CardType
      denomination?: number
      cardBrand?: CardBrand
      nickname?: string
    }

    // Validate input
    if (!providerName || !cardType) {
      return NextResponse.json(
        { success: false, error: 'Provider and card type are required' },
        { status: 400 }
      )
    }

    if (cardType === 'instant' && !denomination) {
      return NextResponse.json(
        { success: false, error: 'Denomination is required for instant cards' },
        { status: 400 }
      )
    }

    // Get provider pricing
    const pricing = await getProviderPricing(providerName)
    if (!pricing || !pricing.isEnabled) {
      return NextResponse.json(
        { success: false, error: 'Provider is not available' },
        { status: 400 }
      )
    }

    // Calculate cost
    let totalCost = 0
    if (cardType === 'instant') {
      totalCost = calculateInstantCardPrice(denomination!, pricing.instantMarkupPercent)
    } else {
      totalCost = pricing.creationFee
    }

    // Check user's wallet balance
    const walletResult = await executeQuery<any>(
      'SELECT balance FROM users WHERE id = $1',
      [user.id]
    )

    const walletBalance = parseFloat(walletResult.rows[0]?.balance || '0')

    if (walletBalance < totalCost) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Required: $${totalCost.toFixed(2)}, Available: $${walletBalance.toFixed(2)}`
        },
        { status: 400 }
      )
    }

    // Get provider implementation
    const provider = getProvider(providerName)
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 400 }
      )
    }

    // Create the card with the provider
    const result = await provider.createCard({
      userId: user.id,
      currency: 'USD',
      denomination,
      cardBrand
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create card' },
        { status: 500 }
      )
    }

    // Deduct from wallet
    await executeQuery(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [totalCost, user.id]
    )

    // Calculate expiry date (3 years for virtual, 1 year for instant)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + (cardType === 'instant' ? 1 : 3))

    // Save card to database
    const card = await createCardRecord(
      user.id,
      providerName,
      result.cardId || null,
      cardType,
      cardBrand,
      result.lastFour || '',
      result.cardNumber || null,
      result.cvv || null,
      result.expiry || '',
      result.balance || 0,
      cardType === 'instant' ? denomination ?? null : null,
      providerName === 'lithic', // isPremium
      expiresAt,
      { nickname }
    )

    // Record the creation transaction
    await recordTransaction(
      card.id,
      user.id,
      providerName,
      'creation',
      totalCost,
      cardType === 'virtual' ? pricing.creationFee : 0,
      result.cardId,
      undefined,
      undefined,
      `Created ${cardType} card`
    )

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
        isPremium: card.isPremium,
        createdAt: card.createdAt,
        cost: totalCost
      }
    })
  } catch (error: any) {
    console.error('Error creating card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create card' },
      { status: 500 }
    )
  }
}
