import { NextRequest, NextResponse } from 'next/server'
import { esimInventoryService } from '@/lib/esim/inventory'
import { esimProvisioningService } from '@/lib/esim'
import { releaseExpiredReservations as releaseGiftCardReservations, markExpiredCodes } from '@/lib/gift-cards/inventory'
import { virtualNumberService } from '@/lib/virtual-numbers/service'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

// Get cron settings from database
async function getCronSettings(): Promise<{ cronEnabled: boolean; cronSecret: string }> {
  try {
    const settings = await getSiteSettingsByGroup('cron')
    return {
      cronEnabled: settings.cronEnabled !== false, // Default to true if not set
      cronSecret: settings.cronSecret || ''
    }
  } catch (error) {
    console.error('Error loading cron settings:', error)
    // Fall back to environment variable for backwards compatibility
    return {
      cronEnabled: true,
      cronSecret: process.env.CRON_SECRET || ''
    }
  }
}

/**
 * GET /api/cron/cleanup
 * Run all cleanup tasks
 *
 * Should be called periodically (every 15-30 minutes) by:
 * - Vercel Cron
 * - External cron service (e.g., cron-job.org)
 * - Or manually for testing
 *
 * Add header: Authorization: Bearer YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Load cron settings from database
    const cronSettings = await getCronSettings()

    // Check if cron jobs are enabled
    if (!cronSettings.cronEnabled) {
      return NextResponse.json(
        { success: false, error: 'Cron jobs are disabled' },
        { status: 403 }
      )
    }

    // Verify cron secret if configured
    if (cronSettings.cronSecret) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token !== cronSettings.cronSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const results: Record<string, any> = {}

    // 1. Release stale eSIM inventory reservations
    try {
      const esimReservationsReleased = await esimInventoryService.releaseStaleReservations()
      results.esimReservations = {
        success: true,
        released: esimReservationsReleased
      }
    } catch (error: any) {
      results.esimReservations = {
        success: false,
        error: error.message
      }
    }

    // 2. Retry failed eSIM provisions
    try {
      const retryResults = await esimProvisioningService.retryFailedProvisions()
      results.esimRetries = {
        success: true,
        ...retryResults
      }
    } catch (error: any) {
      results.esimRetries = {
        success: false,
        error: error.message
      }
    }

    // 3. Release expired gift card reservations
    try {
      const giftCardReservationsReleased = await releaseGiftCardReservations()
      results.giftCardReservations = {
        success: true,
        released: giftCardReservationsReleased
      }
    } catch (error: any) {
      results.giftCardReservations = {
        success: false,
        error: error.message
      }
    }

    // 4. Mark expired gift card codes
    try {
      const expiredCodes = await markExpiredCodes()
      results.giftCardExpired = {
        success: true,
        marked: expiredCodes
      }
    } catch (error: any) {
      results.giftCardExpired = {
        success: false,
        error: error.message
      }
    }

    // 5. Expire virtual numbers
    try {
      const expiredNumbers = await virtualNumberService.expireNumbers()
      results.virtualNumbers = {
        success: true,
        ...expiredNumbers
      }
    } catch (error: any) {
      results.virtualNumbers = {
        success: false,
        error: error.message
      }
    }

    // Check if any task failed
    const allSucceeded = Object.values(results).every((r: any) => r.success)

    return NextResponse.json({
      success: allSucceeded,
      timestamp: new Date().toISOString(),
      results
    })
  } catch (error: any) {
    console.error('Cron cleanup error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Cleanup failed' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/cleanup
 * Run specific cleanup task
 *
 * Body: { task: 'esim-reservations' | 'esim-retries' | 'gift-card-reservations' | 'virtual-numbers' }
 */
export async function POST(request: NextRequest) {
  try {
    // Load cron settings from database
    const cronSettings = await getCronSettings()

    // Check if cron jobs are enabled
    if (!cronSettings.cronEnabled) {
      return NextResponse.json(
        { success: false, error: 'Cron jobs are disabled' },
        { status: 403 }
      )
    }

    // Verify cron secret if configured
    if (cronSettings.cronSecret) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token !== cronSettings.cronSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const { task } = await request.json()

    let result: any

    switch (task) {
      case 'esim-reservations':
        const released = await esimInventoryService.releaseStaleReservations()
        result = { task, released }
        break

      case 'esim-retries':
        result = { task, ...await esimProvisioningService.retryFailedProvisions() }
        break

      case 'gift-card-reservations':
        const gcReleased = await releaseGiftCardReservations()
        result = { task, released: gcReleased }
        break

      case 'gift-card-expired':
        const marked = await markExpiredCodes()
        result = { task, marked }
        break

      case 'virtual-numbers':
        result = { task, ...await virtualNumberService.expireNumbers() }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown task. Valid tasks: esim-reservations, esim-retries, gift-card-reservations, gift-card-expired, virtual-numbers' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    })
  } catch (error: any) {
    console.error('Cron task error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Task failed' },
      { status: 500 }
    )
  }
}
