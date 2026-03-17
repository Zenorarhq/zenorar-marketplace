import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/cards/providers
 * Get all provider configs with pricing and connection status
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

    const pricingResult = await query(
      `SELECT * FROM card_pricing ORDER BY provider`
    )

    const settings = await getSiteSettingsByGroup('api')

    const providerStatus: Record<string, { enabled: boolean; configured: boolean; mode: string }> = {
      sudo: {
        enabled: settings.sudoCardsEnabled === true || settings.sudoCardsEnabled === 'true',
        configured: !!(settings.sudoSandboxApiKey || settings.sudoProductionApiKey),
        mode: settings.sudoMode || 'sandbox',
      },
      lithic: {
        enabled: settings.lithicCardsEnabled === true || settings.lithicCardsEnabled === 'true',
        configured: !!(settings.lithicSandboxApiKey || settings.lithicProductionApiKey),
        mode: settings.lithicMode || 'sandbox',
      },
      reloadly: {
        enabled: settings.reloadlyCardsEnabled === true || settings.reloadlyCardsEnabled === 'true',
        configured: !!(settings.reloadlyCardsSandboxClientId || settings.reloadlyCardsProductionClientId),
        mode: settings.reloadlyCardsMode || 'sandbox',
      },
    }

    // Merge pricing with status
    const providers = pricingResult.rows.map((p: any) => ({
      ...p,
      status: providerStatus[p.provider] || { enabled: false, configured: false, mode: 'sandbox' },
    }))

    return NextResponse.json({
      success: true,
      data: providers,
    })
  } catch (error: any) {
    console.error('Admin cards providers error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load providers' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/cards/providers
 * Update provider pricing/enabled status
 */
export async function PATCH(request: NextRequest) {
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
    const { provider, is_enabled, creation_fee, top_up_fee_percent, instant_markup_percent, min_top_up, max_top_up, min_denomination, max_denomination } = body

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      )
    }

    const fields: string[] = []
    const values: any[] = []
    let idx = 1

    if (is_enabled !== undefined) { fields.push(`is_enabled = $${idx++}`); values.push(is_enabled) }
    if (creation_fee !== undefined) { fields.push(`creation_fee = $${idx++}`); values.push(creation_fee) }
    if (top_up_fee_percent !== undefined) { fields.push(`top_up_fee_percent = $${idx++}`); values.push(top_up_fee_percent) }
    if (instant_markup_percent !== undefined) { fields.push(`instant_markup_percent = $${idx++}`); values.push(instant_markup_percent) }
    if (min_top_up !== undefined) { fields.push(`min_top_up = $${idx++}`); values.push(min_top_up) }
    if (max_top_up !== undefined) { fields.push(`max_top_up = $${idx++}`); values.push(max_top_up) }
    if (min_denomination !== undefined) { fields.push(`min_denomination = $${idx++}`); values.push(min_denomination) }
    if (max_denomination !== undefined) { fields.push(`max_denomination = $${idx++}`); values.push(max_denomination) }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    fields.push(`updated_at = NOW()`)
    values.push(provider)

    await query(
      `UPDATE card_pricing SET ${fields.join(', ')} WHERE provider = $${idx}`,
      values
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin cards providers update error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update provider' },
      { status: 500 }
    )
  }
}