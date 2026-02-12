import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Fetch product by slug with category, images, and rating
    const productResult = await executeQuery(`
      SELECT
        p.id, p.name, p.slug, p.description, p.price, p."isFeatured" as is_featured,
        p."comparePrice" as compare_price,
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
      WHERE p.slug = $1 AND p.status = 'ACTIVE'
      GROUP BY p.id, c.name
    `, [slug])

    if (productResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const row = productResult.rows[0]

    // Fetch individual reviews for this product
    const reviewsResult = await executeQuery(`
      SELECT r.id, r.rating, r.content, r."createdAt",
             u.name as author_name
      FROM reviews r
      LEFT JOIN users u ON r."userId" = u.id
      WHERE r."productId" = $1
      ORDER BY r."createdAt" DESC
      LIMIT 20
    `, [row.id])

    const reviews = reviewsResult.rows.map((r: any) => ({
      id: r.id,
      author: r.author_name || 'Anonymous',
      rating: Number(r.rating),
      content: r.content || '',
      date: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '',
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        reviews,
      },
    })
  } catch (error) {
    console.error('Product by slug error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load product' }, { status: 500 })
  }
}
