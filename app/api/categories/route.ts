import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import { authenticateRequest } from '@/lib/auth-middleware'

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

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, description, image, icon, parentId } = body

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 })
    }

    const result = await executeQuery(`
      INSERT INTO categories (id, name, slug, description, image, icon, "parentId", "isActive", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      RETURNING *
    `, [name.trim(), slug.trim(), description || null, image || null, icon || 'code', parentId || null])

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'A category with this slug already exists' }, { status: 409 })
    }
    console.error('Category create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 })
  }
}
