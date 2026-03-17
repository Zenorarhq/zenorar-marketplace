import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { isTestModeEnabled, cleanupTestDataForUser, cleanupAllTestData } from '@/lib/test-mode'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test-mode
 * Check if global test mode is enabled
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const enabled = await isTestModeEnabled()
    const isAdmin = user.role?.toUpperCase() === 'ADMIN'

    return NextResponse.json({
      success: true,
      data: { enabled: enabled || isAdmin },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/test-mode
 * Clean up test data
 * ?cleanup=all (admin only) — purge all users' test data
 * ?cleanup=mine — purge current user's test data
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const scope = request.nextUrl.searchParams.get('cleanup') || 'mine'

    if (scope === 'all') {
      const isAdmin = user.role?.toUpperCase() === 'ADMIN'
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
      }
      const result = await cleanupAllTestData()
      return NextResponse.json({ success: true, data: result })
    }

    const result = await cleanupTestDataForUser(user.id)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Test mode cleanup error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
