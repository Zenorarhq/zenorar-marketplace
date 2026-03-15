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

// GET /api/admin/sync/esim - Get enabled eSIM providers with connection details
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

    // Get detailed provider status from settings
    const { getSiteSettingsByGroup } = await import('@/lib/db-helpers')
    const settings = await getSiteSettingsByGroup('api')

    // Build connections object with details for each enabled provider
    const connections: Record<string, { enabled: boolean; mode: string; hasCredentials: boolean }> = {}

    // Zendit
    const zenditEnabled = settings.zenditEnabled === true || settings.zenditEnabled === 'true'
    if (zenditEnabled) {
      const mode = settings.zenditMode || 'sandbox'
      const hasCredentials = mode === 'sandbox'
        ? !!(settings.zenditSandboxApiKey || process.env.ZENDIT_SANDBOX_API_KEY)
        : !!(settings.zenditProductionApiKey || process.env.ZENDIT_API_KEY)
      connections['zendit'] = { enabled: true, mode, hasCredentials }
    }

    // Airalo
    const airaloEnabled = settings.airaloEnabled === true || settings.airaloEnabled === 'true'
    if (airaloEnabled) {
      const mode = settings.airaloMode || 'sandbox'
      const hasCredentials = mode === 'sandbox'
        ? !!(settings.airaloSandboxClientId && settings.airaloSandboxClientSecret)
        : !!(settings.airaloProductionClientId && settings.airaloProductionClientSecret)
      connections['airalo'] = { enabled: true, mode, hasCredentials }
    }

    // eSIM Go
    const esimGoEnabled = settings.esimGoEnabled === true || settings.esimGoEnabled === 'true'
    if (esimGoEnabled) {
      const hasCredentials = !!(settings.esimGoApiKey || process.env.ESIMGO_API_KEY)
      connections['esimgo'] = { enabled: true, mode: 'production', hasCredentials }
    }

    const enabledProviders = Object.keys(connections)

    return NextResponse.json({
      connections,
      enabledProviders,
      availableProviders: ['zendit', 'airalo', 'esimgo']
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get eSIM providers' },
      { status: 500 }
    )
  }
}
