import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getSiteSetting, executeQuery } from '@/lib/db-helpers'

/**
 * POST /api/deposits/stripe
 * Creates a deposit record and Stripe PaymentIntent for wallet deposit
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

    const { amount, currency = 'usd' } = await req.json()

    if (!amount || amount < 5 || amount > 10000) {
      return NextResponse.json(
        { success: false, error: 'Amount must be between $5 and $10,000' },
        { status: 400 }
      )
    }

    // Get Stripe secret key from site settings
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

    // Create deposit record in database
    const depositResult = await executeQuery(
      `INSERT INTO deposits (user_id, amount, currency, payment_method, status)
       VALUES ($1, $2, $3, 'CARD', 'PENDING')
       RETURNING id`,
      [user.id, amount, currency.toUpperCase()]
    )

    const depositId = depositResult.rows[0].id

    // Create Stripe PaymentIntent
    const stripe = new Stripe(secretKey)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency,
      metadata: { depositId, userId: user.id },
      automatic_payment_methods: { enabled: true },
    })

    // Update deposit with Stripe intent ID
    await executeQuery(
      `UPDATE deposits
       SET stripe_payment_intent_id = $1, stripe_client_secret = $2, updated_at = NOW()
       WHERE id = $3`,
      [paymentIntent.id, paymentIntent.client_secret, depositId]
    )

    return NextResponse.json({
      success: true,
      data: {
        depositId,
        clientSecret: paymentIntent.client_secret,
        intentId: paymentIntent.id,
      },
    })
  } catch (error: any) {
    console.error('Stripe deposit error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create deposit' },
      { status: 500 }
    )
  }
}
