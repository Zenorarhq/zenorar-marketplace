import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteSetting } from '@/lib/db-helpers'
import { executeQuery } from '@/lib/db-helpers'

// POST /api/payments/stripe/confirm
// Confirms a Stripe payment succeeded and updates the order status
export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentIntentId } = await req.json()

    if (!orderId || !paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'orderId and paymentIntentId are required' },
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

    // Verify the PaymentIntent actually succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: 'Payment has not succeeded' },
        { status: 400 }
      )
    }

    // Update order: paymentStatus = PAID, status = CONFIRMED
    await executeQuery(
      `UPDATE orders SET "paymentStatus" = 'PAID', status = 'CONFIRMED', "paidAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
      [orderId]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Stripe confirm error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
