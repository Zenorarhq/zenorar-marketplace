// Rate Limiting for Virtual Numbers SMS/Voice
// Prevents abuse of send SMS and other endpoints

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  blockDurationMs: number
}

// Rate limit configurations for virtual numbers
export const VN_RATE_LIMITS = {
  // Standard SMS send limit
  sendSms: {
    windowMs: 60 * 1000,           // 1 minute
    maxRequests: 10,               // 10 SMS per minute
    blockDurationMs: 5 * 60 * 1000 // 5 minute block
  },
  // Hourly SMS limit
  sendSmsHourly: {
    windowMs: 60 * 60 * 1000,      // 1 hour
    maxRequests: 60,               // 60 SMS per hour
    blockDurationMs: 30 * 60 * 1000 // 30 minute block
  },
  // Daily SMS limit
  sendSmsDaily: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 200,              // 200 SMS per day
    blockDurationMs: 60 * 60 * 1000 // 1 hour block
  },
  // Message retrieval limit
  getMessages: {
    windowMs: 60 * 1000,           // 1 minute
    maxRequests: 30,               // 30 requests per minute
    blockDurationMs: 60 * 1000     // 1 minute block
  },
  // Settings update limit
  updateSettings: {
    windowMs: 60 * 1000,           // 1 minute
    maxRequests: 5,                // 5 updates per minute
    blockDurationMs: 5 * 60 * 1000 // 5 minute block
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
 * In-memory rate limit store
 */
const rateLimitStore = new Map<string, {
  count: number
  windowStart: number
  blockedUntil?: number
}>()

// Clean up old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.windowStart > 60 * 60 * 1000) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Check and update rate limit for a user
 */
export function checkVnRateLimit(
  userId: string,
  action: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `vn:${action}:${userId}`
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
export function checkMultipleVnRateLimits(
  userId: string,
  action: string,
  configs: RateLimitConfig[]
): RateLimitResult {
  for (const config of configs) {
    const result = checkVnRateLimit(userId, `${action}_${config.windowMs}`, config)
    if (!result.allowed) {
      return result
    }
  }

  // All limits passed
  return {
    allowed: true,
    remaining: configs[0].maxRequests,
    resetAt: new Date(Date.now() + configs[0].windowMs),
    blocked: false
  }
}

/**
 * Check SMS sending rate limits (per-minute, hourly, daily)
 */
export function checkSmsSendLimits(userId: string): RateLimitResult {
  return checkMultipleVnRateLimits(userId, 'sendSms', [
    VN_RATE_LIMITS.sendSms,
    VN_RATE_LIMITS.sendSmsHourly,
    VN_RATE_LIMITS.sendSmsDaily
  ])
}

/**
 * Reset rate limit for a user
 */
export function resetVnRateLimit(userId: string, action: string): void {
  const key = `vn:${action}:${userId}`
  rateLimitStore.delete(key)
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
    ...(result.blocked && result.blockExpiresAt && {
      'X-RateLimit-Blocked-Until': result.blockExpiresAt.toISOString()
    })
  }
}
