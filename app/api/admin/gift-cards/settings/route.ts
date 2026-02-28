import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { reloadlyProvider } from '@/lib/gift-cards/providers/reloadly'

/**
 * GET /api/admin/gift-cards/settings
 * Get gift card settings including Reloadly configuration
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

    const settings = await getSiteSettingsByGroup('gift-cards')

    // Mask the secret for display
    const maskedSecret = settings.reloadlyClientSecret
      ? '••••••••' + settings.reloadlyClientSecret.slice(-4)
      : ''

    return NextResponse.json({
      success: true,
      settings: {
        reloadlyEnabled: settings.reloadlyEnabled === true || settings.reloadlyEnabled === 'true',
        reloadlyClientId: settings.reloadlyClientId || '',
        reloadlyClientSecret: maskedSecret,
        reloadlySandbox: settings.reloadlySandbox === true || settings.reloadlySandbox === 'true',
        hasSecret: !!settings.reloadlyClientSecret
      }
    })
  } catch (error: any) {
    console.error('Error fetching gift card settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/gift-cards/settings
 * Update gift card settings
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

    const isAdmin = user.role?.toUpperCase() === 'ADMIN'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { reloadlyEnabled, reloadlyClientId, reloadlyClientSecret, reloadlySandbox } = body

    // Upsert settings
    const settingsToSave = [
      { key: 'reloadlyEnabled', value: reloadlyEnabled },
      { key: 'reloadlyClientId', value: reloadlyClientId || '' },
      { key: 'reloadlySandbox', value: reloadlySandbox }
    ]

    // Only update secret if a new one is provided (not the masked value)
    if (reloadlyClientSecret && !reloadlyClientSecret.startsWith('••••')) {
      settingsToSave.push({ key: 'reloadlyClientSecret', value: reloadlyClientSecret })
    }

    for (const setting of settingsToSave) {
      await query(
        `INSERT INTO site_settings (key, value, "group", description)
         VALUES ($1, $2, 'gift-cards', $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [
          setting.key,
          JSON.stringify(setting.value),
          `Gift card setting: ${setting.key}`
        ]
      )
    }

    // Clear the token cache so new credentials are used
    reloadlyProvider.clearCache()

    // Test the connection if enabled
    let connectionTest = null
    if (reloadlyEnabled && reloadlyClientId) {
      connectionTest = await reloadlyProvider.testConnection()
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      connectionTest
    })
  } catch (error: any) {
    console.error('Error saving gift card settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save settings' },
      { status: 500 }
    )
  }
}
