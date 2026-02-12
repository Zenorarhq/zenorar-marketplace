import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || searchParams.get('q') || ''
    const categoriesParam = searchParams.get('categories') || ''
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')
    const sortBy = searchParams.get('sortBy') || 'relevance'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')))
    const offset = (page - 1) * limit

    const conditions: string[] = ['p.status = \'ACTIVE\'']
    const values: any[] = []
    let paramIndex = 1

    // Text search
    if (query) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`)
      values.push(`%${query}%`)
      paramIndex++
    }

    // Category filter (by slug)
    if (categoriesParam) {
      const categorySlugs = categoriesParam.split(',').map(s => s.trim()).filter(Boolean)
      if (categorySlugs.length > 0) {
        conditions.push(`c.slug = ANY($${paramIndex})`)
        values.push(categorySlugs)
        paramIndex++
      }
    }

    // Max price filter
    if (maxPrice) {
      conditions.push(`p.price <= $${paramIndex}`)
      values.push(Number(maxPrice))
      paramIndex++
    }

    // Min rating filter
    if (minRating && Number(minRating) > 0) {
      conditions.push(`COALESCE(avg_r.avg_rating, 0) >= $${paramIndex}`)
      values.push(Number(minRating))
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Sort
    let orderClause = 'ORDER BY p."createdAt" DESC'
    if (sortBy === 'newest') orderClause = 'ORDER BY p."createdAt" DESC'
    else if (sortBy === 'price_asc') orderClause = 'ORDER BY p.price ASC'
    else if (sortBy === 'price_desc') orderClause = 'ORDER BY p.price DESC'
    else if (sortBy === 'relevance' || sortBy === 'popular') orderClause = 'ORDER BY p."isFeatured" DESC, COALESCE(avg_r.review_count, 0) DESC, p."createdAt" DESC'

    const sql = `
      SELECT
        p.id, p.name, p.slug, p.description, p.price,
        p."compareAtPrice" as "comparePrice",
        p."isFeatured" as "isFeatured",
        c.id as category_id, c.name as category_name, c.slug as category_slug,
        COALESCE(avg_r.avg_rating, 0) as average_rating,
        COALESCE(avg_r.review_count, 0) as review_count,
        (
          SELECT pi.url FROM product_images pi
          WHERE pi."productId" = p.id
          ORDER BY pi."isPrimary" DESC, pi."order" ASC
          LIMIT 1
        ) as image
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN (
        SELECT "productId", AVG(rating) as avg_rating, COUNT(*) as review_count
        FROM reviews
        GROUP BY "productId"
      ) avg_r ON avg_r."productId" = p.id
      ${whereClause}
      ${orderClause}
      LIMIT ${limit} OFFSET ${offset}
    `

    const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN (
        SELECT "productId", AVG(rating) as avg_rating, COUNT(*) as review_count
        FROM reviews
        GROUP BY "productId"
      ) avg_r ON avg_r."productId" = p.id
      ${whereClause}
    `

    const [result, countResult] = await Promise.all([
      executeQuery(sql, values),
      executeQuery(countSql, values),
    ])

    const total = parseInt(countResult.rows[0]?.total || '0')

    const data = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: Number(row.price),
      comparePrice: row.comparePrice ? Number(row.comparePrice) : null,
      image: row.image || null,
      category: row.category_id ? { id: row.category_id, name: row.category_name, slug: row.category_slug } : null,
      reviewCount: Number(row.review_count) || 0,
      inStock: true,
      isFeatured: row.isFeatured || false,
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Search products error:', error)
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
  }
}
