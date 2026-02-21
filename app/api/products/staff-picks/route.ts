import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 50)

  try {
    const result = await executeQuery(`
      SELECT
        p.id, p.name, p.slug, p.description, p.price, p."comparePrice" as compare_price,
        p."isFeatured" as is_featured, p."createdAt" as created_at,
        c.name as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as review_count,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary") ORDER BY pi."isPrimary" DESC, pi."order")
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN reviews r ON r."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p.is_staff_pick = true
      GROUP BY p.id, c.name
      ORDER BY p."createdAt" DESC
      LIMIT ${limit}
    `)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Staff picks error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load staff picks' }, { status: 500 })
  }
}
