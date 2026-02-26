import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { verifyBlockchainPayment, getExplorerUrl } from '@/lib/blockchain/verify'
import { fulfillOrder } from '@/lib/order-fulfillment'

/**
 * GET /api/payments/crypto/check/[paymentId]
 * Checks blockchain for payment confirmation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Get pending payment record
    const result = await executeQuery(
      `SELECT * FROM pending_crypto_payments WHERE id = $1`,
      [paymentId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    const payment = result.rows[0]

    // If already confirmed or manually confirmed, return current status
    if (payment.status === 'CONFIRMED' || payment.status === 'MANUALLY_CONFIRMED') {
      return NextResponse.json({
        success: true,
        data: {
          status: payment.status,
          txHash: payment.tx_hash,
          confirmedAmount: payment.confirmed_amount,
          confirmations: payment.confirmations,
          explorerUrl: payment.tx_hash ? getExplorerUrl(payment.network, payment.tx_hash) : null
        }
      })
    }

    // If expired, return expired status
    if (payment.status === 'EXPIRED') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'EXPIRED',
          message: 'Payment window has expired',
          userTxHash: payment.user_tx_hash,
          explorerUrl: payment.user_tx_hash ? getExplorerUrl(payment.network, payment.user_tx_hash) : null
        }
      })
    }

    // Check if time has expired
    const expiresAt = new Date(payment.expires_at)
    if (expiresAt < new Date()) {
      await executeQuery(
        `UPDATE pending_crypto_payments SET status = 'EXPIRED', updated_at = NOW()
         WHERE id = $1`,
        [paymentId]
      )

      return NextResponse.json({
        success: true,
        data: {
          status: 'EXPIRED',
          message: 'Payment window has expired',
          userTxHash: payment.user_tx_hash,
          explorerUrl: payment.user_tx_hash ? getExplorerUrl(payment.network, payment.user_tx_hash) : null
        }
      })
    }

    // Verify on blockchain
    const verification = await verifyBlockchainPayment({
      network: payment.network,
      address: payment.receiving_address,
      expectedAmount: parseFloat(payment.expected_amount),
      tolerancePercent: parseFloat(payment.tolerance_percent || '2'),
      sinceTimestamp: new Date(payment.initiated_at).getTime(),
      userTxHash: payment.user_tx_hash || undefined
    })

    // Update last checked timestamp
    await executeQuery(
      `UPDATE pending_crypto_payments SET last_checked_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [paymentId]
    )

    if (verification.found && verification.txHash) {
      // Payment found! Update status
      await executeQuery(
        `UPDATE pending_crypto_payments
         SET status = 'CONFIRMED', tx_hash = $2, confirmed_amount = $3,
             confirmations = $4, confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [paymentId, verification.txHash, verification.amount, verification.confirmations || 0]
      )

      // Update order status to PAID and CONFIRMED
      await executeQuery(
        `UPDATE orders SET "paymentStatus" = 'PAID', status = 'CONFIRMED',
         "paidAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $1`,
        [payment.order_id]
      )

      // Fulfill digital products (eSIMs, scripts, etc.)
      try {
        const fulfillmentResult = await fulfillOrder(payment.order_id)
        if (!fulfillmentResult.success) {
          console.warn('Order fulfillment had issues:', fulfillmentResult)
        }
      } catch (fulfillmentError) {
        // Log but don't fail the payment confirmation
        console.error('Order fulfillment error:', fulfillmentError)
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'CONFIRMED',
          txHash: verification.txHash,
          confirmedAmount: verification.amount,
          confirmations: verification.confirmations,
          explorerUrl: getExplorerUrl(payment.network, verification.txHash)
        }
      })
    }

    // Not found yet, return pending status with time remaining
    const timeRemaining = expiresAt.getTime() - Date.now()

    return NextResponse.json({
      success: true,
      data: {
        status: 'PENDING',
        timeRemaining: Math.max(0, timeRemaining),
        expiresAt: payment.expires_at,
        lastCheckedAt: new Date().toISOString(),
        network: payment.network,
        expectedAmount: payment.expected_amount,
        userTxHash: payment.user_tx_hash,
        verificationError: verification.error || null
      }
    })
  } catch (error: any) {
    console.error('Check crypto payment error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check payment' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/payments/crypto/check/[paymentId]
 * Update user-provided transaction hash
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params
    const body = await request.json()
    const { userTxHash } = body

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    if (!userTxHash) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash is required' },
        { status: 400 }
      )
    }

    // Update user_tx_hash
    const result = await executeQuery(
      `UPDATE pending_crypto_payments
       SET user_tx_hash = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING id, network`,
      [paymentId, userTxHash]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment not found or not pending' },
        { status: 404 }
      )
    }

    const payment = result.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        message: 'Transaction hash saved',
        explorerUrl: getExplorerUrl(payment.network, userTxHash)
      }
    })
  } catch (error: any) {
    console.error('Update crypto payment error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update payment' },
      { status: 500 }
    )
  }
}
