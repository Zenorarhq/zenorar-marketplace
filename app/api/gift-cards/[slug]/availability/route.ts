import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { checkAvailability } from '@/lib/gift-cards/provisioning'

/**
 * GET /api/gift-cards/[slug]/availability
 * Check availability for a specific denomination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const searchParams = request.nextUrl.searchParams
    const denomination = searchParams.get('denomination')

    if (!denomination) {
      return NextResponse.json(
        { success: false, error: 'Denomination is required' },
        { status: 400 }
      )
    }

    const denomValue = parseFloat(denomination)
    if (isNaN(denomValue) || denomValue <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid denomination value' },
        { status: 400 }
      )
    }

    // Get gift card by slug
    const result = await query(
      `SELECT id, denominations, min_custom_amount, max_custom_amount
       FROM gift_cards
       WHERE slug = $1 AND is_active = true`,
      [slug]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const giftCard = result.rows[0]

    // Validate denomination is allowed
    const denominations = giftCard.denominations || []
    const minCustom = giftCard.min_custom_amount ? parseFloat(giftCard.min_custom_amount) : null
    const maxCustom = giftCard.max_custom_amount ? parseFloat(giftCard.max_custom_amount) : null

    const isValidDenom = denominations.includes(denomValue) ||
      (minCustom !== null && maxCustom !== null && denomValue >= minCustom && denomValue <= maxCustom)

    if (!isValidDenom) {
      return NextResponse.json({
        success: true,
        availability: {
          denomination: denomValue,
          available: false,
          stock: 0,
          source: 'none',
          reason: 'Invalid denomination for this gift card'
        }
      })
    }

    // Check availability
    const availability = await checkAvailability(giftCard.id, denomValue)

    return NextResponse.json({
      success: true,
      availability
    })
  } catch (error: any) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check availability' },
      { status: 500 }
    )
  }
}
