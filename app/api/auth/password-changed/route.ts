import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    await executeQuery(
      'UPDATE users SET password_changed_at = NOW() WHERE id = $1',
      [user.id]
    )
    return successResponse({ updated: true })
  } catch (error) {
    console.error('Failed to update password_changed_at:', error)
    return errorResponse('Failed to update password timestamp', 500)
  }
})
