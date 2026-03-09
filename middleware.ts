import arcjet, { detectBot, fixedWindow, shield } from '@arcjet/next'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    // WAF-like protection against common attacks
    shield({ mode: 'LIVE' }),
    // Rate limit: 100 requests per 60 seconds per IP
    fixedWindow({
      mode: 'LIVE',
      max: 100,
      window: '60s',
    }),
    // Block automated clients
    detectBot({
      mode: 'LIVE',
      allow: [
        'CATEGORY:SEARCH_ENGINE',
        'CATEGORY:MONITOR',
        'CATEGORY:PREVIEW',
      ],
    }),
  ],
})

export async function middleware(request: NextRequest) {
  const decision = await aj.protect(request)

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
    if (decision.reason.isBot()) {
      return NextResponse.json(
        { success: false, error: 'Automated requests are not allowed.' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Request denied.' },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}