import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/gift-cards
 * List all active gift card products
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let whereConditions = ['is_active = true']
    const params: any[] = []
    let paramIndex = 1

    if (category && category !== 'all') {
      whereConditions.push(`category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    if (search) {
      whereConditions.push(`(brand ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (featured === 'true') {
      whereConditions.push('is_featured = true')
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : ''

    // Get gift cards with inventory counts
    const result = await query(
      `SELECT
         gc.*,
         COALESCE(inv.available_count, 0) as available_count,
         CASE WHEN gc.provider IS NOT NULL THEN true ELSE false END as has_api_fallback
       FROM gift_cards gc
       LEFT JOIN (
         SELECT
           gift_card_id,
           COUNT(*) FILTER (WHERE status = 'available' AND (expires_at IS NULL OR expires_at > NOW())) as available_count
         FROM gift_card_codes
         GROUP BY gift_card_id
       ) inv ON gc.id = inv.gift_card_id
       ${whereClause}
       ORDER BY gc.is_featured DESC, gc.brand ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM gift_cards ${whereClause}`,
      params
    )

    // Get categories with counts
    const categoriesResult = await query(
      `SELECT category, COUNT(*) as count
       FROM gift_cards
       WHERE is_active = true
       GROUP BY category
       ORDER BY count DESC`
    )

    const giftCards = result.rows.map(row => ({
      id: row.id,
      brand: row.brand,
      slug: row.slug,
      category: row.category,
      description: row.description,
      imageUrl: row.image_url,
      denominations: row.denominations || [],
      discountPercent: parseFloat(row.discount_percent || '0'),
      isFeatured: row.is_featured,
      minCustomAmount: row.min_custom_amount ? parseFloat(row.min_custom_amount) : null,
      maxCustomAmount: row.max_custom_amount ? parseFloat(row.max_custom_amount) : null,
      inStock: parseInt(row.available_count) > 0 || row.has_api_fallback
    }))

    return NextResponse.json({
      success: true,
      giftCards,
      total: parseInt(countResult.rows[0]?.total || '0'),
      categories: categoriesResult.rows.map(r => ({
        name: r.category,
        count: parseInt(r.count)
      }))
    })
  } catch (error: any) {
    console.error('Error fetching gift cards:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gift cards' },
      { status: 500 }
    )
  }
}
