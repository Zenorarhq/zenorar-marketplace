import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import aj from '@/lib/arcjet'

// Railway backend URL (from next.config.js rewrite destination)
const RAILWAY_API = 'https://api-production-8db8.up.railway.app/api'

// Fetch security settings from Railway API
async function getSecuritySettings(): Promise<Record<string, any>> {
  try {
    const res = await fetch(`${RAILWAY_API}/settings/group/security`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.data) return data.data
    }
  } catch {
    // If settings fetch fails, return empty (all checks disabled)
  }
  return {}
}

// Extract client IP from request headers
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  // Arcjet: rate limit + bot detection
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(request)
    if (decision.isDenied()) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Fetch security settings
    const settings = await getSecuritySettings()
    const clientIp = getClientIp(request)

    // --- IP Whitelist Check ---
    const ipWhitelist = (settings.ipWhitelist || '').toString().trim()
    if (ipWhitelist) {
      const allowedIps = ipWhitelist
        .split('\n')
        .map((ip: string) => ip.trim())
        .filter(Boolean)
      if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
        return NextResponse.json(
          { success: false, error: 'Access denied from your IP address' },
          { status: 403 }
        )
      }
    }

    // --- Max Login Attempts Check ---
    const maxAttempts = parseInt(settings.loginAttempts || '0', 10)
    if (maxAttempts > 0) {
      try {
        const result = await executeQuery(
          `SELECT COUNT(*) as count FROM login_attempts
           WHERE email = $1 AND success = false
           AND attempted_at > NOW() - INTERVAL '15 minutes'`,
          [email.toLowerCase()]
        )
        if (parseInt(result.rows[0].count) >= maxAttempts) {
          return NextResponse.json(
            { success: false, error: 'Too many failed login attempts. Please try again in 15 minutes.' },
            { status: 429 }
          )
        }
      } catch {
        // If DB check fails, allow login to proceed
      }
    }

    // --- Forward to Railway Backend ---
    const railwayRes = await fetch(`${RAILWAY_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const railwayData = await railwayRes.json()

    // --- Record Login Attempt ---
    try {
      await executeQuery(
        `INSERT INTO login_attempts (email, ip_address, success)
         VALUES ($1, $2, $3)`,
        [email.toLowerCase(), clientIp, railwayData.success === true]
      )
    } catch {
      // Don't fail login if attempt logging fails
    }

    // If Railway login failed, return error as-is
    if (!railwayData.success) {
      return NextResponse.json(railwayData, { status: railwayRes.status })
    }

    // --- Password Expiry Check ---
    const passwordExpiryDays = parseInt(settings.passwordExpiry || '0', 10)
    if (passwordExpiryDays > 0) {
      try {
        const userResult = await executeQuery(
          `SELECT password_changed_at FROM users WHERE LOWER(email) = LOWER($1)`,
          [email]
        )
        if (userResult.rows.length > 0 && userResult.rows[0].password_changed_at) {
          const changedAt = new Date(userResult.rows[0].password_changed_at)
          const expiryDate = new Date(
            changedAt.getTime() + passwordExpiryDays * 24 * 60 * 60 * 1000
          )
          if (new Date() > expiryDate) {
            return NextResponse.json(
              {
                success: false,
                error: 'Your password has expired. Please reset your password.',
                code: 'PASSWORD_EXPIRED',
              },
              { status: 403 }
            )
          }
        }
      } catch {
        // If check fails, allow login to proceed
      }
    }

    // --- Include session timeout in response for client-side enforcement ---
    const sessionTimeout = parseInt(settings.sessionTimeout || '0', 10)
    if (sessionTimeout > 0 && railwayData.data) {
      railwayData.data.sessionTimeout = sessionTimeout
    }

    // Success — return Railway's response
    return NextResponse.json(railwayData)
  } catch (error) {
    console.error('Login proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
