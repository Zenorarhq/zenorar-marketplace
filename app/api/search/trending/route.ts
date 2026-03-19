export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    const result = await executeQuery(`
      SELECT p.id, p.name, p.slug, p.price,
        (SELECT pi.url FROM product_images pi WHERE pi."productId" = p.id ORDER BY pi."isPrimary" DESC, pi."order" ASC LIMIT 1) as image
      FROM products p
      LEFT JOIN order_items oi ON oi."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p.price > 0
      GROUP BY p.id, p.name, p.slug, p.price, p."isFeatured", p."createdAt"
      ORDER BY p."isFeatured" DESC, COALESCE(SUM(oi.quantity), 0) DESC, p."createdAt" DESC
      LIMIT $1
    `, [limit])

    const data = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      image: row.image || null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Trending search error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load trending' }, { status: 500 })
  }
}
