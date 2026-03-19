export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      `SELECT
        id, carrier_name, carrier_slug, plan_name, description, country,
        data_amount_gb, data_amount_display, is_unlimited,
        voice_minutes, voice_display, sms_count, sms_display,
        network_type, retail_price, currency, is_featured
      FROM carrier_esim_plans
      WHERE id = $1 AND is_active = true`,
      [params.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    const plan = {
      id: row.id,
      carrierName: row.carrier_name,
      carrierSlug: row.carrier_slug,
      planName: row.plan_name,
      description: row.description,
      country: row.country,
      dataAmountGb: row.data_amount_gb ? parseFloat(row.data_amount_gb) : null,
      dataAmountDisplay: row.data_amount_display,
      isUnlimited: row.is_unlimited,
      voiceMinutes: row.voice_minutes,
      voiceDisplay: row.voice_display,
      smsCount: row.sms_count,
      smsDisplay: row.sms_display,
      networkType: row.network_type,
      retailPrice: parseFloat(row.retail_price),
      currency: row.currency,
      isFeatured: row.is_featured,
    }

    return NextResponse.json({ success: true, data: plan })
  } catch (error: any) {
    console.error('Carrier plan fetch error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch carrier plan' },
      { status: 500 }
    )
  }
}
