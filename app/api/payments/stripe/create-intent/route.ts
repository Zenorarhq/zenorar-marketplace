import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteSetting } from '@/lib/db-helpers'

// POST /api/payments/stripe/create-intent
// Creates a Stripe PaymentIntent for one-time card payment
export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'usd', orderId } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
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
