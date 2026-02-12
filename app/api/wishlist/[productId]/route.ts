import { NextRequest } from 'next/server'
import { authenticateRequest, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// DELETE /api/wishlist/[productId] — remove single product from wishlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await authenticateRequest(request)
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const { productId } = await params

    await executeQuery(
      `DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2`,
      [user.id, productId]
    )

    return successResponse({ message: 'Removed from wishlist' })
  } catch (error) {
    console.error('Wishlist item DELETE error:', error)
    return errorResponse('Failed to remove from wishlist', 500)
  }
}
