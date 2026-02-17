import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse, AuthenticatedUser } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export const DELETE = requireAdmin(async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').slice(-2, -1)[0]

    const result = await executeQuery(
      'DELETE FROM reviews WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return errorResponse('Review not found', 404)
    }

    return successResponse({ message: 'Review rejected and deleted' })
  } catch (error) {
    console.error('Failed to reject review:', error)
    return errorResponse('Failed to reject review', 500)
  }
})
