import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(
      `
      SELECT
        id,
        name,
        slug,
        description,
        image_url,
        flag_emoji,
        country_count,
        is_featured,
        display_order
      FROM esim_regions
      WHERE is_active = true
      ORDER BY display_order ASC, name ASC
      `
    )

    const regions = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.image_url,
      flagEmoji: row.flag_emoji,
      countryCount: row.country_count,
      isFeatured: row.is_featured,
    }))

    return NextResponse.json({ success: true, data: regions })
  } catch (error: any) {
    console.error('Error fetching eSIM regions:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch regions' },
      { status: 500 }
    )
  }
}
