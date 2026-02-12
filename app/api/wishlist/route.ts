import { NextRequest } from 'next/server'
import { authenticateRequest, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// GET /api/wishlist — fetch user's wishlist
export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const result = await executeQuery(
      `SELECT id, product_id, created_at FROM wishlists WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    )

    const items = result.rows.map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      addedAt: row.created_at,
    }))

    return successResponse(items)
  } catch (error) {
    console.error('Wishlist GET error:', error)
    return errorResponse('Failed to load wishlist', 500)
  }
}

// POST /api/wishlist — add product to wishlist
export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const { productId } = await request.json()
    if (!productId) return errorResponse('productId is required', 400)

    const result = await executeQuery(
      `INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING
       RETURNING id, product_id, created_at`,
      [user.id, productId]
    )

    if (result.rows.length === 0) {
      // Already exists, fetch it
      const existing = await executeQuery(
        `SELECT id, product_id, created_at FROM wishlists WHERE user_id = $1 AND product_id = $2`,
        [user.id, productId]
      )
      const row = existing.rows[0]
      return successResponse({ id: row.id, productId: row.product_id, addedAt: row.created_at })
    }

    const row = result.rows[0]
    return successResponse({ id: row.id, productId: row.product_id, addedAt: row.created_at }, 201)
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return errorResponse('Failed to add to wishlist', 500)
  }
}

// DELETE /api/wishlist — clear entire wishlist
export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    await executeQuery(`DELETE FROM wishlists WHERE user_id = $1`, [user.id])
    return successResponse({ message: 'Wishlist cleared' })
  } catch (error) {
    console.error('Wishlist DELETE error:', error)
    return errorResponse('Failed to clear wishlist', 500)
  }
}
