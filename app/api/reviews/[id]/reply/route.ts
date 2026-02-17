import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse, AuthenticatedUser } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export const POST = requireAdmin(async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').slice(-2, -1)[0]

    const { reply } = await request.json()

    if (!reply || !reply.trim()) {
      return errorResponse('Reply text is required', 400)
    }

    const result = await executeQuery(
      'UPDATE reviews SET admin_reply = $1, admin_reply_at = NOW(), "updatedAt" = NOW() WHERE id = $2 RETURNING id',
      [reply.trim(), id]
    )

    if (result.rows.length === 0) {
      return errorResponse('Review not found', 404)
    }

    return successResponse({ message: 'Reply added' })
  } catch (error) {
    console.error('Failed to reply to review:', error)
    return errorResponse('Failed to reply to review', 500)
  }
})
