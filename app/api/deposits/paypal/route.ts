import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery, getSiteSetting } from '@/lib/db-helpers'

/**
 * POST /api/deposits/paypal
 * Creates a PayPal order for wallet deposit and returns approval URL
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

    const { amount } = await req.json()

    // Validate amount
    if (!amount || amount < 5 || amount > 10000) {
      return NextResponse.json(
        { success: false, error: 'Amount must be between $5 and $10,000' },
        { status: 400 }
      )
    }

    // Get PayPal credentials from settings
    const mode = (await getSiteSetting('paypalMode')) || 'sandbox'
    const clientId = mode === 'live'
      ? await getSiteSetting('paypalLiveClientId')
      : await getSiteSetting('paypalSandboxClientId')
    const clientSecret = mode === 'live'
      ? await getSiteSetting('paypalLiveClientSecret')
      : await getSiteSetting('paypalSandboxClientSecret')

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'PayPal is not configured' },
        { status: 503 }
      )
    }

    // Create deposit record in database
    const depositResult = await executeQuery(
      `INSERT INTO deposits (user_id, amount, currency, payment_method, status)
       VALUES ($1, $2, 'USD', 'PAYPAL', 'PENDING')
       RETURNING id`,
      [user.id, amount]
    )
    const depositId = depositResult.rows[0].id

    // PayPal API base URL
    const baseUrl = mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com'

    // Get access token from PayPal
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    if (!authResponse.ok) {
      console.error('PayPal auth failed:', await authResponse.text())
      throw new Error('Failed to authenticate with PayPal')
    }

    const { access_token } = await authResponse.json()

    // Get app URL for return/cancel
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create PayPal order
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
          description: `Wallet Deposit #${depositId.slice(0, 8)}`,
        }],
        application_context: {
          brand_name: 'Zenorar',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: `${appUrl}/profile/wallet?deposit=paypal_success&depositId=${depositId}`,
          cancel_url: `${appUrl}/profile/wallet?deposit=cancelled`,
        },
      }),
    })

    if (!orderResponse.ok) {
      console.error('PayPal order creation failed:', await orderResponse.text())
      throw new Error('Failed to create PayPal order')
    }

    const order = await orderResponse.json()

    // Update deposit with PayPal order ID
    await executeQuery(
      `UPDATE deposits SET paypal_order_id = $1, updated_at = NOW() WHERE id = $2`,
      [order.id, depositId]
    )

    // Find approval URL
    const approvalUrl = order.links?.find((l: any) => l.rel === 'approve')?.href

    if (!approvalUrl) {
      throw new Error('No approval URL returned from PayPal')
    }

    return NextResponse.json({
      success: true,
      data: {
        depositId,
        orderId: order.id,
        approvalUrl,
      },
    })
  } catch (error: any) {
    console.error('PayPal deposit error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create PayPal deposit' },
      { status: 500 }
    )
  }
}
