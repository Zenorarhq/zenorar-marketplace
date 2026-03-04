// Virtual Numbers Provider Sync Endpoint

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { virtualNumberSyncService } from '@/lib/virtual-numbers/sync'

// POST /api/admin/sync/virtual-numbers - Sync virtual number providers
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

    const result = await virtualNumberSyncService.syncAll()

    return NextResponse.json({
      success: result.success,
      results: result.results,
      totalSynced: result.totalSynced,
      totalUpdated: result.totalUpdated,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Virtual numbers sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Virtual numbers sync failed' },
      { status: 500 }
    )
  }
}

// GET /api/admin/sync/virtual-numbers - Get enabled virtual number providers
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

    const providers = await virtualNumberSyncService.getEnabledProviders()

    return NextResponse.json({
      enabledProviders: providers,
      availableProviders: ['twilio', 'plivo', 'vonage']
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get virtual number providers' },
      { status: 500 }
    )
  }
}
