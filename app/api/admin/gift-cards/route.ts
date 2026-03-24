import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/gift-cards
 * List all gift card products (including inactive)
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

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const includeStats = searchParams.get('stats') === 'true'

    // Get all gift cards with inventory stats
    const result = await query(
      `SELECT
         gc.*,
         COALESCE(stats.available, 0) as available_count,
         COALESCE(stats.sold, 0) as sold_count,
         COALESCE(stats.reserved, 0) as reserved_count,
         COALESCE(stats.expired, 0) as expired_count
       FROM gift_cards gc
       LEFT JOIN (
         SELECT
           gift_card_id,
           COUNT(*) FILTER (WHERE status = 'available') as available,
           COUNT(*) FILTER (WHERE status = 'sold') as sold,
           COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
           COUNT(*) FILTER (WHERE status = 'expired' OR (expires_at IS NOT NULL AND expires_at <= NOW())) as expired
         FROM gift_card_codes
         GROUP BY gift_card_id
       ) stats ON gc.id = stats.gift_card_id
       ORDER BY gc.brand ASC`
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
      isActive: row.is_active,
      isFeatured: row.is_featured,
      isStaffPick: row.is_staff_pick,
      minCustomAmount: row.min_custom_amount ? parseFloat(row.min_custom_amount) : null,
      maxCustomAmount: row.max_custom_amount ? parseFloat(row.max_custom_amount) : null,
      provider: row.provider,
      providerProductId: row.provider_product_id,
      sortPriority: row.sort_priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      inventory: {
        available: parseInt(row.available_count || '0'),
        sold: parseInt(row.sold_count || '0'),
        reserved: parseInt(row.reserved_count || '0'),
        expired: parseInt(row.expired_count || '0')
      }
    }))

    // Get overall stats if requested
    let stats = null
    if (includeStats) {
      const statsResult = await query(
        `SELECT
           COUNT(DISTINCT gc.id) as total_products,
           COUNT(DISTINCT gc.id) FILTER (WHERE gc.is_active) as active_products,
           COUNT(gcc.id) as total_codes,
           COUNT(gcc.id) FILTER (WHERE gcc.status = 'available') as available_codes,
           COUNT(gcc.id) FILTER (WHERE gcc.status = 'sold') as sold_codes
         FROM gift_cards gc
         LEFT JOIN gift_card_codes gcc ON gc.id = gcc.gift_card_id`
      )

      const s = statsResult.rows[0]
      stats = {
        totalProducts: parseInt(s.total_products || '0'),
        activeProducts: parseInt(s.active_products || '0'),
        totalCodes: parseInt(s.total_codes || '0'),
        availableCodes: parseInt(s.available_codes || '0'),
        soldCodes: parseInt(s.sold_codes || '0')
      }
    }

    return NextResponse.json({
      success: true,
      giftCards,
      stats
    })
  } catch (error: any) {
    console.error('Error fetching admin gift cards:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gift cards' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/gift-cards
 * Create a new gift card product
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

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.brand || !body.slug || !body.category) {
      return NextResponse.json(
        { success: false, error: 'Brand, slug, and category are required' },
        { status: 400 }
      )
    }

    // Check for duplicate slug
    const existing = await query(
      `SELECT id FROM gift_cards WHERE slug = $1`,
      [body.slug]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A gift card with this slug already exists' },
        { status: 400 }
      )
    }

    // Insert new gift card
    const result = await query(
      `INSERT INTO gift_cards
         (brand, slug, category, description, image_url, denominations, discount_percent,
          is_active, is_featured, min_custom_amount, max_custom_amount, provider, provider_product_id, sort_priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        body.brand,
        body.slug,
        body.category,
        body.description || null,
        body.imageUrl || null,
        JSON.stringify(body.denominations || []),
        body.discountPercent || 0,
        body.isActive !== false,
        body.isFeatured || false,
        body.minCustomAmount || null,
        body.maxCustomAmount || null,
        body.provider || null,
        body.providerProductId || null,
        body.sortPriority || null
      ]
    )

    const row = result.rows[0]
    return NextResponse.json({
      success: true,
      giftCard: {
        id: row.id,
        brand: row.brand,
        slug: row.slug,
        category: row.category,
        description: row.description,
        imageUrl: row.image_url,
        denominations: row.denominations || [],
        discountPercent: parseFloat(row.discount_percent || '0'),
        isActive: row.is_active,
        isFeatured: row.is_featured,
        createdAt: row.created_at
      }
    })
  } catch (error: any) {
    console.error('Error creating gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create gift card' },
      { status: 500 }
    )
  }
}
