import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getSiteSetting, executeQuery } from '@/lib/db-helpers'

/**
 * POST /api/deposits/stripe/confirm
 * Confirms Stripe payment succeeded and credits wallet balance
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { depositId, paymentIntentId } = await req.json()

    if (!depositId || !paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'depositId and paymentIntentId are required' },
        { status: 400 }
      )
    }

    // Get deposit record
    const depositResult = await executeQuery(
      `SELECT id, user_id, amount, status FROM deposits WHERE id = $1`,
      [depositId]
    )

    if (depositResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      )
    }

    const deposit = depositResult.rows[0]

    // Verify deposit belongs to user
    if (deposit.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Skip if already completed
    if (deposit.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        data: { message: 'Deposit already completed' },
      })
    }

    // Get Stripe secret key
    const mode = (await getSiteSetting('stripeMode')) || 'test'
    const secretKey = mode === 'live'
      ? await getSiteSetting('stripeLiveSecretKey')
      : await getSiteSetting('stripeTestSecretKey')

    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const stripe = new Stripe(secretKey)

    // Verify the PaymentIntent actually succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: 'Payment has not succeeded' },
        { status: 400 }
      )
    }

    // Verify metadata matches
    if (paymentIntent.metadata.depositId !== depositId) {
      return NextResponse.json(
        { success: false, error: 'Payment intent does not match deposit' },
        { status: 400 }
      )
    }

    // Complete deposit and credit wallet via Railway backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
    const completeResponse = await fetch(`${apiUrl}/deposits/${depositId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.get('authorization') && {
          Authorization: req.headers.get('authorization')!,
        }),
      },
      body: JSON.stringify({ gatewayTxnId: paymentIntentId }),
    })

    if (!completeResponse.ok) {
      console.error('Failed to finalize deposit:', await completeResponse.text())
      await executeQuery(
        `UPDATE deposits SET status = 'PROCESSING', failure_reason = 'Wallet credit failed - requires manual review', updated_at = NOW() WHERE id = $1`,
        [depositId]
      )
      return NextResponse.json(
        { success: false, error: 'Payment succeeded but wallet credit failed. Please contact support.' },
        { status: 500 }
      )
    }

    // Sync local record
    await executeQuery(
      `UPDATE deposits SET status = 'COMPLETED', gateway_txn_id = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [paymentIntentId, depositId]
    )

    return NextResponse.json({
      success: true,
      data: { message: 'Deposit completed successfully' },
    })
  } catch (error: any) {
    console.error('Stripe confirm error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm deposit' },
      { status: 500 }
    )
  }
}
