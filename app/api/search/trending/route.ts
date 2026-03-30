export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    // Balanced slots: 2 scripts, 1 gift card, 1 eSIM, 1 virtual number
    const [scripts, giftCards, esims, virtualNumbers] = await Promise.all([
      executeQuery(`
        SELECT p.id, p.name, p.slug, p.price::float,
          (SELECT pi.url FROM product_images pi WHERE pi."productId" = p.id ORDER BY pi."isPrimary" DESC, pi."order" ASC LIMIT 1) as image
        FROM products p
        LEFT JOIN order_items oi ON oi."productId" = p.id
        WHERE p.status = 'ACTIVE' AND p.price > 0
        GROUP BY p.id, p.name, p.slug, p.price, p."isFeatured", p."createdAt"
        ORDER BY p."isFeatured" DESC, COALESCE(SUM(oi.quantity), 0) DESC, p."createdAt" DESC
        LIMIT 2
      `),
      executeQuery(`
        SELECT g.id::text as id, g.brand as name, g.slug, 0::float as price, g.image_url as image
        FROM gift_cards g
        WHERE g.is_active = true
        ORDER BY g.is_featured DESC, g.created_at DESC
        LIMIT 1
      `),
      executeQuery(`
        SELECT e.id::text as id, e.name, e.slug, e.retail_price::float as price, NULL as image
        FROM esim_plans e
        WHERE e.is_active = true
        ORDER BY e.is_featured DESC, e.retail_price ASC
        LIMIT 1
      `),
      executeQuery(`
        SELECT v.id::text as id, v.name, v.iso_code as slug, v.retail_monthly::float as price, NULL as image
        FROM virtual_number_countries v
        WHERE v.is_active = true
        ORDER BY v.display_order ASC, v.name ASC
        LIMIT 1
      `),
    ])

    const data = [
      ...scripts.rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, price: Number(r.price), image: r.image || null, type: 'script' as const })),
      ...giftCards.rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, price: Number(r.price), image: r.image || null, type: 'gift-card' as const })),
      ...esims.rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, price: Number(r.price), image: r.image || null, type: 'esim' as const })),
      ...virtualNumbers.rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, price: Number(r.price), image: r.image || null, type: 'virtual-number' as const })),
    ].slice(0, limit)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Trending search error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load trending' }, { status: 500 })
  }
}
