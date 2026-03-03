import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { virtualNumberService } from '@/lib/virtual-numbers/service'
import { query } from '@/lib/db'

/**
 * GET /api/virtual-numbers/my-numbers/[id]/renew
 * Get renewal price for a virtual number
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

    const result = await virtualNumberService.getRenewalPrice(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      )
    }

    // Also get wallet balance for the user
    const walletResult = await query(
      `SELECT balance FROM user_wallets WHERE user_id = $1`,
      [user.id]
    )
    const walletBalance = walletResult.rows.length > 0 ? parseFloat(walletResult.rows[0].balance) : 0

    return NextResponse.json({
      success: true,
      price: result.price,
      durationDays: result.durationDays,
      walletBalance,
      canPayWithWallet: walletBalance >= (result.price || 0)
    })
  } catch (error: any) {
    console.error('Error getting renewal price:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get renewal price' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/virtual-numbers/my-numbers/[id]/renew
 * Renew a virtual number with payment
 */
export async function POST(
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
    const body = await request.json().catch(() => ({}))
    const paymentMethod = body.paymentMethod || 'wallet'

    // 1. Get the renewal price
    const priceResult = await virtualNumberService.getRenewalPrice(id, user.id)
    if (!priceResult.success || !priceResult.price) {
      return NextResponse.json(
        { success: false, error: priceResult.error || 'Could not determine renewal price' },
        { status: 400 }
      )
    }

    const renewalPrice = priceResult.price

    // 2. Handle payment based on method
    if (paymentMethod === 'wallet') {
      // Check wallet balance
      const walletResult = await query(
        `SELECT balance FROM user_wallets WHERE user_id = $1`,
        [user.id]
      )

      if (walletResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Wallet not found. Please deposit funds first.' },
          { status: 400 }
        )
      }

      const currentBalance = parseFloat(walletResult.rows[0].balance)

      if (currentBalance < renewalPrice) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient wallet balance',
            required: renewalPrice,
            available: currentBalance
          },
          { status: 400 }
        )
      }

      // Start transaction for payment and renewal
      await query('BEGIN')

      try {
        // Deduct from wallet
        await query(
          `UPDATE user_wallets
           SET balance = balance - $1, updated_at = NOW()
           WHERE user_id = $2`,
          [renewalPrice, user.id]
        )

        // Get number details for transaction record
        const numberResult = await query(
          `SELECT phone_number, phone_number_display FROM user_virtual_numbers WHERE id = $1`,
          [id]
        )
        const numberInfo = numberResult.rows[0]

        // Record wallet transaction
        await query(
          `INSERT INTO wallet_transactions
             (user_id, type, amount, balance_before, balance_after, description, reference_type, reference_id)
           VALUES ($1, 'DEBIT', $2, $3, $4, $5, 'virtual_number_renewal', $6)`,
          [
            user.id,
            renewalPrice,
            currentBalance,
            currentBalance - renewalPrice,
            `Virtual number renewal: ${numberInfo?.phone_number_display || numberInfo?.phone_number || id}`,
            id
          ]
        )

        // 3. Renew the number
        const renewResult = await virtualNumberService.renewNumber(id, user.id)

        if (!renewResult.success) {
          // Rollback if renewal fails
          await query('ROLLBACK')
          return NextResponse.json(
            { success: false, error: renewResult.error },
            { status: 400 }
          )
        }

        // Commit transaction
        await query('COMMIT')

        return NextResponse.json({
          success: true,
          newExpiresAt: renewResult.newExpiresAt,
          amountPaid: renewalPrice,
          paymentMethod: 'wallet',
          newBalance: currentBalance - renewalPrice,
          message: 'Virtual number renewed successfully'
        })
      } catch (error) {
        await query('ROLLBACK')
        throw error
      }
    } else {
      // For other payment methods, return the price to initiate checkout
      return NextResponse.json({
        success: false,
        error: 'Please complete payment to renew',
        requiresPayment: true,
        price: renewalPrice,
        durationDays: priceResult.durationDays,
        paymentMethods: ['wallet', 'card', 'crypto']
      }, { status: 402 }) // Payment Required
    }
  } catch (error: any) {
    console.error('Error renewing virtual number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to renew virtual number' },
      { status: 500 }
    )
  }
}
