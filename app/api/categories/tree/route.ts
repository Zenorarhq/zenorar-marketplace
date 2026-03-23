import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const COUNT_OVERRIDES: Record<string, string> = {
  'esim': `SELECT COUNT(*)::int as count FROM esim_plans WHERE is_active = true`,
  'gift-cards': `SELECT COUNT(*)::int as count FROM gift_cards WHERE is_active = true`,
  'virtual-numbers': `SELECT COUNT(*)::int as count FROM virtual_number_plans WHERE is_active = true`,
  'cards': `SELECT COUNT(*)::int as count FROM card_pricing WHERE is_enabled = true`,
  'phone-refills': `SELECT COUNT(DISTINCT metadata->>'operatorName')::int as count FROM order_items WHERE product_type = 'phone_refill'`,
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Fetch all categories
    const result = await query(`
      SELECT id, name, slug, description, image, icon,
        "parentId", "order", "isActive", "createdAt", "updatedAt",
        (SELECT COUNT(*)::int FROM products p WHERE p."categoryId" = c.id AND p.status = 'ACTIVE') as "productCount"
      FROM categories c
      ORDER BY "order" ASC NULLS LAST, name ASC
    `)

    const rows: any[] = result.rows

    // Apply count overrides for categories with dedicated tables
    const enriched = await Promise.all(rows.map(async (row) => {
      const overrideQuery = COUNT_OVERRIDES[row.slug]
      let productCount = Number(row.productCount) || 0
      if (overrideQuery) {
        try {
          const countResult = await query(overrideQuery)
          productCount = Number(countResult.rows[0]?.count) || 0
        } catch { /* keep default */ }
      }
      return { ...row, productCount, _count: { products: productCount }, children: [] as any[] }
    }))

    // Build tree: parents first, then attach children
    const byId: Record<string, any> = {}
    for (const cat of enriched) byId[cat.id] = cat

    const roots: any[] = []
    for (const cat of enriched) {
      if (cat.parentId && byId[cat.parentId]) {
        byId[cat.parentId].children.push(cat)
      } else {
        roots.push(cat)
      }
    }

    return NextResponse.json({ success: true, data: roots })
  } catch (error) {
    console.error('Categories tree error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load categories' }, { status: 500 })
  }
}
