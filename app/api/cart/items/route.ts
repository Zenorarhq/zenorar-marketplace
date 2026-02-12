import { NextRequest } from 'next/server'
import { authenticateRequest, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// POST /api/cart/items — add item to cart
export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const { productId, quantity = 1, license = 'standard', price } = await request.json()
    if (!productId) return errorResponse('productId is required', 400)
    if (!price) return errorResponse('price is required', 400)

    // Find or create cart for user
    let cartResult = await executeQuery(
      `SELECT id FROM carts WHERE user_id = $1 LIMIT 1`,
      [user.id]
    )

    let cartId: string
    if (cartResult.rows.length === 0) {
      const newCart = await executeQuery(
        `INSERT INTO carts (id, user_id, created_at, updated_at) VALUES (gen_random_uuid()::TEXT, $1, NOW(), NOW()) RETURNING id`,
        [user.id]
      )
      cartId = newCart.rows[0].id
    } else {
      cartId = cartResult.rows[0].id
    }

    // Upsert cart item (increment quantity if same product+license exists)
    const result = await executeQuery(
      `INSERT INTO cart_items (id, cart_id, product_id, quantity, license, price, created_at, updated_at)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (cart_id, product_id, license) DO UPDATE SET
         quantity = $3,
         price = $5,
         updated_at = NOW()
       RETURNING id, product_id, quantity, license, price`,
      [cartId, productId, quantity, license, price]
    )

    const row = result.rows[0]
    return successResponse({
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      license: row.license,
      price: parseFloat(row.price),
    }, 201)
  } catch (error) {
    console.error('Cart items POST error:', error)
    return errorResponse('Failed to add to cart', 500)
  }
}
