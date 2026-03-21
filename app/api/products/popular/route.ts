import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET() {
  try {
    // Get popular products: admin-featured first, then most purchased
    const result = await executeQuery(`
      WITH product_stats AS (
        SELECT
          p.id, p.name, p.slug, p.description, p.price,
          p."isFeatured" as is_featured, p."createdAt" as created_at,
          p."categoryId",
          c.name as category_name,
          COALESCE(AVG(r.rating), 0) as average_rating,
          COUNT(DISTINCT r.id) as review_count,
          COALESCE(SUM(oi.quantity), 0) as total_purchased,
          (
            SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary") ORDER BY pi."isPrimary" DESC, pi."order")
            FROM product_images pi WHERE pi."productId" = p.id
          ) as images
        FROM products p
        LEFT JOIN categories c ON p."categoryId" = c.id
        LEFT JOIN reviews r ON r."productId" = p.id
        LEFT JOIN order_items oi ON oi."productId" = p.id
        WHERE p.status = 'ACTIVE'
        GROUP BY p.id, p."categoryId", c.name
      ),
      ranked AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY "categoryId"
            ORDER BY total_purchased DESC, average_rating DESC, created_at DESC
          ) as rn
        FROM product_stats
      )
      SELECT id, name, slug, description, price, is_featured, created_at,
             category_name, average_rating, review_count, total_purchased, images
      FROM ranked
      WHERE rn <= 2
      ORDER BY total_purchased DESC, rn ASC
      LIMIT 12
    `)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Popular products error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 })
  }
}
