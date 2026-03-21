export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import {
  getCardById,
  getProviderPricing,
  updateCardBalance,
  recordTransaction,
  calculateTopUpFee
} from '@/lib/cards/service'
import { getProvider } from '@/lib/cards/providers'
import { executeQuery } from '@/lib/db-helpers'

/**
 * POST /api/cards/[id]/top-up
 * Top up a virtual card balance
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

    // Only virtual cards can be topped up ('virtual_card' is a legacy value stored by older purchases)
    if (card.cardType !== 'virtual' && (card.cardType as string) !== 'virtual_card') {
      return NextResponse.json(
        { success: false, error: 'Instant cards cannot be topped up' },
        { status: 400 }
      )
    }

    // Check card is active
    if (card.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Card is not active' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { amount } = body as { amount: number }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Get pricing — fall back to defaults for test/unknown providers
    const pricing = await getProviderPricing(card.provider) ?? {
      minTopUp: 1,
      maxTopUp: 10000,
      topUpFeePercent: 0,
    }

    // Validate amount range
    if (amount < pricing.minTopUp) {
      return NextResponse.json(
        { success: false, error: `Minimum top-up is $${pricing.minTopUp}` },
        { status: 400 }
      )
    }

    if (amount > pricing.maxTopUp) {
      return NextResponse.json(
        { success: false, error: `Maximum top-up is $${pricing.maxTopUp}` },
        { status: 400 }
      )
    }

    // Calculate total cost with fee
    const fee = calculateTopUpFee(amount, pricing.topUpFeePercent)
    const totalCost = amount + fee

    // Check user's wallet balance
    const walletResult = await executeQuery<any>(
      'SELECT id, balance, is_frozen FROM wallet_balances WHERE user_id = $1',
      [user.id]
    )

    if (walletResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient balance. Please add funds to your wallet.' },
        { status: 400 }
      )
    }

    if (walletResult.rows[0].is_frozen) {
      return NextResponse.json(
        { success: false, error: 'Your wallet is currently frozen. Please contact support.' },
        { status: 403 }
      )
    }

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

    // Get provider and top up
    const provider = getProvider(card.provider)
    if (!provider || !provider.topUp) {
      // If provider doesn't support real top-up, just update our database
      // This is for when using sandbox/test mode
      const newBalance = card.balance + amount

      // Deduct from wallet
      await executeQuery(
        'UPDATE wallet_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [totalCost, user.id]
      )

      // Update card balance
      await updateCardBalance(id, newBalance)

      // Record transaction
      await recordTransaction(
        id,
        user.id,
        card.provider,
        'top_up',
        amount,
        fee,
        undefined,
        undefined,
        undefined,
        `Top up $${amount.toFixed(2)}`
      )

      return NextResponse.json({
        success: true,
        data: {
          newBalance,
          amountAdded: amount,
          fee,
          totalCharged: totalCost
        }
      })
    }

    // Call provider to top up
    const result = await provider.topUp(card.providerCardId || id, amount)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Top up failed' },
        { status: 500 }
      )
    }

    // Deduct from wallet
    await executeQuery(
      'UPDATE wallet_balances SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
      [totalCost, user.id]
    )

    // Update card balance in database
    const newBalance = result.newBalance ?? (card.balance + amount)
    await updateCardBalance(id, newBalance)

    // Record transaction
    await recordTransaction(
      id,
      user.id,
      card.provider,
      'top_up',
      amount,
      fee,
      result.transactionId,
      undefined,
      undefined,
      `Top up $${amount.toFixed(2)}`
    )

    return NextResponse.json({
      success: true,
      data: {
        newBalance,
        amountAdded: amount,
        fee,
        totalCharged: totalCost
      }
    })
  } catch (error: any) {
    console.error('Error topping up card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to top up card' },
      { status: 500 }
    )
  }
}
