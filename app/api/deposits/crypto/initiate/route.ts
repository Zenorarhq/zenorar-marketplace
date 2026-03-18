import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery, getSiteSetting } from '@/lib/db-helpers'

const VALID_NETWORKS = ['BTC', 'ETH', 'USDT_ERC20', 'USDT_BEP20', 'USDT_TRC20', 'BNB', 'USDC', 'SOL', 'TRON']

// Map network to Prisma DepositMethod enum value
function getCryptoPaymentMethod(network: string): string {
  if (network === 'BTC') return 'CRYPTO_BTC'
  if (network === 'ETH') return 'CRYPTO_ETH'
  return 'CRYPTO_USDT'
}

/**
 * POST /api/deposits/crypto/initiate
 * Creates a pending crypto deposit with 45-minute expiry
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { amount, network, expectedCryptoAmount, userTxHash } = body

    // Validate required fields
    if (!amount || amount < 5 || amount > 10000) {
      return NextResponse.json(
        { success: false, error: 'Amount must be between $5 and $10,000' },
        { status: 400 }
      )
    }

    if (!network) {
      return NextResponse.json(
        { success: false, error: 'Network is required' },
        { status: 400 }
      )
    }

    // Validate network
    if (!VALID_NETWORKS.includes(network)) {
      return NextResponse.json(
        { success: false, error: `Invalid network. Must be one of: ${VALID_NETWORKS.join(', ')}` },
        { status: 400 }
      )
    }

    // Get wallet address from settings based on network
    const networkSettingMap: Record<string, string> = {
      'BTC': 'btcAddress',
      'ETH': 'ethAddress',
      'USDT_ERC20': 'usdtEthAddress',
      'USDT_BEP20': 'usdtBscAddress',
      'USDT_TRC20': 'usdtTronAddress',
      'BNB': 'bnbAddress',
      'USDC': 'usdcAddress',
      'SOL': 'solAddress',
      'TRON': 'usdtTronAddress',
    }

    const settingKey = networkSettingMap[network]
    const receivingAddress = await getSiteSetting(settingKey)

    if (!receivingAddress) {
      return NextResponse.json(
        { success: false, error: `Wallet address not configured for ${network}` },
        { status: 503 }
      )
    }

    // Check for existing pending deposit for this user and network
    const existingResult = await executeQuery(
      `SELECT id, status, created_at FROM deposits
       WHERE user_id = $1 AND payment_method::text LIKE 'CRYPTO%' AND crypto_network = $2
       AND status = 'PENDING'
       AND created_at > NOW() - INTERVAL '45 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, network]
    )

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0]
      const createdAt = new Date(existing.created_at)
      const expiresAt = new Date(createdAt.getTime() + 45 * 60 * 1000)

      // If not expired, return existing pending deposit
      if (expiresAt > new Date()) {
        // Update tx hash if provided
        if (userTxHash) {
          await executeQuery(
            `UPDATE deposits SET crypto_tx_hash = $1, updated_at = NOW() WHERE id = $2`,
            [userTxHash, existing.id]
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            depositId: existing.id,
            expiresAt: expiresAt.toISOString(),
            timeRemaining: expiresAt.getTime() - Date.now(),
            address: receivingAddress,
            network,
            status: 'PENDING',
            message: 'Existing pending deposit found',
          },
        })
      } else {
        // Mark expired deposit as expired
        await executeQuery(
          `UPDATE deposits SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
          [existing.id]
        )
      }
    }

    // Create new deposit with 45-minute expiry
    const paymentMethod = getCryptoPaymentMethod(network)
    const insertResult = await executeQuery(
      `INSERT INTO deposits
       (user_id, amount, currency, payment_method, status, crypto_network, crypto_address, crypto_amount, crypto_tx_hash)
       VALUES ($1, $2, 'USD', $7, 'PENDING', $3, $4, $5, $6)
       RETURNING id, created_at`,
      [user.id, amount, network, receivingAddress, expectedCryptoAmount || null, userTxHash || null, paymentMethod]
    )

    const deposit = insertResult.rows[0]
    const expiresAt = new Date(new Date(deposit.created_at).getTime() + 45 * 60 * 1000)

    return NextResponse.json({
      success: true,
      data: {
        depositId: deposit.id,
        expiresAt: expiresAt.toISOString(),
        timeRemaining: 45 * 60 * 1000, // Always 45 minutes for new deposits
        address: receivingAddress,
        network,
        networkLabel: getNetworkLabel(network),
        status: 'PENDING',
      },
    })
  } catch (error: any) {
    console.error('Initiate crypto deposit error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initiate deposit' },
      { status: 500 }
    )
  }
}

function getNetworkLabel(network: string): string {
  const labels: Record<string, string> = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'USDT_ERC20': 'USDT (ERC-20)',
    'USDT_BEP20': 'USDT (BEP-20)',
    'USDT_TRC20': 'USDT (TRC-20)',
    'BNB': 'BNB',
    'USDC': 'USDC',
    'SOL': 'Solana',
    'TRON': 'TRON',
  }
  return labels[network] || network
}
