export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getGiftCardAnalytics, getRevenueReport } from '@/lib/gift-cards/analytics'

/**
 * GET /api/admin/gift-cards/analytics
 * Get comprehensive gift card analytics
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
    const type = searchParams.get('type') || 'overview'

    if (type === 'revenue') {
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'startDate and endDate required for revenue report' },
          { status: 400 }
        )
      }

      const report = await getRevenueReport(
        new Date(startDate),
        new Date(endDate)
      )

      return NextResponse.json({
        success: true,
        data: report
      })
    }

    // Default: full analytics
    const fromDate = searchParams.get('fromDate')
      ? new Date(searchParams.get('fromDate')!)
      : undefined
    const toDate = searchParams.get('toDate')
      ? new Date(searchParams.get('toDate')!)
      : undefined

    const analytics = await getGiftCardAnalytics(fromDate, toDate)

    return NextResponse.json({
      success: true,
      data: analytics
    })
  } catch (error: any) {
    console.error('Error fetching gift card analytics:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
