import { NextRequest } from 'next/server'
import { authenticateRequest, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// PUT /api/cart/items/[productId] — update item quantity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const { productId } = await params
    const { quantity, license = 'standard' } = await request.json()

    if (quantity === undefined) return errorResponse('quantity is required', 400)

    // Find user's cart
    const cartResult = await executeQuery(
      `SELECT id FROM carts WHERE "userId" = $1 LIMIT 1`,
      [user.id]
    )

    if (cartResult.rows.length === 0) {
      return errorResponse('Cart not found', 404)
    }

    const cartId = cartResult.rows[0].id

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      await executeQuery(
        `DELETE FROM cart_items WHERE "cartId" = $1 AND "productId" = $2 AND license = $3`,
        [cartId, productId, license]
      )
      return successResponse({ message: 'Item removed' })
    }

    // Update quantity
    const result = await executeQuery(
      `UPDATE cart_items SET quantity = $1, "updatedAt" = NOW()
       WHERE "cartId" = $2 AND "productId" = $3 AND license = $4
       RETURNING id, "productId" as product_id, quantity, license, price`,
      [quantity, cartId, productId, license]
    )

    if (result.rows.length === 0) {
      return errorResponse('Item not found in cart', 404)
    }

    const row = result.rows[0]
    return successResponse({
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      license: row.license,
      price: parseFloat(row.price),
    })
  } catch (error) {
    console.error('Cart item PUT error:', error)
    return errorResponse('Failed to update cart item', 500)
  }
}

// DELETE /api/cart/items/[productId] — remove item from cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const { productId } = await params
    const { searchParams } = new URL(request.url)
    const license = searchParams.get('license') || 'standard'

    // Find user's cart
    const cartResult = await executeQuery(
      `SELECT id FROM carts WHERE "userId" = $1 LIMIT 1`,
      [user.id]
    )

    if (cartResult.rows.length === 0) {
      return successResponse({ message: 'Item removed' })
    }

    const cartId = cartResult.rows[0].id

    await executeQuery(
      `DELETE FROM cart_items WHERE "cartId" = $1 AND "productId" = $2 AND license = $3`,
      [cartId, productId, license]
    )

    return successResponse({ message: 'Item removed' })
  } catch (error) {
    console.error('Cart item DELETE error:', error)
    return errorResponse('Failed to remove cart item', 500)
  }
}
