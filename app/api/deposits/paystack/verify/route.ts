import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery, getSiteSetting } from '@/lib/db-helpers'
import { getServerApiUrl } from '@/lib/server-api-url'

/**
 * POST /api/deposits/paystack/verify
 * Verifies Paystack payment and credits wallet via Railway
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

    const { depositId, reference } = await req.json()

    if (!depositId || !reference) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID and reference are required' },
        { status: 400 }
      )
    }

    // Verify deposit exists and belongs to user
    const depositResult = await executeQuery(
      `SELECT * FROM deposits WHERE id = $1 AND user_id = $2 AND payment_method = 'PAYSTACK'`,
      [depositId, user.id]
    )

    if (depositResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      )
    }

    const deposit = depositResult.rows[0]

    if (deposit.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        data: { message: 'Deposit already completed' },
      })
    }

    // Get Paystack secret key from settings
    const mode = (await getSiteSetting('paystackMode')) || 'test'
    const secretKey = mode === 'live'
      ? await getSiteSetting('paystackLiveSecretKey')
      : await getSiteSetting('paystackTestSecretKey')

    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Paystack is not configured' },
        { status: 503 }
      )
    }

    // Verify payment with Paystack API
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    )

    if (!verifyResponse.ok) {
      throw new Error('Failed to verify payment with Paystack')
    }

    const verifyData = await verifyResponse.json()

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      return NextResponse.json(
        { success: false, error: 'Payment was not successful' },
        { status: 400 }
      )
    }

    // Payment verified — credit wallet via Railway
    const apiUrl = getServerApiUrl()
    const authHeader = req.headers.get('authorization')

    const completeResponse = await fetch(`${apiUrl}/deposits/${depositId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify({ gatewayTxnId: reference }),
    })

    if (!completeResponse.ok) {
      console.error('Failed to finalize Paystack deposit:', await completeResponse.text())
      await executeQuery(
        `UPDATE deposits SET status = 'PROCESSING', failure_reason = 'Wallet credit failed - requires manual review', updated_at = NOW() WHERE id = $1`,
        [depositId]
      )
      return NextResponse.json(
        { success: false, error: 'Payment verified but wallet credit failed. Please contact support.' },
        { status: 500 }
      )
    }

    // Sync local record
    await executeQuery(
      `UPDATE deposits SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [depositId]
    )

    return NextResponse.json({
      success: true,
      data: { message: 'Payment verified and wallet credited' },
    })
  } catch (error: any) {
    console.error('Paystack verify error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
