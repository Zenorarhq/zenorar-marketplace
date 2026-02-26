import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const result = await query(
      `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.region_id,
        r.name as region_name,
        r.slug as region_slug,
        p.coverage_type,
        p.countries,
        p.data_amount_gb,
        p.data_amount_display,
        p.validity_days,
        p.is_unlimited,
        p.voice_minutes,
        p.sms_count,
        p.network_type,
        p.speed_description,
        p.hotspot_allowed,
        p.supports_topup,
        p.activation_policy,
        p.retail_price,
        p.currency,
        p.is_featured,
        p.metadata
      FROM esim_plans p
      LEFT JOIN esim_regions r ON p.region_id = r.id
      WHERE p.slug = $1 AND p.is_active = true
      `,
      [slug]
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
      name: row.name,
      slug: row.slug,
      description: row.description,
      regionId: row.region_id,
      regionName: row.region_name,
      regionSlug: row.region_slug,
      coverageType: row.coverage_type,
      countries: row.countries || [],
      dataAmountGb: parseFloat(row.data_amount_gb) || 0,
      dataAmountDisplay: row.data_amount_display,
      validityDays: row.validity_days,
      isUnlimited: row.is_unlimited,
      voiceMinutes: row.voice_minutes || 0,
      smsCount: row.sms_count || 0,
      networkType: row.network_type,
      speedDescription: row.speed_description,
      hotspotAllowed: row.hotspot_allowed,
      supportsTopup: row.supports_topup,
      activationPolicy: row.activation_policy,
      retailPrice: parseFloat(row.retail_price) || 0,
      currency: row.currency,
      isFeatured: row.is_featured,
      metadata: row.metadata,
    }

    return NextResponse.json({ success: true, data: plan })
  } catch (error: any) {
    console.error('Error fetching eSIM plan:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch plan' },
      { status: 500 }
    )
  }
}
