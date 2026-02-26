import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const regionSlug = searchParams.get('region')
    const countryCode = searchParams.get('country')
    const featured = searchParams.get('featured')

    let sql = `
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
        p.retail_price,
        p.currency,
        p.is_featured
      FROM esim_plans p
      LEFT JOIN esim_regions r ON p.region_id = r.id
      WHERE p.is_active = true AND p.stock_available = true
    `
    const params: any[] = []
    let paramIndex = 1

    if (regionSlug) {
      sql += ` AND r.slug = $${paramIndex}`
      params.push(regionSlug)
      paramIndex++
    }

    if (countryCode) {
      sql += ` AND $${paramIndex} = ANY(p.countries)`
      params.push(countryCode.toUpperCase())
      paramIndex++
    }

    if (featured === 'true') {
      sql += ` AND p.is_featured = true`
    }

    sql += ` ORDER BY p.is_featured DESC, p.retail_price ASC`

    const result = await query(sql, params)

    const plans = result.rows.map((row) => ({
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
      retailPrice: parseFloat(row.retail_price) || 0,
      currency: row.currency,
      isFeatured: row.is_featured,
    }))

    return NextResponse.json({ success: true, data: plans })
  } catch (error: any) {
    console.error('Error fetching eSIM plans:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}
