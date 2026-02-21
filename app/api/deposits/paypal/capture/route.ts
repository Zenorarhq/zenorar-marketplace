import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery, getSiteSetting } from '@/lib/db-helpers'

/**
 * POST /api/deposits/paypal/capture
 * Captures PayPal payment after user approves and credits wallet
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

    const { depositId, orderId } = await req.json()

    if (!depositId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID and Order ID are required' },
        { status: 400 }
      )
    }

    // Verify the deposit exists and belongs to this user
    const depositResult = await executeQuery(
      `SELECT * FROM deposits WHERE id = $1 AND user_id = $2 AND payment_method = 'PAYPAL'`,
      [depositId, user.id]
    )

    if (depositResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      )
    }

    const deposit = depositResult.rows[0]

    // Check if already completed
    if (deposit.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        data: { message: 'Deposit already completed' },
      })
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
      throw new Error('Failed to authenticate with PayPal')
    }

    const { access_token } = await authResponse.json()

    // Capture the payment
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text()
      console.error('PayPal capture failed:', errorText)
      throw new Error('Failed to capture PayPal payment')
    }

    const captureResult = await captureResponse.json()

    // Check if capture was successful
    if (captureResult.status !== 'COMPLETED') {
      throw new Error(`Payment capture failed: ${captureResult.status}`)
    }

    // Update deposit status to COMPLETED
    await executeQuery(
      `UPDATE deposits SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [depositId]
    )

    // Credit wallet via external backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
    const authHeader = req.headers.get('authorization')

    try {
      const creditResponse = await fetch(`${apiUrl}/wallet/credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { Authorization: authHeader }),
        },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(deposit.amount),
          description: `PayPal deposit #${depositId.slice(0, 8)}`,
        }),
      })

      if (!creditResponse.ok) {
        console.error('Failed to credit wallet:', await creditResponse.text())
        // Mark for manual review but still return success
        await executeQuery(
          `UPDATE deposits SET failure_reason = 'Wallet credit failed - requires manual review', updated_at = NOW() WHERE id = $1`,
          [depositId]
        )
      }
    } catch (creditError) {
      console.error('Credit wallet error:', creditError)
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Payment captured successfully',
        amount: deposit.amount,
      },
    })
  } catch (error: any) {
    console.error('PayPal capture error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to capture PayPal payment' },
      { status: 500 }
    )
  }
}
