import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth-utils'
import { query } from '@/lib/db'
import { pricingService, PricingSettings } from '@/lib/virtual-numbers/pricing'
import { providerManager } from '@/lib/virtual-numbers/providers/manager'

/**
 * GET /api/admin/virtual-numbers/settings
 * Get all virtual number settings (pricing + providers)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const payload = verifyAccessToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get pricing settings
    const pricingSettings = await pricingService.getSettings()

    // Get provider configs (with sensitive fields masked)
    const providerConfigs = await providerManager.getProviderConfigs()
    const maskedProviders = providerConfigs.map(p => ({
      ...p,
      apiKey: p.apiKey ? '••••••••' + p.apiKey.slice(-4) : null,
      apiSecret: p.apiSecret ? '••••••••' : null,
      authToken: p.authToken ? '••••••••' : null,
      webhookSecret: p.webhookSecret ? '••••••••' : null,
      // Show whether credentials are set
      hasCredentials: !!(p.apiKey || p.accountSid),
    }))

    return NextResponse.json({
      success: true,
      data: {
        pricing: pricingSettings,
        providers: maskedProviders,
      },
    })
  } catch (error: any) {
    console.error('Error getting virtual number settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/virtual-numbers/settings
 * Update virtual number settings
 */
export async function PUT(req: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const payload = verifyAccessToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { pricing, provider } = body

    const results: { pricing?: boolean; provider?: boolean } = {}

    // Update pricing settings if provided
    if (pricing) {
      const pricingUpdates: Partial<PricingSettings> = {}

      if (pricing.durationMultiplier1d !== undefined) {
        pricingUpdates.durationMultiplier1d = Number(pricing.durationMultiplier1d)
      }
      if (pricing.durationMultiplier7d !== undefined) {
        pricingUpdates.durationMultiplier7d = Number(pricing.durationMultiplier7d)
      }
      if (pricing.durationMultiplier30d !== undefined) {
        pricingUpdates.durationMultiplier30d = Number(pricing.durationMultiplier30d)
      }
      if (pricing.numberMarkupPercent !== undefined) {
        pricingUpdates.numberMarkupPercent = Number(pricing.numberMarkupPercent)
      }
      if (pricing.minuteMarkupPercent !== undefined) {
        pricingUpdates.minuteMarkupPercent = Number(pricing.minuteMarkupPercent)
      }
      if (pricing.minPrice1d !== undefined) {
        pricingUpdates.minPrice1d = Number(pricing.minPrice1d)
      }
      if (pricing.minPrice7d !== undefined) {
        pricingUpdates.minPrice7d = Number(pricing.minPrice7d)
      }
      if (pricing.minPrice30d !== undefined) {
        pricingUpdates.minPrice30d = Number(pricing.minPrice30d)
      }
      if (pricing.smsLimit1d !== undefined) {
        pricingUpdates.smsLimit1d = Number(pricing.smsLimit1d)
      }
      if (pricing.smsLimit7d !== undefined) {
        pricingUpdates.smsLimit7d = Number(pricing.smsLimit7d)
      }
      if (pricing.smsLimit30d !== undefined) {
        pricingUpdates.smsLimit30d = Number(pricing.smsLimit30d)
      }
      if (pricing.businessAddon1d !== undefined) {
        pricingUpdates.businessAddon1d = Number(pricing.businessAddon1d)
      }
      if (pricing.businessAddon7d !== undefined) {
        pricingUpdates.businessAddon7d = Number(pricing.businessAddon7d)
      }
      if (pricing.businessAddon30d !== undefined) {
        pricingUpdates.businessAddon30d = Number(pricing.businessAddon30d)
      }
      if (pricing.minutePackages !== undefined) {
        pricingUpdates.minutePackages = pricing.minutePackages
      }

      results.pricing = await pricingService.updateSettings(pricingUpdates)
    }

    // Update provider config if provided
    if (provider && provider.slug) {
      const providerUpdates: any = {}

      if (provider.isEnabled !== undefined) {
        providerUpdates.isEnabled = provider.isEnabled
      }
      if (provider.isDefault !== undefined) {
        providerUpdates.isDefault = provider.isDefault
      }
      // Only update credentials if new values provided (not masked)
      if (provider.apiKey && !provider.apiKey.includes('••••')) {
        providerUpdates.apiKey = provider.apiKey
      }
      if (provider.apiSecret && !provider.apiSecret.includes('••••')) {
        providerUpdates.apiSecret = provider.apiSecret
      }
      if (provider.accountSid) {
        providerUpdates.accountSid = provider.accountSid
      }
      if (provider.authToken && !provider.authToken.includes('••••')) {
        providerUpdates.authToken = provider.authToken
      }
      if (provider.webhookSecret && !provider.webhookSecret.includes('••••')) {
        providerUpdates.webhookSecret = provider.webhookSecret
      }
      if (provider.config) {
        providerUpdates.config = provider.config
      }

      results.provider = await providerManager.updateProviderConfig(
        provider.slug,
        providerUpdates
      )
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error: any) {
    console.error('Error updating virtual number settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}
