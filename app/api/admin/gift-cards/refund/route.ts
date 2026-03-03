import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { refundCode } from '@/lib/gift-cards/inventory'
import { logAuditEvent } from '@/lib/gift-cards/audit'
import { query } from '@/lib/db'

/**
 * POST /api/admin/gift-cards/refund
 * Refund a gift card code back to inventory
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

    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { userGiftCardId, reason } = await request.json()

    if (!userGiftCardId) {
      return NextResponse.json(
        { success: false, error: 'userGiftCardId is required' },
        { status: 400 }
      )
    }

    // Get the user gift card to find the linked code
    const userCardResult = await query(
      `SELECT ugc.*, gcc.id as code_id
       FROM user_gift_cards ugc
       LEFT JOIN gift_card_codes gcc ON ugc.gift_card_code_id = gcc.id
       WHERE ugc.id = $1`,
      [userGiftCardId]
    )

    if (userCardResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const userCard = userCardResult.rows[0]

    // Only bulk codes can be refunded (API codes are non-refundable)
    if (userCard.source !== 'bulk' || !userCard.code_id) {
      return NextResponse.json(
        { success: false, error: 'Only bulk inventory codes can be refunded' },
        { status: 400 }
      )
    }

    // Refund the code back to inventory
    const refundResult = await refundCode(userCard.code_id, user.id, reason)

    if (!refundResult.success) {
      return NextResponse.json(
        { success: false, error: refundResult.error },
        { status: 400 }
      )
    }

    // Mark user gift card as refunded
    await query(
      `UPDATE user_gift_cards
       SET status = 'refunded'
       WHERE id = $1`,
      [userGiftCardId]
    )

    // Log audit event
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logAuditEvent({
      userId: user.id,
      action: 'code_refunded',
      resourceType: 'user_gift_card',
      resourceId: userGiftCardId,
      metadata: {
        codeId: userCard.code_id,
        reason,
        originalUserId: userCard.user_id,
        brand: userCard.brand,
        denomination: userCard.denomination
      },
      ipAddress,
      userAgent
    })

    return NextResponse.json({
      success: true,
      message: 'Gift card refunded and code returned to inventory'
    })
  } catch (error: any) {
    console.error('Error refunding gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to refund gift card' },
      { status: 500 }
    )
  }
}
