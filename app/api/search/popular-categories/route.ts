export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

const VERIFIED_CATEGORY_SLUGS = ['gift-cards', 'cards', 'esim', 'virtual-numbers', 'scripts']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '6')))

    const result = await executeQuery(`
      SELECT c.id, c.name, c.slug,
        (SELECT COUNT(*) FROM products p WHERE p."categoryId" = c.id AND p.status = 'ACTIVE' AND p.price > 0) as "productCount"
      FROM categories c
      WHERE c.slug = ANY($1)
      ORDER BY "productCount" DESC, c.name ASC
      LIMIT $2
    `, [VERIFIED_CATEGORY_SLUGS, limit])

    const data = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      productCount: Number(row.productCount) || 0,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Popular categories error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load categories' }, { status: 500 })
  }
}
