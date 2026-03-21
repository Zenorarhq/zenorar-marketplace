import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/gift-cards/[id]
 * Get a single gift card with full details
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

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    const result = await query(
      `SELECT * FROM gift_cards WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

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
        minCustomAmount: row.min_custom_amount ? parseFloat(row.min_custom_amount) : null,
        maxCustomAmount: row.max_custom_amount ? parseFloat(row.max_custom_amount) : null,
        provider: row.provider,
        providerProductId: row.provider_product_id,
        providerData: row.provider_data,
        redeemType: row.redeem_type || null,
        sortPriority: row.sort_priority,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    })
  } catch (error: any) {
    console.error('Error fetching gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gift card' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/gift-cards/[id]
 * Update a gift card product
 */
export async function PUT(
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

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Check if gift card exists
    const existing = await query(
      `SELECT id FROM gift_cards WHERE id = $1`,
      [id]
    )

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    // Check for duplicate slug if changing
    if (body.slug) {
      const slugCheck = await query(
        `SELECT id FROM gift_cards WHERE slug = $1 AND id != $2`,
        [body.slug, id]
      )

      if (slugCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'A gift card with this slug already exists' },
          { status: 400 }
        )
      }
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    const fields = [
      { name: 'brand', value: body.brand },
      { name: 'slug', value: body.slug },
      { name: 'category', value: body.category },
      { name: 'description', value: body.description },
      { name: 'image_url', value: body.imageUrl },
      { name: 'denominations', value: body.denominations ? JSON.stringify(body.denominations) : undefined },
      { name: 'discount_percent', value: body.discountPercent },
      { name: 'is_active', value: body.isActive },
      { name: 'is_featured', value: body.isFeatured },
      { name: 'min_custom_amount', value: body.minCustomAmount },
      { name: 'max_custom_amount', value: body.maxCustomAmount },
      { name: 'provider', value: body.provider },
      { name: 'provider_product_id', value: body.providerProductId },
      { name: 'sort_priority', value: body.sortPriority },
      { name: 'redeem_type', value: body.redeemType ?? undefined }
    ]

    for (const field of fields) {
      if (field.value !== undefined) {
        updates.push(`${field.name} = $${paramIndex}`)
        values.push(field.value)
        paramIndex++
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(id)
    const result = await query(
      `UPDATE gift_cards
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
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
        updatedAt: row.updated_at
      }
    })
  } catch (error: any) {
    console.error('Error updating gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update gift card' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/gift-cards/[id]
 * Delete a gift card product (and all associated codes)
 */
export async function DELETE(
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

    const isAdmin = user.role?.toUpperCase() === 'ADMIN'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if there are sold codes
    const soldCheck = await query(
      `SELECT COUNT(*) as count FROM gift_card_codes
       WHERE gift_card_id = $1 AND status = 'sold'`,
      [id]
    )

    const soldCount = parseInt(soldCheck.rows[0]?.count || '0')
    if (soldCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete gift card with ${soldCount} sold codes. Deactivate instead.` },
        { status: 400 }
      )
    }

    // Delete the gift card (codes will cascade delete)
    const result = await query(
      `DELETE FROM gift_cards WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting gift card:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete gift card' },
      { status: 500 }
    )
  }
}
