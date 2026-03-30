export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    const result = await executeQuery(`
      SELECT id, name, slug, price, image, type FROM (
        SELECT p.id, p.name, p.slug, p.price::float,
          (SELECT pi.url FROM product_images pi WHERE pi."productId" = p.id ORDER BY pi."isPrimary" DESC, pi."order" ASC LIMIT 1) as image,
          'script' as type,
          p."isFeatured" as is_featured,
          COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi."productId" = p.id), 0) as sales,
          p."createdAt" as created_at
        FROM products p
        WHERE p.status = 'ACTIVE' AND p.price > 0

        UNION ALL

        SELECT g.id::text, g.brand as name, g.slug, 0::float as price,
          g.image_url as image,
          'gift-card' as type,
          g.is_featured as is_featured,
          0::bigint as sales,
          g.created_at
        FROM gift_cards g
        WHERE g.is_active = true

        UNION ALL

        SELECT e.id::text, e.name, e.slug, e.retail_price::float as price,
          NULL as image,
          'esim' as type,
          e.is_featured as is_featured,
          0::bigint as sales,
          e.created_at
        FROM esim_plans e
        WHERE e.is_active = true

        UNION ALL

        SELECT v.id::text, v.name, v.iso_code as slug, v.retail_monthly::float as price,
          NULL as image,
          'virtual-number' as type,
          false as is_featured,
          0::bigint as sales,
          v.created_at
        FROM virtual_number_countries v
        WHERE v.is_active = true
      ) trending
      ORDER BY is_featured DESC, sales DESC, created_at DESC
      LIMIT $1
    `, [limit])

    const data = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      image: row.image || null,
      type: row.type,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Trending search error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load trending' }, { status: 500 })
  }
}
