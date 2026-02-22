import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'
import { verifyBlockchainPayment, getExplorerUrl } from '@/lib/blockchain/verify'
import { getServerApiUrl } from '@/lib/server-api-url'

/**
 * GET /api/deposits/crypto/check/[depositId]
 * Polls blockchain for deposit confirmation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const { depositId } = await params

    if (!depositId) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID is required' },
        { status: 400 }
      )
    }

    // Get deposit record
    const result = await executeQuery(
      `SELECT * FROM deposits WHERE id = $1`,
      [depositId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found' },
        { status: 404 }
      )
    }

    const deposit = result.rows[0]

    // If already completed, return current status
    if (deposit.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'CONFIRMED',
          txHash: deposit.crypto_tx_hash,
          confirmedAmount: deposit.crypto_amount,
          explorerUrl: deposit.crypto_tx_hash
            ? getExplorerUrl(deposit.crypto_network, deposit.crypto_tx_hash)
            : null,
        },
      })
    }

    // Check if expired (45 minutes from creation)
    const createdAt = new Date(deposit.created_at)
    const expiresAt = new Date(createdAt.getTime() + 45 * 60 * 1000)

    if (deposit.status === 'EXPIRED') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'EXPIRED',
          message: 'Payment window has expired',
          userTxHash: deposit.crypto_tx_hash,
          explorerUrl: deposit.crypto_tx_hash
            ? getExplorerUrl(deposit.crypto_network, deposit.crypto_tx_hash)
            : null,
        },
      })
    }

    // Check if time has expired
    if (expiresAt < new Date()) {
      await executeQuery(
        `UPDATE deposits SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
        [depositId]
      )

      return NextResponse.json({
        success: true,
        data: {
          status: 'EXPIRED',
          message: 'Payment window has expired',
          userTxHash: deposit.crypto_tx_hash,
          explorerUrl: deposit.crypto_tx_hash
            ? getExplorerUrl(deposit.crypto_network, deposit.crypto_tx_hash)
            : null,
        },
      })
    }

    // Verify on blockchain
    const verification = await verifyBlockchainPayment({
      network: deposit.crypto_network,
      address: deposit.crypto_address,
      expectedAmount: parseFloat(deposit.crypto_amount || '0'),
      tolerancePercent: 2,
      sinceTimestamp: createdAt.getTime(),
      userTxHash: deposit.crypto_tx_hash || undefined,
    })

    if (verification.found && verification.txHash) {
      // Payment found! Complete deposit via Railway API
      const apiUrl = getServerApiUrl()
      const authHeader = request.headers.get('authorization')

      try {
        const completeResponse = await fetch(`${apiUrl}/deposits/${depositId}/crypto-complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader && { Authorization: authHeader }),
          },
          body: JSON.stringify({
            txHash: verification.txHash,
            amount: verification.amount,
          }),
        })

        if (!completeResponse.ok) {
          const errorText = await completeResponse.text()
          console.error('Failed to complete crypto deposit:', errorText)
          // Update local record for manual review
          await executeQuery(
            `UPDATE deposits SET status = 'PROCESSING', crypto_tx_hash = $2, crypto_amount = $3, failure_reason = 'Wallet credit failed - requires manual review', updated_at = NOW() WHERE id = $1`,
            [depositId, verification.txHash, verification.amount]
          )
          // Return PROCESSING - payment detected but wallet not credited
          return NextResponse.json({
            success: true,
            data: {
              status: 'PROCESSING',
              txHash: verification.txHash,
              confirmedAmount: verification.amount,
              explorerUrl: getExplorerUrl(deposit.crypto_network, verification.txHash),
              message: 'Payment detected but wallet credit pending. Please contact support if not resolved shortly.',
            },
          })
        } else {
          // Update local record to match Railway
          await executeQuery(
            `UPDATE deposits
             SET status = 'COMPLETED', crypto_tx_hash = $2, crypto_amount = $3,
                 completed_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [depositId, verification.txHash, verification.amount]
          )
        }
      } catch (creditError) {
        console.error('Complete crypto deposit error:', creditError)
        // Save tx hash even if completion failed
        await executeQuery(
          `UPDATE deposits SET status = 'PROCESSING', crypto_tx_hash = $2, crypto_amount = $3, failure_reason = 'Wallet credit failed - requires manual review', updated_at = NOW() WHERE id = $1`,
          [depositId, verification.txHash, verification.amount]
        ).catch(() => {})
        return NextResponse.json({
          success: true,
          data: {
            status: 'PROCESSING',
            txHash: verification.txHash,
            confirmedAmount: verification.amount,
            explorerUrl: getExplorerUrl(deposit.crypto_network, verification.txHash),
            message: 'Payment detected but wallet credit pending. Please contact support if not resolved shortly.',
          },
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'CONFIRMED',
          txHash: verification.txHash,
          confirmedAmount: verification.amount,
          confirmations: verification.confirmations,
          explorerUrl: getExplorerUrl(deposit.crypto_network, verification.txHash),
        },
      })
    }

    // Not found yet, return pending status with time remaining
    const timeRemaining = expiresAt.getTime() - Date.now()

    return NextResponse.json({
      success: true,
      data: {
        status: 'PENDING',
        timeRemaining: Math.max(0, timeRemaining),
        expiresAt: expiresAt.toISOString(),
        lastCheckedAt: new Date().toISOString(),
        network: deposit.crypto_network,
        expectedAmount: deposit.crypto_amount,
        userTxHash: deposit.crypto_tx_hash,
        verificationError: verification.error || null,
      },
    })
  } catch (error: any) {
    console.error('Check crypto deposit error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check deposit' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/deposits/crypto/check/[depositId]
 * Update user-provided transaction hash
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { depositId } = await params
    const body = await request.json()
    const { userTxHash } = body

    if (!depositId) {
      return NextResponse.json(
        { success: false, error: 'Deposit ID is required' },
        { status: 400 }
      )
    }

    if (!userTxHash) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash is required' },
        { status: 400 }
      )
    }

    // Update tx hash
    const result = await executeQuery(
      `UPDATE deposits
       SET crypto_tx_hash = $2, updated_at = NOW()
       WHERE id = $1 AND user_id = $3 AND status = 'PENDING'
       RETURNING id, crypto_network`,
      [depositId, userTxHash, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found or not pending' },
        { status: 404 }
      )
    }

    const deposit = result.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        message: 'Transaction hash saved',
        explorerUrl: getExplorerUrl(deposit.crypto_network, userTxHash),
      },
    })
  } catch (error: any) {
    console.error('Update crypto deposit error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update deposit' },
      { status: 500 }
    )
  }
}
