export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/analytics/landing-page/[pageId]
 * Returns analytics data for a specific landing page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role !== 'admin' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { pageId } = await params
    const { searchParams } = new URL(request.url)

    const days = parseInt(searchParams.get('days') || '7')
    const startDate = searchParams.get('startDate') || new Date(Date.now() - days * 86400000).toISOString()
    const endDate = searchParams.get('endDate') || new Date().toISOString()

    // Summary stats
    const summaryResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'page_view') as views,
         COUNT(DISTINCT visitor_id) FILTER (WHERE event_type = 'page_view') as unique_visitors,
         COUNT(*) FILTER (WHERE event_type = 'button_click') as button_clicks,
         COUNT(*) FILTER (WHERE event_type = 'signup') as signups,
         COUNT(*) FILTER (WHERE event_type = 'add_to_cart') as add_to_carts,
         COUNT(*) FILTER (WHERE event_type = 'purchase') as purchases,
         COALESCE(SUM(revenue) FILTER (WHERE event_type = 'purchase'), 0) as revenue
       FROM landing_page_events
       WHERE page_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [pageId, startDate, endDate]
    )

    const summary = summaryResult.rows[0]
    const views = parseInt(summary.views) || 0
    const purchases = parseInt(summary.purchases) || 0
    summary.conversion_rate = views > 0 ? ((purchases / views) * 100).toFixed(2) : '0.00'

    // Timeline (daily breakdown)
    const timelineResult = await query(
      `SELECT
         date_trunc('day', created_at) as date,
         COUNT(*) FILTER (WHERE event_type = 'page_view') as views,
         COUNT(*) FILTER (WHERE event_type = 'button_click') as clicks,
         COUNT(*) FILTER (WHERE event_type = 'purchase') as purchases,
         COALESCE(SUM(revenue) FILTER (WHERE event_type = 'purchase'), 0) as revenue
       FROM landing_page_events
       WHERE page_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY date_trunc('day', created_at)
       ORDER BY date ASC`,
      [pageId, startDate, endDate]
    )

    // Source breakdown (referrer grouped)
    const sourcesResult = await query(
      `SELECT
         CASE
           WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
           WHEN referrer ILIKE '%facebook%' OR referrer ILIKE '%fb.%' THEN 'Facebook'
           WHEN referrer ILIKE '%google%' THEN 'Google'
           WHEN referrer ILIKE '%instagram%' THEN 'Instagram'
           WHEN referrer ILIKE '%twitter%' OR referrer ILIKE '%x.com%' THEN 'Twitter/X'
           WHEN referrer ILIKE '%tiktok%' THEN 'TikTok'
           WHEN referrer ILIKE '%youtube%' THEN 'YouTube'
           ELSE 'Other'
         END as source,
         COUNT(*) FILTER (WHERE event_type = 'page_view') as views,
         COUNT(*) FILTER (WHERE event_type = 'purchase') as purchases
       FROM landing_page_events
       WHERE page_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY source
       ORDER BY views DESC`,
      [pageId, startDate, endDate]
    )

    // Device breakdown
    const devicesResult = await query(
      `SELECT
         COALESCE(device_type, 'unknown') as device,
         COUNT(*) FILTER (WHERE event_type = 'page_view') as views
       FROM landing_page_events
       WHERE page_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY device_type
       ORDER BY views DESC`,
      [pageId, startDate, endDate]
    )

    // Top buttons clicked
    const buttonsResult = await query(
      `SELECT
         button_text as text,
         button_url as url,
         COUNT(*) as clicks
       FROM landing_page_events
       WHERE page_id = $1 AND event_type = 'button_click'
         AND created_at >= $2 AND created_at <= $3
       GROUP BY button_text, button_url
       ORDER BY clicks DESC
       LIMIT 10`,
      [pageId, startDate, endDate]
    )

    // UTM breakdown
    const utmResult = await query(
      `SELECT
         COALESCE(utm_campaign, '(none)') as campaign,
         COALESCE(utm_source, '(none)') as source,
         COALESCE(utm_medium, '(none)') as medium,
         COUNT(*) FILTER (WHERE event_type = 'page_view') as views,
         COUNT(*) FILTER (WHERE event_type = 'purchase') as purchases,
         COALESCE(SUM(revenue) FILTER (WHERE event_type = 'purchase'), 0) as revenue
       FROM landing_page_events
       WHERE page_id = $1 AND created_at >= $2 AND created_at <= $3
         AND (utm_source IS NOT NULL OR utm_campaign IS NOT NULL)
       GROUP BY utm_campaign, utm_source, utm_medium
       ORDER BY views DESC
       LIMIT 20`,
      [pageId, startDate, endDate]
    )

    return NextResponse.json({
      success: true,
      data: {
        summary,
        timeline: timelineResult.rows,
        sources: sourcesResult.rows,
        devices: devicesResult.rows,
        topButtons: buttonsResult.rows,
        utmBreakdown: utmResult.rows,
      },
    })
  } catch (error: any) {
    console.error('Landing page analytics error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get analytics' },
      { status: 500 }
    )
  }
}
