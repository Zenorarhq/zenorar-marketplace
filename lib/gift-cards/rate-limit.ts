// Rate Limiting for Gift Card Code Access
// Prevents abuse of code reveal endpoints

import { query } from '@/lib/db'

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  blockDurationMs: number // How long to block after limit exceeded
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // Standard rate limit for code reveals
  codeReveal: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,           // 10 reveals per minute
    blockDurationMs: 5 * 60 * 1000 // 5 minute block
  },
  // Strict limit for suspicious activity
  codeRevealStrict: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 50,           // 50 reveals per hour
    blockDurationMs: 60 * 60 * 1000 // 1 hour block
  },
  // Daily limit
  codeRevealDaily: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 100,              // 100 reveals per day
    blockDurationMs: 24 * 60 * 60 * 1000 // 24 hour block
  }
} as const

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  blocked: boolean
  blockExpiresAt?: Date
}

/**
 * In-memory rate limit store (for faster access)
 * Note: In production with multiple instances, use Redis
 */
const rateLimitStore = new Map<string, {
  count: number
  windowStart: number
  blockedUntil?: number
}>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    if (now - value.windowStart > 60 * 60 * 1000) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes

/**
 * Check and update rate limit for a user
 */
export function checkRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${action}:${userId}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Check if blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.windowStart + config.windowMs),
      blocked: true,
      blockExpiresAt: new Date(entry.blockedUntil)
    }
  }

  // Reset window if expired
  if (!entry || now - entry.windowStart > config.windowMs) {
    entry = { count: 0, windowStart: now }
  }

  // Clear block if expired
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    entry.blockedUntil = undefined
    entry.count = 0
    entry.windowStart = now
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    entry.blockedUntil = now + config.blockDurationMs
    rateLimitStore.set(key, entry)

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.windowStart + config.windowMs),
      blocked: true,
      blockExpiresAt: new Date(entry.blockedUntil)
    }
  }

  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.windowStart + config.windowMs),
    blocked: false
  }
}

/**
 * Check multiple rate limits (must pass all)
 */
export function checkMultipleRateLimits(
  userId: string,
  action: string,
  configs: RateLimitConfig[]
): RateLimitResult {
  for (const config of configs) {
    const result = checkRateLimit(userId, action, config)
    if (!result.allowed) {
      return result
    }
  }

  // All limits passed, return the first one's result
  return checkRateLimit(userId, action, configs[0])
}

/**
 * Reset rate limit for a user (admin function)
 */
export function resetRateLimit(userId: string, action: string): void {
  const key = `${action}:${userId}`
  rateLimitStore.delete(key)
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(
  userId: string,
  action: string,
  config: RateLimitConfig
): { count: number; remaining: number; blocked: boolean } {
  const key = `${action}:${userId}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now - entry.windowStart > config.windowMs) {
    return { count: 0, remaining: config.maxRequests, blocked: false }
  }

  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { count: entry.count, remaining: 0, blocked: true }
  }

  return {
    count: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    blocked: false
  }
}

/**
 * Persistent rate limit check using database (for critical limits)
 * Use when you need limits to persist across restarts
 */
export async function checkPersistentRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMs)

  try {
    // Check for existing block
    const blockResult = await query(
      `SELECT blocked_until FROM gift_card_rate_limits
       WHERE user_id = $1 AND action = $2 AND blocked_until > $3`,
      [userId, action, now]
    )

    if (blockResult.rows.length > 0) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now,
        blocked: true,
        blockExpiresAt: new Date(blockResult.rows[0].blocked_until)
      }
    }

    // Count requests in window
    const countResult = await query(
      `SELECT COUNT(*) as count FROM gift_card_rate_limit_log
       WHERE user_id = $1 AND action = $2 AND created_at > $3`,
      [userId, action, windowStart]
    )

    const count = parseInt(countResult.rows[0]?.count || '0')

    if (count >= config.maxRequests) {
      // Block the user
      const blockUntil = new Date(now.getTime() + config.blockDurationMs)
      await query(
        `INSERT INTO gift_card_rate_limits (user_id, action, blocked_until)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, action)
         DO UPDATE SET blocked_until = $3`,
        [userId, action, blockUntil]
      )

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(windowStart.getTime() + config.windowMs),
        blocked: true,
        blockExpiresAt: blockUntil
      }
    }

    // Log this request
    await query(
      `INSERT INTO gift_card_rate_limit_log (user_id, action) VALUES ($1, $2)`,
      [userId, action]
    )

    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      resetAt: new Date(windowStart.getTime() + config.windowMs),
      blocked: false
    }
  } catch (error) {
    console.error('Persistent rate limit check failed:', error)
    // Fall back to in-memory check
    return checkRateLimit(userId, action, config)
  }
}
