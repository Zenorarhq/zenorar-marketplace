import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type === 'connectivity') {
      // Return subcategories under eSIM and Virtual Numbers
      const result = await executeQuery(`
        SELECT c.id, c.name, c.slug, c.icon,
          p.slug as "parentSlug"
        FROM categories c
        JOIN categories p ON c."parentId" = p.id
        WHERE p.slug IN ('esim', 'virtual-numbers')
          AND c."isActive" = true
        ORDER BY p."order" ASC, c."order" ASC
      `)

      const data = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        icon: row.icon || 'globe',
        href: `/${row.parentSlug}`,
      }))

      return NextResponse.json({ success: true, data })
    }

    if (type === 'scripts') {
      // Return subcategories under the "Scripts" parent category
      const result = await executeQuery(`
        SELECT c.id, c.name, c.slug, c.icon
        FROM categories c
        JOIN categories p ON c."parentId" = p.id
        WHERE p.slug = 'scripts'
          AND c."isActive" = true
        ORDER BY c."order" ASC
      `)

      const data = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        icon: row.icon || 'code',
      }))

      return NextResponse.json({ success: true, data })
    }

    // Default: return all top-level categories with product counts
    const result = await executeQuery(`
      SELECT c.id, c.name, c.slug, c.icon,
        (SELECT COUNT(*) FROM products p WHERE p."categoryId" = c.id AND p.status = 'ACTIVE') as "productCount"
      FROM categories c
      WHERE c."parentId" IS NULL AND c."isActive" = true
      ORDER BY c."order" ASC, c.name ASC
    `)

    // Override product counts for categories that use dedicated tables instead of products
    const countOverrides: Record<string, string> = {
      'esim': 'SELECT COUNT(*)::int as count FROM esim_plans',
      'gift-cards': 'SELECT COUNT(*)::int as count FROM gift_cards',
      'virtual-numbers': 'SELECT COUNT(*)::int as count FROM virtual_number_plans',
      'cards': 'SELECT COUNT(*)::int as count FROM card_pricing WHERE is_enabled = true',
    }

    const data = await Promise.all(result.rows.map(async (row) => {
      let productCount = Number(row.productCount) || 0
      const overrideQuery = countOverrides[row.slug]
      if (overrideQuery) {
        try {
          const countResult = await executeQuery(overrideQuery)
          productCount = Number(countResult.rows[0]?.count) || 0
        } catch { /* fallback to 0 */ }
      }
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        icon: row.icon || 'code',
        productCount,
      }
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Categories list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load categories' }, { status: 500 })
  }
}
