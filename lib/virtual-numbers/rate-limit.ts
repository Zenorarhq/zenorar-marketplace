// Rate Limiting for Virtual Numbers SMS/Voice
// Database-backed using virtual_number_messages for SMS counts
// Works correctly on serverless (Vercel) — no in-memory state

import { query } from '@/lib/db'

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
} as const

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  blocked: boolean
  blockExpiresAt?: Date
}

/**
 * Check SMS send rate limits by counting actual outbound messages in DB
 * This works across all serverless instances — no in-memory state needed
 */
export async function checkSmsSendLimits(userId: string): Promise<RateLimitResult> {
  const now = new Date()

  // Count outbound SMS in the last minute, hour, and day in a single query
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 minute')::int as last_minute,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::int as last_hour,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int as last_day
     FROM virtual_number_messages
     WHERE user_id = $1 AND direction = 'outbound' AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId]
  )

  const counts = result.rows[0] || { last_minute: 0, last_hour: 0, last_day: 0 }

  // Check per-minute limit
  if (counts.last_minute >= VN_RATE_LIMITS.sendSms.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + 60 * 1000),
      blocked: true,
      blockExpiresAt: new Date(now.getTime() + VN_RATE_LIMITS.sendSms.blockDurationMs)
    }
  }

  // Check hourly limit
  if (counts.last_hour >= VN_RATE_LIMITS.sendSmsHourly.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + 60 * 60 * 1000),
      blocked: true,
      blockExpiresAt: new Date(now.getTime() + VN_RATE_LIMITS.sendSmsHourly.blockDurationMs)
    }
  }

  // Check daily limit
  if (counts.last_day >= VN_RATE_LIMITS.sendSmsDaily.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      blocked: true,
      blockExpiresAt: new Date(now.getTime() + VN_RATE_LIMITS.sendSmsDaily.blockDurationMs)
    }
  }

  // All limits passed — return remaining for the tightest limit (per-minute)
  return {
    allowed: true,
    remaining: VN_RATE_LIMITS.sendSms.maxRequests - counts.last_minute,
    resetAt: new Date(now.getTime() + 60 * 1000),
    blocked: false
  }
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
