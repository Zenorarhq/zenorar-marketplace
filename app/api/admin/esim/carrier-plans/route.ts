import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/esim/carrier-plans
 * List all carrier plans (including inactive) for admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'EDITOR'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const result = await query(
      `SELECT * FROM carrier_esim_plans ORDER BY display_order ASC, carrier_name ASC, retail_price ASC`
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/admin/esim/carrier-plans
 * Create a new carrier plan
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      carrierName, carrierSlug, planName, description, country,
      dataAmountGb, dataAmountDisplay, isUnlimited,
      voiceMinutes, voiceDisplay, smsCount, smsDisplay,
      networkType, costPrice, retailPrice, currency,
      isActive, isFeatured, displayOrder,
    } = body

    if (!carrierName || !planName || !costPrice || !retailPrice) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO carrier_esim_plans
        (carrier_name, carrier_slug, plan_name, description, country,
         data_amount_gb, data_amount_display, is_unlimited,
         voice_minutes, voice_display, sms_count, sms_display,
         network_type, cost_price, retail_price, currency,
         is_active, is_featured, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        carrierName, carrierSlug || carrierName.toLowerCase().replace(/\s+/g, '-'),
        planName, description, country || 'US',
        dataAmountGb, dataAmountDisplay || `${dataAmountGb}GB`,
        isUnlimited || false,
        voiceMinutes || 0, voiceDisplay || 'Unlimited',
        smsCount || 0, smsDisplay || 'Unlimited',
        networkType || '4g', costPrice, retailPrice, currency || 'USD',
        isActive !== false, isFeatured || false, displayOrder || 0,
      ]
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/esim/carrier-plans
 * Update a carrier plan
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Plan ID required' }, { status: 400 })
    }

    // Map camelCase to snake_case for allowed fields
    const fieldMap: Record<string, string> = {
      carrierName: 'carrier_name', carrierSlug: 'carrier_slug',
      planName: 'plan_name', description: 'description', country: 'country',
      dataAmountGb: 'data_amount_gb', dataAmountDisplay: 'data_amount_display',
      isUnlimited: 'is_unlimited', voiceMinutes: 'voice_minutes',
      voiceDisplay: 'voice_display', smsCount: 'sms_count', smsDisplay: 'sms_display',
      networkType: 'network_type', costPrice: 'cost_price', retailPrice: 'retail_price',
      currency: 'currency', isActive: 'is_active', isFeatured: 'is_featured',
      displayOrder: 'display_order',
    }

    const setClauses: string[] = []
    const params: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMap[key]
      if (dbField && value !== undefined) {
        setClauses.push(`${dbField} = $${paramIndex++}`)
        params.push(value)
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 })
    }

    params.push(id)
    const result = await query(
      `UPDATE carrier_esim_plans SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
