import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { checkAndSendLowStockAlerts, getRecentAlerts, getAlertConfig } from '@/lib/gift-cards/alerts'
import { getLowStockAlerts } from '@/lib/gift-cards/inventory'

/**
 * GET /api/admin/gift-cards/alerts
 * Get alert configuration and recent alerts
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'config') {
      const config = await getAlertConfig()
      return NextResponse.json({ success: true, data: config })
    }

    if (action === 'low-stock') {
      const threshold = parseInt(searchParams.get('threshold') || '5')
      const items = await getLowStockAlerts(threshold)
      return NextResponse.json({ success: true, data: items })
    }

    // Default: get recent alerts
    const limit = parseInt(searchParams.get('limit') || '10')
    const alerts = await getRecentAlerts(limit)

    return NextResponse.json({ success: true, data: alerts })
  } catch (error: any) {
    console.error('Error getting gift card alerts:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get alerts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/gift-cards/alerts
 * Trigger low stock alert check (can be called by cron)
 */
export async function POST(request: NextRequest) {
  try {
    // Allow cron secret authentication
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    let isAuthorized = false

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true
    } else {
      const user = await authenticateRequest(request)
      if (user && user.role === 'admin') {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await checkAndSendLowStockAlerts()

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Error checking gift card alerts:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check alerts' },
      { status: 500 }
    )
  }
}
