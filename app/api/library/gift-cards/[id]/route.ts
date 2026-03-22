export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/library/gift-cards/[id]
 * Get full gift card details including code and pin for the authenticated user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.payload.userId
    const { id } = await params

    // Fetch the gift card with code (only if owned by this user)
    const result = await query(
      `
      SELECT
        ugc.id,
        ugc.brand,
        ugc.category,
        ugc.denomination,
        ugc.code,
        ugc.pin,
        ugc.status,
        COALESCE(gc.image_url, ugc.image_url) as image_url,
        ugc.delivered_at,
        ugc.expires_at,
        ugc.redeemed_at,
        ugc.source,
        ugc.provider_order_id,
        gc.slug as gift_card_slug,
        gc.description as product_description
      FROM user_gift_cards ugc
      LEFT JOIN gift_cards gc ON ugc.gift_card_id = gc.id
      WHERE ugc.id = $1 AND ugc.user_id = $2
      `,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const card = result.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        id: card.id,
        brand: card.brand,
        category: card.category,
        denomination: parseFloat(card.denomination),
        code: card.code,
        pin: card.pin,
        status: card.status,
        imageUrl: card.image_url,
        deliveredAt: card.delivered_at ? new Date(card.delivered_at).toISOString() : null,
        expiresAt: card.expires_at ? new Date(card.expires_at).toISOString() : null,
        redeemedAt: card.redeemed_at ? new Date(card.redeemed_at).toISOString() : null,
        source: card.source,
        providerOrderId: card.provider_order_id,
        giftCardSlug: card.gift_card_slug,
        productDescription: card.product_description,
      },
    })
  } catch (error: any) {
    console.error('Error fetching gift card details:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gift card' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/library/gift-cards/[id]
 * Update gift card status (e.g., mark as redeemed)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.payload.userId
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['delivered', 'redeemed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Update the gift card status (only if owned by this user)
    const result = await query(
      `
      UPDATE user_gift_cards
      SET
        status = $1,
        redeemed_at = CASE WHEN $1 = 'redeemed' THEN NOW() ELSE redeemed_at END
      WHERE id = $2 AND user_id = $3
      RETURNING id, status, redeemed_at
      `,
      [status, id, userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error: any) {
    console.error('Error updating gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update gift card' },
      { status: 500 }
    )
  }
}
