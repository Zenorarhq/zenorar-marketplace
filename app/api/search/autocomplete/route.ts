export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// Only show verified categories in search results
const VERIFIED_CATEGORY_SLUGS = ['gift-cards', 'cards', 'esim', 'virtual-numbers', 'scripts']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') || '5')))

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { products: [], categories: [], suggestions: [] },
      })
    }

    const pattern = `%${query}%`

    // Matching products
    const productsSql = `
      SELECT p.id, p.name, p.slug, p.price,
        (SELECT pi.url FROM product_images pi WHERE pi."productId" = p.id ORDER BY pi."isPrimary" DESC, pi."order" ASC LIMIT 1) as image
      FROM products p
      WHERE p.status = 'ACTIVE' AND (p.name ILIKE $1 OR p.description ILIKE $1)
      ORDER BY p."isFeatured" DESC, p.name ASC
      LIMIT $2
    `

    // Matching categories (only verified categories)
    const categoriesSql = `
      SELECT c.id, c.name, c.slug,
        (SELECT COUNT(*) FROM products p WHERE p."categoryId" = c.id AND p.status = 'ACTIVE') as "productCount"
      FROM categories c
      WHERE c.name ILIKE $1 AND c.slug = ANY($3)
      ORDER BY c.name ASC
      LIMIT $2
    `

    // Suggestions (distinct product names that match)
    const suggestionsSql = `
      SELECT DISTINCT p.name
      FROM products p
      WHERE p.status = 'ACTIVE' AND p.name ILIKE $1
      ORDER BY p.name ASC
      LIMIT $2
    `

    const [productsResult, categoriesResult, suggestionsResult] = await Promise.all([
      executeQuery(productsSql, [pattern, limit]),
      executeQuery(categoriesSql, [pattern, limit, VERIFIED_CATEGORY_SLUGS]),
      executeQuery(suggestionsSql, [pattern, limit]),
    ])

    const products = productsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      image: row.image || null,
    }))

    const categories = categoriesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      productCount: Number(row.productCount) || 0,
    }))

    const suggestions = suggestionsResult.rows.map(row => row.name)

    return NextResponse.json({
      success: true,
      data: { products, categories, suggestions },
    })
  } catch (error) {
    console.error('Autocomplete error:', error)
    return NextResponse.json({ success: false, error: 'Autocomplete failed' }, { status: 500 })
  }
}
