// eSIM Provider Sync Endpoint

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { esimSyncService } from '@/lib/esim/sync'

// POST /api/admin/sync/esim - Sync eSIM providers
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

    let result

    if (provider) {
      // Sync specific provider
      result = await esimSyncService.syncProvider(provider)
      return NextResponse.json({
        success: result.success,
        provider: result.provider,
        synced: result.synced,
        updated: result.updated,
        errors: result.errors,
        timestamp: new Date().toISOString()
      })
    } else {
      // Sync all providers
      result = await esimSyncService.syncAll()
      return NextResponse.json({
        success: result.success,
        results: result.results,
        totalSynced: result.totalSynced,
        totalUpdated: result.totalUpdated,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error: any) {
    console.error('eSIM sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'eSIM sync failed' },
      { status: 500 }
    )
  }
}

// GET /api/admin/sync/esim - Get enabled eSIM providers
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

    const providers = await esimSyncService.getEnabledProviders()

    return NextResponse.json({
      enabledProviders: providers,
      availableProviders: ['airalo', 'esimgo', 'mobimatter']
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get eSIM providers' },
      { status: 500 }
    )
  }
}
