export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Simple in-memory rate limiter: max 30 events per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW = 60_000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

/**
 * POST /api/analytics/landing-page
 * Public endpoint — records a landing page event (page_view, button_click, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || '0.0.0.0'
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      pageId,
      eventType,
      visitorId,
      sessionId,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      deviceType,
      userAgent,
      buttonText,
      buttonUrl,
      revenue,
      orderId,
      userId,
      metadata,
    } = body

    if (!pageId || !eventType) {
      return NextResponse.json(
        { success: false, error: 'pageId and eventType are required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(pageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pageId format' },
        { status: 400 }
      )
    }

    const validEvents = ['page_view', 'button_click', 'signup', 'add_to_cart', 'purchase']
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event type' },
        { status: 400 }
      )
    }

    await query(
      `INSERT INTO landing_page_events
        (page_id, event_type, visitor_id, user_id, session_id, referrer,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term,
         device_type, user_agent, button_text, button_url, revenue, order_id,
         metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        pageId, eventType, visitorId || null, userId || null, sessionId || null,
        referrer || null, utmSource || null, utmMedium || null, utmCampaign || null,
        utmContent || null, utmTerm || null, deviceType || null, userAgent || null,
        buttonText || null, buttonUrl || null, revenue || null, orderId || null,
        metadata ? JSON.stringify(metadata) : null, clientIp,
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Landing page event error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record event' },
      { status: 500 }
    )
  }
}