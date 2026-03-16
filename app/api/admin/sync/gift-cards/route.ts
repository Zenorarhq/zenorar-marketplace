// Gift Card Provider Sync Endpoint

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { giftCardSyncService } from '@/lib/gift-cards/sync'

// POST /api/admin/sync/gift-cards - Sync gift card providers
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
    const provider = body.provider // Optional: sync specific provider
    const countryCode = body.countryCode || 'US'

    let result

    if (provider) {
      // Sync specific provider
      result = await giftCardSyncService.syncProvider(provider, countryCode)
      return NextResponse.json({
        success: result.success,
        provider: result.provider,
        synced: result.synced,
        updated: result.updated,
        errors: result.errors,
        countryCode,
        timestamp: new Date().toISOString()
      })
    } else {
      // Sync all providers
      result = await giftCardSyncService.syncAll(countryCode)
      return NextResponse.json({
        success: result.success,
        results: result.results,
        totalSynced: result.totalSynced,
        totalUpdated: result.totalUpdated,
        countryCode,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error: any) {
    console.error('Gift card sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gift card sync failed' },
      { status: 500 }
    )
  }
}

// GET /api/admin/sync/gift-cards - Get enabled gift card providers
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

    const providers = await giftCardSyncService.getEnabledProviders()

    return NextResponse.json({
      enabledProviders: providers,
      availableProviders: ['reloadly', 'tango', 'zendit']
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get gift card providers' },
      { status: 500 }
    )
  }
}
