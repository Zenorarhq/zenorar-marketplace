export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Get countries whose region has active eSIM plans
    // Zendit only provides region names, not country codes, so we resolve
    // countries via esim_countries → esim_regions → esim_plans
    const result = await query(`
      SELECT DISTINCT ec.iso_code, ec.name AS country_name
      FROM esim_countries ec
      JOIN esim_regions er ON ec.region_id = er.id
      WHERE ec.is_active = true
        AND er.id IN (
          SELECT DISTINCT region_id
          FROM esim_plans
          WHERE is_active = true AND stock_available = true AND region_id IS NOT NULL
        )
      ORDER BY ec.name ASC
    `)

    const countries = result.rows.map((row) => ({
      isoCode: row.iso_code,
      name: row.country_name || null,
    }))

    return NextResponse.json({ success: true, data: countries })
  } catch (error: any) {
    console.error('Error fetching plan countries:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch countries' },
      { status: 500 }
    )
  }
}
