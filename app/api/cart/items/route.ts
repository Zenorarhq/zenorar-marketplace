import { NextRequest } from 'next/server'
import { authenticateRequest, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// POST /api/cart/items — add item to cart
export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const { productId, quantity = 1, license = 'standard' } = await request.json()
    if (!productId) return errorResponse('productId is required', 400)

    // Look up the actual product price from DB (never trust client price)
    const productResult = await executeQuery(
      `SELECT price FROM products WHERE id = $1 AND status = 'ACTIVE'`,
      [productId]
    )
    if (productResult.rows.length === 0) return errorResponse('Product not found', 404)
    const price = parseFloat(productResult.rows[0].price)

    // Find or create cart for user
    let cartResult = await executeQuery(
      `SELECT id FROM carts WHERE "userId" = $1 LIMIT 1`,
      [user.id]
    )

    let cartId: string
    if (cartResult.rows.length === 0) {
      const newCart = await executeQuery(
        `INSERT INTO carts (id, "userId", "createdAt", "updatedAt") VALUES (gen_random_uuid()::TEXT, $1, NOW(), NOW()) RETURNING id`,
        [user.id]
      )
      cartId = newCart.rows[0].id
    } else {
      cartId = cartResult.rows[0].id
    }

    // Upsert cart item (increment quantity if same product+license exists)
    const result = await executeQuery(
      `INSERT INTO cart_items (id, "cartId", "productId", quantity, license, price, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT ("cartId", "productId", license) DO UPDATE SET
         quantity = $3,
         price = $5,
         "updatedAt" = NOW()
       RETURNING id, "productId" as product_id, quantity, license, price`,
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
