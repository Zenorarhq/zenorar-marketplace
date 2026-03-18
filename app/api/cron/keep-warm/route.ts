import { NextRequest, NextResponse } from 'next/server'
import { getServerApiUrl } from '@/lib/server-api-url'

/**
 * GET /api/cron/keep-warm
 * Pings the Railway backend every 5 minutes to prevent cold starts.
 * Cold-started Railway instances add 5–10s to the first request (e.g. Stripe finalize).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const apiUrl = getServerApiUrl()
    const res = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    })
    const ok = res.ok
    return NextResponse.json({ success: true, railwayStatus: ok ? 'warm' : 'unhealthy', status: res.status })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
