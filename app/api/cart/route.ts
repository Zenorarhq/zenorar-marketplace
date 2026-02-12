import { NextRequest } from 'next/server'
import { authenticateRequest, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/cart — fetch user's cart items with product data
export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    // Find user's cart
    const cartResult = await executeQuery(
      `SELECT id FROM carts WHERE "userId" = $1 LIMIT 1`,
      [user.id]
    )

    if (cartResult.rows.length === 0) {
      return successResponse([])
    }

    const cartId = cartResult.rows[0].id

    // Get cart items with product data
    const itemsResult = await executeQuery(
      `SELECT
        ci.id, ci."productId", ci.quantity, ci.license, ci.price,
        p.name, p.slug, p.description, p.price as product_price,
        c.name as category_name,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary") ORDER BY pi."isPrimary" DESC)
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM cart_items ci
      JOIN products p ON p.id = ci."productId"
      LEFT JOIN categories c ON p."categoryId" = c.id
      WHERE ci."cartId" = $1
      ORDER BY ci."createdAt" DESC`,
      [cartId]
    )

    const items = itemsResult.rows.map((row: any) => ({
      productId: row.productId,
      quantity: row.quantity,
      license: row.license || 'standard',
      price: parseFloat(row.price || row.product_price),
      product: {
        id: row.productId,
        name: row.name,
        slug: row.slug,
        description: row.description || '',
        price: parseFloat(row.product_price),
        rating: 0,
        reviewCount: 0,
        category: row.category_name || '',
        icon: 'box',
        iconColor: '#888',
        tags: [],
        image: row.images?.[0]?.url || undefined,
        images: row.images || [],
      },
    }))

    return successResponse(items)
  } catch (error) {
    console.error('Cart GET error:', error)
    return errorResponse('Failed to load cart', 500)
  }
}

// DELETE /api/cart — clear entire cart
export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const cartResult = await executeQuery(
      `SELECT id FROM carts WHERE "userId" = $1 LIMIT 1`,
      [user.id]
    )

    if (cartResult.rows.length > 0) {
      await executeQuery(
        `DELETE FROM cart_items WHERE "cartId" = $1`,
        [cartResult.rows[0].id]
      )
    }

    return successResponse({ message: 'Cart cleared' })
  } catch (error) {
    console.error('Cart DELETE error:', error)
    return errorResponse('Failed to clear cart', 500)
  }
}
