export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const regionSlug = searchParams.get('region')

    let sql = `
      SELECT
        c.id,
        c.name,
        c.iso_code,
        c.flag_emoji,
        c.dial_code,
        c.networks,
        r.slug as region_slug
      FROM esim_countries c
      LEFT JOIN esim_regions r ON c.region_id = r.id
      WHERE c.is_active = true
    `
    const params: string[] = []

    if (regionSlug) {
      sql += ` AND r.slug = $1`
      params.push(regionSlug)
    }

    sql += ` ORDER BY c.name ASC`

    const result = await query(sql, params)

    const countries = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      isoCode: row.iso_code,
      flagEmoji: row.flag_emoji,
      dialCode: row.dial_code,
      networks: row.networks || [],
      regionSlug: row.region_slug,
    }))

    return NextResponse.json({ success: true, data: countries })
  } catch (error: any) {
    console.error('Error fetching eSIM countries:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch countries' },
      { status: 500 }
    )
  }
}
