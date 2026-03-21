import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteSetting } from '@/lib/db-helpers'
import { executeQuery } from '@/lib/db-helpers'
import { fulfillOrder } from '@/lib/order-fulfillment'

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

    // Fulfill digital products (eSIMs, scripts, etc.)
    let fulfillmentResult: any = null
    try {
      fulfillmentResult = await fulfillOrder(orderId)
      if (!fulfillmentResult.success) {
        console.warn('Order fulfillment had issues:', fulfillmentResult)
      }
    } catch (fulfillmentError) {
      // Log but don't fail the payment confirmation
      console.error('Order fulfillment error:', fulfillmentError)
    }

    // Send notification for digital product delivery
    try {
      const orderResult = await executeQuery(
        `SELECT o."userId", o."orderNumber", oi.product_type
         FROM orders o
         JOIN order_items oi ON oi."orderId" = o.id
         WHERE o.id = $1`,
        [orderId]
      )

      if (orderResult.rows.length > 0 && orderResult.rows[0].userId) {
        const userId = orderResult.rows[0].userId
        const orderNumber = orderResult.rows[0].orderNumber
        const productTypes = orderResult.rows.map((r: any) => r.product_type)
        const hasEsims = productTypes.includes('esim')
        const hasGiftCards = productTypes.includes('gift_card')
        const hasCards = productTypes.includes('virtual_card') || productTypes.includes('instant_card')
        const fulfilled = fulfillmentResult?.success

        // Cards already get a "Card Delivered" notification from fulfillOrder — skip generic one
        if (hasCards && !hasEsims && !hasGiftCards) return

        let title = 'Payment Confirmed'
        let message = `Your payment for order #${orderNumber} has been confirmed.`

        if (fulfilled && hasEsims && !hasGiftCards) {
          title = 'eSIM Delivered'
          message = `Your eSIM from order #${orderNumber} is ready! Check your library for setup instructions.`
        } else if (fulfilled && hasGiftCards && !hasEsims) {
          title = 'Gift Card Delivered'
          message = `Your gift card from order #${orderNumber} is ready!`
        } else if (fulfilled) {
          title = 'Order Delivered'
          message = `Your order #${orderNumber} has been fulfilled. Check your library!`
        }

        await executeQuery(
          `INSERT INTO notifications (id, "userId", type, title, message, metadata)
           VALUES (gen_random_uuid()::text, $1, 'ORDER_CONFIRMED'::"NotificationType", $2, $3, $4::jsonb)`,
          [userId, title, message, JSON.stringify({ orderId, orderNumber })]
        )
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Stripe confirm error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
