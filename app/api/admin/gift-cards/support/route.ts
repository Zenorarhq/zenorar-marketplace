import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import {
  getSupportContext,
  replaceGiftCardCode,
  searchGiftCards,
  generateSupportReport
} from '@/lib/gift-cards/support'
import { logAuditEvent } from '@/lib/gift-cards/audit'

/**
 * GET /api/admin/gift-cards/support
 * Search gift cards or get support context
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'context') {
      const cardId = searchParams.get('cardId')
      if (!cardId) {
        return NextResponse.json(
          { success: false, error: 'cardId required' },
          { status: 400 }
        )
      }

      const context = await getSupportContext(cardId)

      // Log that admin viewed this card
      await logAuditEvent({
        userId: user.id,
        action: 'support_view_code',
        resourceType: 'user_gift_card',
        resourceId: cardId,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json({ success: true, data: context })
    }

    if (action === 'report') {
      const cardId = searchParams.get('cardId')
      if (!cardId) {
        return NextResponse.json(
          { success: false, error: 'cardId required' },
          { status: 400 }
        )
      }

      const report = await generateSupportReport(cardId)
      return NextResponse.json({ success: true, report })
    }

    // Default: search
    const results = await searchGiftCards({
      code: searchParams.get('code') || undefined,
      orderId: searchParams.get('orderId') || undefined,
      userId: searchParams.get('userId') || undefined,
      email: searchParams.get('email') || undefined,
      brand: searchParams.get('brand') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    })

    return NextResponse.json({ success: true, data: results })
  } catch (error: any) {
    console.error('Error in gift card support:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Support operation failed' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/gift-cards/support
 * Perform support actions (code replacement)
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

    const { action, cardId, reason } = await request.json()

    if (action === 'replace') {
      if (!cardId || !reason) {
        return NextResponse.json(
          { success: false, error: 'cardId and reason required for replacement' },
          { status: 400 }
        )
      }

      const result = await replaceGiftCardCode(cardId, user.id, reason)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Code replaced successfully',
        newCode: result.newCode,
        newPin: result.newPin
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error in gift card support action:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Support action failed' },
      { status: 500 }
    )
  }
}
