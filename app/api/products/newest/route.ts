import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

interface NewestItem {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  is_featured: boolean
  created_at: string | null
  category_name: string
  average_rating: number
  review_count: number
  images: { url: string; isPrimary: boolean }[] | null
  href: string
}

async function getNewestScripts(limit = 2): Promise<NewestItem[]> {
  try {
    const result = await executeQuery(`
      SELECT p.id, p.name, p.slug, p.description, p.price::float,
        p."isFeatured" as is_featured, p."createdAt"::text as created_at,
        'Scripts' as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id)::int as review_count,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary")
            ORDER BY pi."isPrimary" DESC, pi."order")
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN reviews r ON r."productId" = p.id
      WHERE p.status = 'ACTIVE' AND c.slug = 'scripts' AND p.price > 0
      GROUP BY p.id
      ORDER BY p."createdAt" DESC
      LIMIT ${limit}
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/scripts/${r.slug}` }))
  } catch { return [] }
}

async function getNewestEsims(limit = 2): Promise<NewestItem[]> {
  try {
    const result = await executeQuery(`
      SELECT ep.id::text, ep.name, ep.slug, ep.description,
        ep.retail_price::float as price, false as is_featured, ep.created_at::text,
        'eSIM' as category_name, 0 as average_rating, 0 as review_count,
        CASE WHEN array_length(ep.countries, 1) > 0
          THEN json_build_array(json_build_object(
            'url', 'https://flagcdn.com/w160/' || lower(ep.countries[1]) || '.png',
            'isPrimary', true
          ))
          ELSE null END as images
      FROM esim_plans ep
      WHERE ep.is_active = true
      ORDER BY ep.created_at DESC
      LIMIT ${limit}
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/esim?plan=${r.id}` }))
  } catch { return [] }
}

async function getNewestGiftCards(limit = 2): Promise<NewestItem[]> {
  try {
    const result = await executeQuery(`
      SELECT gc.id::text, gc.brand as name, gc.slug, gc.description,
        (gc.denominations->0)::float as price,
        gc.is_featured, gc.created_at::text,
        'Gift Cards' as category_name, 0 as average_rating, 0 as review_count,
        CASE WHEN gc.image_url IS NOT NULL
          THEN json_build_array(json_build_object('url', gc.image_url, 'isPrimary', true))
          ELSE null END as images
      FROM gift_cards gc
      WHERE gc.is_active = true
      ORDER BY gc.created_at DESC
      LIMIT ${limit}
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/gift-cards?card=${r.slug}` }))
  } catch { return [] }
}

async function getNewestVirtualNumbers(limit = 2): Promise<NewestItem[]> {
  try {
    const result = await executeQuery(`
      SELECT vnc.id::text, vnc.name || ' Virtual Number' as name,
        vnc.iso_code as slug, null as description,
        vnc.retail_monthly::float as price, false as is_featured, vnc.created_at::text,
        'Virtual Numbers' as category_name, 0 as average_rating, 0 as review_count,
        json_build_array(json_build_object(
          'url', 'https://flagcdn.com/w160/' || lower(vnc.iso_code) || '.png',
          'isPrimary', true
        )) as images
      FROM virtual_number_countries vnc
      WHERE vnc.is_active = true
      ORDER BY vnc.created_at DESC
      LIMIT ${limit}
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/virtual-numbers?country=${r.id}` }))
  } catch { return [] }
}

async function getNewestCards(): Promise<NewestItem[]> {
  try {
    return [
      { id: 'instant-mastercard', name: 'Mastercard Instant Card', slug: 'instant-mastercard', description: null, price: 0, is_featured: false, created_at: null, category_name: 'Cards', average_rating: 0, review_count: 0, images: null, href: '/cards?tab=instant' },
      { id: 'virtual-visa', name: 'Visa Virtual Card', slug: 'virtual-visa', description: null, price: 0, is_featured: false, created_at: null, category_name: 'Cards', average_rating: 0, review_count: 0, images: null, href: '/cards?tab=virtual' },
    ]
  } catch { return [] }
}

async function getNewestPhoneRefills(limit = 2): Promise<NewestItem[]> {
  try {
    const result = await executeQuery(`
      SELECT
        md5(metadata->>'offerId') as id,
        metadata->>'operatorName' as name,
        metadata->>'offerId' as slug,
        null as description,
        AVG(price::float) as price,
        false as is_featured, MAX(created_at)::text as created_at,
        'Phone Refills' as category_name, 0 as average_rating, 0 as review_count, null as images
      FROM order_items
      WHERE product_type = 'phone_refill'
        AND metadata->>'operatorName' IS NOT NULL
      GROUP BY metadata->>'offerId', metadata->>'operatorName'
      ORDER BY MAX(created_at) DESC
      LIMIT ${limit}
    `)
    return result.rows.map((r: any) => ({
      ...r,
      href: `/phone-refills?search=${encodeURIComponent(r.name)}`,
    }))
  } catch { return [] }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const perCategory = Math.min(parseInt(searchParams.get('limit') || '2') || 2, 20)
  try {
    const [scripts, esims, giftCards, virtualNumbers, cards, phoneRefills] = await Promise.all([
      getNewestScripts(perCategory),
      getNewestEsims(perCategory),
      getNewestGiftCards(perCategory),
      getNewestVirtualNumbers(perCategory),
      getNewestCards(),
      getNewestPhoneRefills(perCategory),
    ])

    const data = [...scripts, ...giftCards, ...esims, ...virtualNumbers, ...cards, ...phoneRefills]

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Newest products error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 })
  }
}
