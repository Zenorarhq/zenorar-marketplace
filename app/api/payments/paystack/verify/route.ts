import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fulfillOrder } from '@/lib/order-fulfillment'
import { getSiteSetting } from '@/lib/db-helpers'

/**
 * POST /api/payments/paystack/verify
 * Verify a Paystack payment and update order status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      )
    }

    // Get Paystack secret key based on mode (test/live)
    let secretKey = process.env.PAYSTACK_SECRET_KEY

    if (!secretKey) {
      // Get mode and mode-specific secret key from database settings
      const mode = await getSiteSetting('paystackMode') || 'test'
      secretKey = mode === 'live'
        ? await getSiteSetting('paystackLiveSecretKey')
        : await getSiteSetting('paystackTestSecretKey')

      // Fallback to legacy key name if mode-specific not found
      if (!secretKey) {
        const legacyResult = await query(
          `SELECT value FROM site_settings WHERE key = 'paystackSecretKey'`
        )
        if (legacyResult.rows.length > 0) {
          try {
            secretKey = JSON.parse(legacyResult.rows[0].value)
          } catch {
            secretKey = legacyResult.rows[0].value
          }
        }
      }
    }

    if (!secretKey) {
      console.error('Paystack secret key not configured')
      return NextResponse.json(
        { success: false, error: 'Payment provider not configured' },
        { status: 500 }
      )
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const verifyData = await verifyResponse.json()

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      console.error('Paystack verification failed:', verifyData)
      return NextResponse.json(
        { success: false, error: verifyData.message || 'Payment verification failed' },
        { status: 400 }
      )
    }

    // Extract order info from reference (format: ORDER_ORDERNUMBER_TIMESTAMP)
    const refParts = reference.split('_')
    const orderNumber = refParts.length >= 2 ? refParts[1] : null

    if (!orderNumber) {
      console.error('Could not extract order number from reference:', reference)
      return NextResponse.json(
        { success: false, error: 'Invalid payment reference format' },
        { status: 400 }
      )
    }

    // Find the order
    const orderResult = await query(
      `SELECT id, "userId", status, "paymentStatus" FROM orders WHERE "orderNumber" = $1`,
      [orderNumber]
    )

    if (orderResult.rows.length === 0) {
      console.error('Order not found:', orderNumber)
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const order = orderResult.rows[0]

    // Update order payment status
    await query(
      `UPDATE orders
       SET "paymentStatus" = 'PAID',
           "paidAt" = NOW(),
           "updatedAt" = NOW()
       WHERE id = $1`,
      [order.id]
    )

    // Run fulfillment for digital products
    try {
      const fulfillmentResult = await fulfillOrder(order.id)

      if (fulfillmentResult.success) {
        // Update order status to confirmed
        await query(
          `UPDATE orders SET status = 'CONFIRMED', "updatedAt" = NOW() WHERE id = $1`,
          [order.id]
        )
      } else {
        console.error('Fulfillment had issues:', fulfillmentResult)
        // Order is paid but fulfillment failed - needs manual review
        // Log the actual error details in adminNote for debugging
        const failedItems = fulfillmentResult.details?.filter((d: any) => d.status === 'failed') || []
        const errorDetails = failedItems.map((d: any) => `${d.productType}: ${d.error || 'Unknown error'}`).join('; ')

        await query(
          `UPDATE orders SET status = 'PROCESSING', "adminNote" = $2, "updatedAt" = NOW() WHERE id = $1`,
          [order.id, `[Auto] Fulfillment failed: ${errorDetails || 'No details'}`]
        )
      }
    } catch (fulfillError) {
      console.error('Fulfillment error:', fulfillError)
      // Don't fail the verification - payment was successful
    }

    // Send success notification
    if (order.userId) {
      await query(
        `INSERT INTO notifications (id, "userId", type, title, message, metadata)
         VALUES (gen_random_uuid()::text, $1, 'ORDER_CONFIRMED'::"NotificationType",
                 'Payment Confirmed',
                 $2,
                 $3::jsonb)`,
        [
          order.userId,
          `Your payment for order #${orderNumber} has been confirmed!`,
          JSON.stringify({ orderId: order.id, orderNumber, reference })
        ]
      ).catch(err => console.error('Failed to send notification:', err))
    }

    return NextResponse.json({
      success: true,
      data: {
        reference,
        orderNumber,
        orderId: order.id,
        amount: verifyData.data?.amount / 100, // Paystack returns amount in kobo/cents
        currency: verifyData.data?.currency,
        paidAt: verifyData.data?.paid_at,
      }
    })

  } catch (error: any) {
    console.error('Paystack verification error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
