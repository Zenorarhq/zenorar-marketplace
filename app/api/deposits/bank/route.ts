import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery, getSiteSetting } from '@/lib/db-helpers'

/**
 * POST /api/deposits/bank
 * Creates a pending bank transfer deposit and returns bank details
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
    const { amount } = body

    // Validate amount
    if (!amount || amount < 5 || amount > 10000) {
      return NextResponse.json(
        { success: false, error: 'Amount must be between $5 and $10,000' },
        { status: 400 }
      )
    }

    // Get bank details from settings
    const [accountName, accountNumber, bankName, routingNumber, swiftCode, instructions] = await Promise.all([
      getSiteSetting('bankAccountName'),
      getSiteSetting('bankAccountNumber'),
      getSiteSetting('bankBankName'),
      getSiteSetting('bankRoutingNumber'),
      getSiteSetting('bankSwiftCode'),
      getSiteSetting('bankTransferInstructions'),
    ])

    if (!accountNumber || !bankName) {
      return NextResponse.json(
        { success: false, error: 'Bank transfer is not configured' },
        { status: 503 }
      )
    }

    // Generate unique reference for this deposit
    const reference = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Create deposit record
    const insertResult = await executeQuery(
      `INSERT INTO deposits
       (id, user_id, amount, currency, payment_method, status, bank_reference)
       VALUES (gen_random_uuid()::text, $1, $2, 'USD', 'BANK_TRANSFER', 'PENDING', $3)
       RETURNING id`,
      [user.id, amount, reference]
    )

    const depositId = insertResult.rows[0].id

    return NextResponse.json({
      success: true,
      data: {
        depositId,
        bankDetails: {
          accountName: accountName || 'N/A',
          accountNumber,
          bankName,
          routingNumber: routingNumber || 'N/A',
          swiftCode: swiftCode || null,
          reference,
          instructions: instructions || `Please include reference "${reference}" in your transfer memo/description.`,
        },
      },
    })
  } catch (error: any) {
    console.error('Bank deposit error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create deposit' },
      { status: 500 }
    )
  }
}
