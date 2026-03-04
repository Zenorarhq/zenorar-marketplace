// Master Sync Endpoint
// Syncs all providers: eSIM, Gift Cards, Virtual Numbers

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { esimSyncService } from '@/lib/esim/sync'
import { giftCardSyncService } from '@/lib/gift-cards/sync'
import { virtualNumberSyncService } from '@/lib/virtual-numbers/sync'

interface SyncResponse {
  success: boolean
  timestamp: string
  esim: {
    success: boolean
    synced: number
    updated: number
    errors: string[]
  }
  giftCards: {
    success: boolean
    synced: number
    updated: number
    errors: string[]
  }
  virtualNumbers: {
    success: boolean
    synced: number
    updated: number
    errors: string[]
  }
  totals: {
    synced: number
    updated: number
    errors: number
  }
}

// POST /api/admin/sync - Run sync for all providers
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

    // Parse options from body
    const body = await request.json().catch(() => ({}))
    const countryCode = body.countryCode || 'US'
    const syncEsim = body.esim !== false
    const syncGiftCards = body.giftCards !== false
    const syncVirtualNumbers = body.virtualNumbers !== false

    const response: SyncResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      esim: { success: false, synced: 0, updated: 0, errors: [] },
      giftCards: { success: false, synced: 0, updated: 0, errors: [] },
      virtualNumbers: { success: false, synced: 0, updated: 0, errors: [] },
      totals: { synced: 0, updated: 0, errors: 0 }
    }

    // Run syncs in parallel
    const [esimResult, giftCardsResult, virtualNumbersResult] = await Promise.all([
      syncEsim ? esimSyncService.syncAll() : null,
      syncGiftCards ? giftCardSyncService.syncAll(countryCode) : null,
      syncVirtualNumbers ? virtualNumberSyncService.syncAll() : null
    ])

    // Process eSIM results
    if (esimResult) {
      response.esim = {
        success: esimResult.success,
        synced: esimResult.totalSynced,
        updated: esimResult.totalUpdated,
        errors: esimResult.results.flatMap(r => r.errors)
      }
      response.totals.synced += esimResult.totalSynced
      response.totals.updated += esimResult.totalUpdated
      response.totals.errors += response.esim.errors.length
    }

    // Process Gift Cards results
    if (giftCardsResult) {
      response.giftCards = {
        success: giftCardsResult.success,
        synced: giftCardsResult.totalSynced,
        updated: giftCardsResult.totalUpdated,
        errors: giftCardsResult.results.flatMap(r => r.errors)
      }
      response.totals.synced += giftCardsResult.totalSynced
      response.totals.updated += giftCardsResult.totalUpdated
      response.totals.errors += response.giftCards.errors.length
    }

    // Process Virtual Numbers results
    if (virtualNumbersResult) {
      response.virtualNumbers = {
        success: virtualNumbersResult.success,
        synced: virtualNumbersResult.totalSynced,
        updated: virtualNumbersResult.totalUpdated,
        errors: virtualNumbersResult.results.flatMap(r => r.errors)
      }
      response.totals.synced += virtualNumbersResult.totalSynced
      response.totals.updated += virtualNumbersResult.totalUpdated
      response.totals.errors += response.virtualNumbers.errors.length
    }

    // Determine overall success
    response.success = (
      (!syncEsim || response.esim.success) &&
      (!syncGiftCards || response.giftCards.success) &&
      (!syncVirtualNumbers || response.virtualNumbers.success)
    )

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    )
  }
}

// GET /api/admin/sync - Get sync status/info
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

    // Get enabled providers
    const [esimProviders, giftCardProviders, virtualNumberProviders] = await Promise.all([
      esimSyncService.getEnabledProviders(),
      giftCardSyncService.getEnabledProviders(),
      virtualNumberSyncService.getEnabledProviders()
    ])

    return NextResponse.json({
      providers: {
        esim: esimProviders,
        giftCards: giftCardProviders,
        virtualNumbers: virtualNumberProviders
      },
      endpoints: {
        syncAll: 'POST /api/admin/sync',
        syncEsim: 'POST /api/admin/sync/esim',
        syncGiftCards: 'POST /api/admin/sync/gift-cards',
        syncVirtualNumbers: 'POST /api/admin/sync/virtual-numbers'
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
