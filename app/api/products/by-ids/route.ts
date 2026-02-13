import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function POST(request: Request) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Limit to 50 IDs max
    const limitedIds = ids.slice(0, 50)

    // Build parameterized query for the IDs
    const placeholders = limitedIds.map((_, i) => `$${i + 1}`).join(', ')

    const result = await executeQuery(`
      SELECT
        p.id, p.name, p.slug, p.description, p.price, p."isFeatured" as is_featured,
        c.name as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as review_count,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary") ORDER BY pi."isPrimary" DESC)
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN reviews r ON r."productId" = p.id
      WHERE p.id IN (${placeholders})
      GROUP BY p.id, c.name
    `, limitedIds)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Products by IDs error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 })
  }
}
