import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET() {
  try {
    const result = await executeQuery(`
      SELECT c.id, c.name, c.slug,
        (SELECT COUNT(*) FROM products p WHERE p."categoryId" = c.id AND p.status = 'ACTIVE') as "productCount"
      FROM categories c
      ORDER BY c.name ASC
    `)

    const data = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      productCount: Number(row.productCount) || 0,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Categories list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load categories' }, { status: 500 })
  }
}
