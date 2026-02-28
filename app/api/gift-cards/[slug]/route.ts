import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { checkAvailability } from '@/lib/gift-cards/provisioning'

/**
 * GET /api/gift-cards/[slug]
 * Get a single gift card product with availability info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Get gift card details
    const result = await query(
      `SELECT * FROM gift_cards WHERE slug = $1 AND is_active = true`,
      [slug]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    const row = result.rows[0]

    // Check availability for each denomination
    const denominations = row.denominations || []
    const availabilityPromises = denominations.map(async (denom: number) => {
      const availability = await checkAvailability(row.id, denom)
      return {
        value: denom,
        available: availability.available,
        stock: availability.stock,
        source: availability.source
      }
    })

    const denominationAvailability = await Promise.all(availabilityPromises)

    const giftCard = {
      id: row.id,
      brand: row.brand,
      slug: row.slug,
      category: row.category,
      description: row.description,
      imageUrl: row.image_url,
      denominations: denominationAvailability,
      discountPercent: parseFloat(row.discount_percent || '0'),
      isFeatured: row.is_featured,
      minCustomAmount: row.min_custom_amount ? parseFloat(row.min_custom_amount) : null,
      maxCustomAmount: row.max_custom_amount ? parseFloat(row.max_custom_amount) : null,
      hasApiProvider: !!row.provider
    }

    return NextResponse.json({
      success: true,
      giftCard
    })
  } catch (error: any) {
    console.error('Error fetching gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gift card' },
      { status: 500 }
    )
  }
}
