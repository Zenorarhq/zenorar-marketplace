import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { reloadlyProvider } from '@/lib/gift-cards/providers/reloadly'

/**
 * GET /api/admin/gift-cards/sync
 * Test Reloadly connection
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

    const result = await reloadlyProvider.testConnection()

    return NextResponse.json({
      success: result.success,
      mode: result.mode,
      error: result.error
    })
  } catch (error: any) {
    console.error('Error testing Reloadly connection:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Connection test failed' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/gift-cards/sync
 * Sync gift card products from Reloadly
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
    const countryCode = body.countryCode || 'US'

    // Get products from Reloadly
    const products = await reloadlyProvider.getProducts(countryCode)

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No products found or Reloadly not configured'
      })
    }

    let synced = 0
    let updated = 0
    const errors: string[] = []

    for (const product of products) {
      try {
        // Generate slug from brand name
        const slug = product.brand
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        // Check if product already exists
        const existing = await query(
          `SELECT id FROM gift_cards
           WHERE provider = 'reloadly' AND provider_product_id = $1`,
          [product.productId]
        )

        if (existing.rows.length > 0) {
          // Update existing
          await query(
            `UPDATE gift_cards
             SET brand = $1,
                 category = $2,
                 description = $3,
                 image_url = $4,
                 denominations = $5,
                 min_custom_amount = $6,
                 max_custom_amount = $7,
                 discount_percent = $8,
                 updated_at = NOW()
             WHERE id = $9`,
            [
              product.brand,
              product.category,
              product.description,
              product.imageUrl,
              JSON.stringify(product.denominations),
              product.minAmount,
              product.maxAmount,
              product.discountPercent || 0,
              existing.rows[0].id
            ]
          )
          updated++
        } else {
          // Check if slug exists
          const slugCheck = await query(
            `SELECT id FROM gift_cards WHERE slug = $1`,
            [slug]
          )

          const finalSlug = slugCheck.rows.length > 0
            ? `${slug}-${product.productId}`
            : slug

          // Insert new
          await query(
            `INSERT INTO gift_cards
               (brand, slug, category, description, image_url, denominations,
                min_custom_amount, max_custom_amount, discount_percent,
                provider, provider_product_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'reloadly', $10, true)`,
            [
              product.brand,
              finalSlug,
              product.category,
              product.description,
              product.imageUrl,
              JSON.stringify(product.denominations),
              product.minAmount,
              product.maxAmount,
              product.discountPercent || 0,
              product.productId
            ]
          )
          synced++
        }
      } catch (err: any) {
        errors.push(`${product.brand}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      synced,
      updated,
      errors: errors.slice(0, 10)
    })
  } catch (error: any) {
    console.error('Error syncing from Reloadly:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
}
