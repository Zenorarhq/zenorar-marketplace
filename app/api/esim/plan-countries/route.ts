export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(`
      WITH plan_countries AS (
        SELECT DISTINCT unnest(countries) AS iso_code
        FROM esim_plans
        WHERE is_active = true AND stock_available = true
      )
      SELECT pc.iso_code, ec.name AS country_name
      FROM plan_countries pc
      LEFT JOIN esim_countries ec ON pc.iso_code = ec.iso_code
      ORDER BY ec.name ASC NULLS LAST
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
