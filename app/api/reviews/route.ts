import { NextRequest } from 'next/server'
import { optionalAuth, successResponse, errorResponse, AuthenticatedUser } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'
import crypto from 'crypto'

export const POST = optionalAuth(async (request: NextRequest, user: AuthenticatedUser | null) => {
  try {
    const body = await request.json()
    const { productId, rating, title, content, orderId, email } = body

    if (!productId || !rating) {
      return errorResponse('productId and rating are required', 400)
    }

    if (rating < 1 || rating > 5) {
      return errorResponse('Rating must be between 1 and 5', 400)
    }

    if (user) {
      // === SIGNED-IN USER FLOW ===

      // Must have a confirmed purchase
      const purchaseCheck = await executeQuery(
        `SELECT o.id FROM orders o
         JOIN order_items oi ON oi."orderId" = o.id
         WHERE o."userId" = $1 AND oi."productId" = $2 AND o.status IN ('CONFIRMED', 'DELIVERED', 'COMPLETED')
         LIMIT 1`,
        [user.id, productId]
      )
      if (purchaseCheck.rows.length === 0) {
        return errorResponse('You must purchase this product before reviewing', 403)
      }

      // Check duplicate
      const existing = await executeQuery(
        'SELECT id FROM reviews WHERE "productId" = $1 AND "userId" = $2',
        [productId, user.id]
      )
      if (existing.rows.length > 0) {
        return errorResponse('You have already reviewed this product', 409)
      }

      const reviewId = crypto.randomUUID()
      await executeQuery(
        `INSERT INTO reviews (id, "productId", "userId", rating, title, content, "isVerified", "isApproved", "helpfulCount", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, true, true, 0, NOW(), NOW())`,
        [reviewId, productId, user.id, rating, title || null, content || null]
      )

      return successResponse({ id: reviewId, message: 'Review submitted successfully!' }, 201)

    } else {
      // === GUEST FLOW ===

      if (!orderId || !email) {
        return errorResponse('orderId and email are required for guest reviews', 400)
      }

      // Validate order exists with matching email
      const orderCheck = await executeQuery(
        'SELECT id, email, "shippingName", "createdAt" FROM orders WHERE id = $1',
        [orderId]
      )
      if (orderCheck.rows.length === 0) {
        return errorResponse('Order not found', 404)
      }

      const order = orderCheck.rows[0]
      if (order.email.toLowerCase() !== email.toLowerCase()) {
        return errorResponse('Email does not match order', 403)
      }

      // Check 2-hour window
      const orderTime = new Date(order.createdAt).getTime()
      const now = Date.now()
      const twoHours = 2 * 60 * 60 * 1000
      if (now - orderTime > twoHours) {
        return errorResponse('Review window has expired', 403)
      }

      // Check product was in this order
      const itemCheck = await executeQuery(
        'SELECT id FROM order_items WHERE "orderId" = $1 AND "productId" = $2',
        [orderId, productId]
      )
      if (itemCheck.rows.length === 0) {
        return errorResponse('Product not found in this order', 400)
      }

      // Check duplicate (productId + orderId)
      const existing = await executeQuery(
        'SELECT id FROM reviews WHERE "productId" = $1 AND "orderId" = $2',
        [productId, orderId]
      )
      if (existing.rows.length > 0) {
        return errorResponse('You have already reviewed this product', 409)
      }

      const guestName = order.shippingName || 'Guest'
      const reviewId = crypto.randomUUID()
      await executeQuery(
        `INSERT INTO reviews (id, "productId", "orderId", rating, title, content, guest_name, "isVerified", "isApproved", "helpfulCount", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, 0, NOW(), NOW())`,
        [reviewId, productId, orderId, rating, title || null, content || null, guestName]
      )

      return successResponse({ id: reviewId, message: 'Review submitted successfully!' }, 201)
    }
  } catch (error: any) {
    console.error('Failed to create review:', error)
    if (error.code === '23505') {
      return errorResponse('You have already reviewed this product', 409)
    }
    return errorResponse('Failed to submit review', 500)
  }
})
