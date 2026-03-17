import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, getSiteSettingsByGroup } from '@/lib/db-helpers'

// Shared cron auth — same pattern as /api/cron/cleanup
async function getCronSettings(): Promise<{ cronEnabled: boolean; cronSecret: string }> {
  try {
    const settings = await getSiteSettingsByGroup('cron')
    return {
      cronEnabled: settings.cronEnabled !== false, // Default to true if not set
      cronSecret: settings.cronSecret || ''
    }
  } catch (error) {
    console.error('Error loading cron settings:', error)
    return {
      cronEnabled: true,
      cronSecret: process.env.CRON_SECRET || ''
    }
  }
}

/**
 * GET /api/cron/publish-scheduled
 * Auto-publish blog posts with status = SCHEDULED and published_at <= NOW()
 *
 * Called hourly by Vercel Cron.
 * Auth: Bearer CRON_SECRET (from admin settings or env)
 */
export async function GET(request: NextRequest) {
  try {
    const cronSettings = await getCronSettings()

    // Check if cron jobs are enabled (admin toggle)
    if (!cronSettings.cronEnabled) {
      return NextResponse.json(
        { success: false, error: 'Cron jobs are disabled' },
        { status: 403 }
      )
    }

    // Verify cron secret if configured
    if (cronSettings.cronSecret) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token !== cronSettings.cronSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Publish scheduled posts whose publish date has arrived
    const result = await executeQuery(
      `UPDATE blog_posts
       SET status = 'PUBLISHED'
       WHERE status = 'SCHEDULED' AND published_at <= NOW()
       RETURNING id, title, slug`
    )

    const published = result.rows
    if (published.length > 0) {
      console.log(`[CronPublish] Published ${published.length} scheduled post(s):`, published.map(p => p.slug).join(', '))
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      published: published.length,
      posts: published.map(p => ({ id: p.id, title: p.title, slug: p.slug })),
    })
  } catch (error) {
    console.error('[CronPublish] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to publish scheduled posts' }, { status: 500 })
  }
}