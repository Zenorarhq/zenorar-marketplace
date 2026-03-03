import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getUserGiftCard, markAsRedeemed } from '@/lib/gift-cards/provisioning'
import { checkRateLimit, RATE_LIMITS } from '@/lib/gift-cards/rate-limit'
import { logAuditEvent } from '@/lib/gift-cards/audit'

/**
 * GET /api/gift-cards/my-cards/[id]
 * Get a single purchased gift card with full code revealed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limit check
    const rateLimitResult = checkRateLimit(user.id, 'code_reveal', RATE_LIMITS.codeReveal)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitResult.blocked
            ? `Too many requests. Please try again after ${rateLimitResult.blockExpiresAt?.toLocaleTimeString()}`
            : 'Rate limit exceeded. Please slow down.',
          retryAfter: rateLimitResult.resetAt.toISOString()
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString()
          }
        }
      )
    }

    const { id } = await params

    const card = await getUserGiftCard(id, user.id)

    if (!card) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    // Log audit event
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await logAuditEvent({
      userId: user.id,
      action: 'code_revealed',
      resourceType: 'user_gift_card',
      resourceId: id,
      metadata: {
        brand: card.brand,
        denomination: card.denomination
      },
      ipAddress,
      userAgent
    })

    // Return full code details with rate limit headers
    return NextResponse.json(
      { success: true, card },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString()
        }
      }
    )
  } catch (error: any) {
    console.error('Error fetching user gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gift card' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/gift-cards/my-cards/[id]
 * Mark a gift card as redeemed
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    if (body.action === 'redeem') {
      const result = await markAsRedeemed(id, user.id)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      // Log audit event
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      const userAgent = request.headers.get('user-agent') || undefined

      await logAuditEvent({
        userId: user.id,
        action: 'code_marked_redeemed',
        resourceType: 'user_gift_card',
        resourceId: id,
        ipAddress,
        userAgent
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error updating gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update gift card' },
      { status: 500 }
    )
  }
}
