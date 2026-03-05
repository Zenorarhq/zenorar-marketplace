import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getSiteSetting, executeQuery } from '@/lib/db-helpers'

// POST /api/payments/stripe/create-intent
// Creates a Stripe PaymentIntent for one-time card payment
export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { currency = 'usd', orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Look up the order's actual total from DB (never trust client amount)
    const orderResult = await executeQuery(
      `SELECT total, "discountAmount" FROM orders WHERE id = $1 AND "userId" = $2`,
      [orderId, user.id]
    )
    if (orderResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }
    const amount = Number(orderResult.rows[0].total) - Number(orderResult.rows[0].discountAmount || 0)

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

    const stripe = new Stripe(secretKey)

    // Create PaymentIntent (amount in cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { orderId },
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({
      success: true,
      data: { clientSecret: paymentIntent.client_secret },
    })
  } catch (error: any) {
    console.error('Stripe PaymentIntent error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
