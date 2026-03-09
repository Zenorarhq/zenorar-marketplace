import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { giftCardService } from '@/lib/gift-cards/service'
import { syncAllGiftCardProviders, syncGiftCardProvider } from '@/lib/gift-cards/sync'

/**
 * GET /api/admin/gift-cards/sync
 * Test all enabled provider connections
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

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Test all enabled providers
    const results = await giftCardService.testAllConnections()
    const enabledProviders = await giftCardService.getEnabledProviders()

    return NextResponse.json({
      success: Object.values(results).some(r => r.success),
      enabledProviders,
      connections: results
    })
  } catch (error: any) {
    console.error('Error testing gift card connections:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Connection test failed' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/gift-cards/sync
 * Sync gift card products from all enabled providers (or a specific one)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const countryCode = body.countryCode || 'US'
    const provider = body.provider // Optional: specific provider to sync

    if (provider) {
      // Sync specific provider
      const result = await syncGiftCardProvider(provider, countryCode)

      return NextResponse.json({
        success: result.success,
        provider: result.provider,
        synced: result.synced,
        updated: result.updated,
        errors: result.errors.slice(0, 10)
      })
    }

    // Sync all enabled providers
    const result = await syncAllGiftCardProviders(countryCode)

    return NextResponse.json({
      success: result.success,
      totalSynced: result.totalSynced,
      totalUpdated: result.totalUpdated,
      results: result.results.map(r => ({
        provider: r.provider,
        success: r.success,
        synced: r.synced,
        updated: r.updated,
        errors: r.errors.slice(0, 5)
      }))
    })
  } catch (error: any) {
    console.error('Error syncing gift cards:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
}
