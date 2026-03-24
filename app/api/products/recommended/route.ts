import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

interface RecommendedItem {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  is_featured: boolean
  category_name: string
  average_rating: number
  review_count: number
  images: { url: string; isPrimary: boolean }[] | null
  href: string
}

async function getFeaturedScripts(): Promise<RecommendedItem[]> {
  try {
    const result = await executeQuery(`
      SELECT p.id::text, p.name, p.slug, p.description, p.price::float,
        p."isFeatured" as is_featured, 'Scripts' as category_name,
        COALESCE(AVG(r.rating), 0)::float as average_rating,
        COUNT(DISTINCT r.id)::int as review_count,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary")
            ORDER BY pi."isPrimary" DESC, pi."order")
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM products p
      LEFT JOIN reviews r ON r."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p."isFeatured" = true
      GROUP BY p.id
      ORDER BY average_rating DESC
      LIMIT 4
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/products/${r.slug}` }))
  } catch { return [] }
}

async function getFeaturedGiftCards(): Promise<RecommendedItem[]> {
  try {
    const result = await executeQuery(`
      SELECT gc.id::text, gc.brand as name, gc.slug, gc.description,
        (gc.denominations->0)::float as price, gc.is_featured,
        'Gift Cards' as category_name, 0::float as average_rating, 0 as review_count,
        CASE WHEN gc.image_url IS NOT NULL
          THEN json_build_array(json_build_object('url', gc.image_url, 'isPrimary', true))
          ELSE null END as images
      FROM gift_cards gc
      WHERE gc.is_active = true AND gc.is_featured = true
      LIMIT 4
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/gift-cards?card=${r.slug}` }))
  } catch { return [] }
}

async function getFeaturedEsims(): Promise<RecommendedItem[]> {
  try {
    const result = await executeQuery(`
      SELECT ep.id::text, ep.name, ep.slug, ep.description,
        ep.retail_price::float as price, ep.is_featured,
        'eSIM' as category_name, 0::float as average_rating, 0 as review_count,
        CASE WHEN array_length(ep.countries, 1) > 0
          THEN json_build_array(json_build_object(
            'url', 'https://flagcdn.com/w160/' || lower(ep.countries[1]) || '.png',
            'isPrimary', true
          ))
          ELSE null END as images
      FROM esim_plans ep
      WHERE ep.is_active = true AND ep.is_featured = true
      LIMIT 4
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/esim?plan=${r.id}` }))
  } catch { return [] }
}

async function getFeaturedVirtualNumbers(): Promise<RecommendedItem[]> {
  try {
    const result = await executeQuery(`
      SELECT vnp.id::text, vnp.name, vnp.slug, null as description,
        vnp.base_price::float as price, vnp.is_featured,
        'Virtual Numbers' as category_name, 0::float as average_rating, 0 as review_count,
        null as images
      FROM virtual_number_plans vnp
      WHERE vnp.is_active = true AND vnp.is_featured = true
      LIMIT 4
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/virtual-numbers` }))
  } catch { return [] }
}

async function getFeaturedCards(): Promise<RecommendedItem[]> {
  try {
    const result = await executeQuery(`
      SELECT cp.id::text, cp.display_name as name, cp.provider as slug, null as description,
        cp.min_denomination::float as price, cp.is_featured,
        'Cards' as category_name, 0::float as average_rating, 0 as review_count,
        null as images
      FROM card_pricing cp
      WHERE cp.is_enabled = true AND cp.is_featured = true
      LIMIT 4
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/cards` }))
  } catch { return [] }
}

async function getFeaturedPhoneRefills(): Promise<RecommendedItem[]> {
  try {
    const result = await executeQuery(`
      SELECT id::text, operator_name as name, operator_name as slug, null as description,
        0::float as price, true as is_featured,
        'Phone Refills' as category_name, 0::float as average_rating, 0 as review_count,
        CASE WHEN image_url IS NOT NULL
          THEN json_build_array(json_build_object('url', image_url, 'isPrimary', true))
          ELSE json_build_array(json_build_object(
            'url', 'https://flagcdn.com/w160/' || lower(country_code) || '.png',
            'isPrimary', true
          )) END as images
      FROM featured_phone_refill_operators
      WHERE is_recommended = true
      LIMIT 4
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/phone-refills` }))
  } catch { return [] }
}

async function getFallbackScripts(exclude: string[]): Promise<RecommendedItem[]> {
  try {
    const result = await executeQuery(`
      SELECT p.id::text, p.name, p.slug, p.description, p.price::float,
        p."isFeatured" as is_featured, 'Scripts' as category_name,
        COALESCE(AVG(r.rating), 0)::float as average_rating,
        COUNT(DISTINCT r.id)::int as review_count,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary")
            ORDER BY pi."isPrimary" DESC, pi."order")
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM products p
      LEFT JOIN reviews r ON r."productId" = p.id
      WHERE p.status = 'ACTIVE'
        AND p.id::text != ALL($1)
      GROUP BY p.id
      ORDER BY average_rating DESC, p."createdAt" DESC
      LIMIT 4
    `, [exclude])
    return result.rows.map((r: any) => ({ ...r, href: `/products/${r.slug}` }))
  } catch { return [] }
}

export async function GET() {
  try {
    const [scripts, giftCards, esims, virtualNumbers, cards, phoneRefills] = await Promise.all([
      getFeaturedScripts(),
      getFeaturedGiftCards(),
      getFeaturedEsims(),
      getFeaturedVirtualNumbers(),
      getFeaturedCards(),
      getFeaturedPhoneRefills(),
    ])

    let data: RecommendedItem[] = [...scripts, ...giftCards, ...esims, ...virtualNumbers, ...cards, ...phoneRefills]

    // Fill remaining slots with top-rated Scripts so panel is never empty
    if (data.length < 4) {
      const existingIds = data.map((d) => d.id)
      const fallback = await getFallbackScripts(existingIds)
      data = [...data, ...fallback].slice(0, 4)
    } else {
      data = data.slice(0, 4)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Recommended products error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 })
  }
}
