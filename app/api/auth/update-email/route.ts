import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, successResponse, errorResponse } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

/**
 * POST /api/auth/update-email
 * Updates the user's email address (for wallet users who need to add a real email)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request)
    if (!user) {
      return errorResponse('Authentication required', 401)
    }

    // Parse request body
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return errorResponse('Email is required', 400)
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return errorResponse('Invalid email format', 400)
    }

    // Reject wallet-generated emails
    if (trimmedEmail.endsWith('@wallet.local')) {
      return errorResponse('Please enter a real email address', 400)
    }

    // Check if email is already in use by another user
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
      [trimmedEmail, user.id]
    )

    if (existingUser.rows.length > 0) {
      return errorResponse('This email is already in use', 400)
    }

    // Update user's email in database
    await executeQuery(
      'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
      [trimmedEmail, user.id]
    )

    return successResponse({
      email: trimmedEmail,
      message: 'Email updated successfully'
    })
  } catch (error: any) {
    console.error('Update email error:', error)

    // Handle database connection errors (Neon cold start)
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
      return errorResponse('Service temporarily unavailable. Please try again.', 503)
    }

    return errorResponse(error.message || 'Failed to update email', 500)
  }
}
