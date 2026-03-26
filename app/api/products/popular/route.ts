import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

// Unified shape returned by every helper
interface PopularItem {
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
  total_purchased: number
  images: { url: string; isPrimary: boolean }[] | null
  href: string
  data_amount_display?: string
  validity_days?: number
}

async function getTopScripts(): Promise<PopularItem[]> {
  try {
    const result = await executeQuery(`
      SELECT p.id, p.name, p.slug, p.description, p.price::float,
        p."isFeatured" as is_featured, p."createdAt"::text as created_at,
        'Scripts' as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id)::int as review_count,
        COALESCE(SUM(oi.quantity), 0)::int as total_purchased,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary")
            ORDER BY pi."isPrimary" DESC, pi."order")
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN reviews r ON r."productId" = p.id
      LEFT JOIN order_items oi ON oi."productId" = p.id
      WHERE p.status = 'ACTIVE' AND c.slug = 'scripts' AND p.price > 0
      GROUP BY p.id
      ORDER BY total_purchased DESC, average_rating DESC
      LIMIT 2
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/scripts/${r.slug}` }))
  } catch { return [] }
}

async function getTopEsims(): Promise<PopularItem[]> {
  try {
    const result = await executeQuery(`
      SELECT ep.id::text, ep.name, ep.slug, ep.description,
        ep.retail_price::float as price, false as is_featured, ep.created_at::text,
        'eSIM' as category_name, 0 as average_rating, 0 as review_count,
        ep.data_amount_display, ep.validity_days::int,
        COUNT(ue.id)::int as total_purchased,
        CASE WHEN array_length(ep.countries, 1) > 0
          THEN json_build_array(json_build_object(
            'url', 'https://flagcdn.com/w160/' || lower(ep.countries[1]) || '.png',
            'isPrimary', true
          ))
          ELSE null END as images
      FROM esim_plans ep
      LEFT JOIN user_esims ue ON ue.plan_id = ep.id
      WHERE ep.is_active = true
      GROUP BY ep.id
      ORDER BY total_purchased DESC, ep.retail_price ASC
      LIMIT 2
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/esim?plan=${r.id}` }))
  } catch { return [] }
}

async function getTopGiftCards(): Promise<PopularItem[]> {
  try {
    const result = await executeQuery(`
      SELECT gc.id::text, gc.brand as name, gc.slug, gc.description,
        (gc.denominations->0)::float as price,
        gc.is_featured, gc.created_at::text,
        'Gift Cards' as category_name, 0 as average_rating, 0 as review_count,
        COUNT(ugc.id)::int as total_purchased,
        CASE WHEN gc.image_url IS NOT NULL
          THEN json_build_array(json_build_object('url', gc.image_url, 'isPrimary', true))
          ELSE null END as images
      FROM gift_cards gc
      LEFT JOIN user_gift_cards ugc ON ugc.gift_card_id = gc.id
      WHERE gc.is_active = true
      GROUP BY gc.id
      ORDER BY total_purchased DESC
      LIMIT 2
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/gift-cards?card=${r.slug}` }))
  } catch { return [] }
}

async function getTopVirtualNumbers(): Promise<PopularItem[]> {
  try {
    const result = await executeQuery(`
      SELECT vnc.id::text, vnc.name || ' Virtual Number' as name,
        vnc.iso_code as slug, null as description,
        vnc.retail_monthly::float as price, false as is_featured, vnc.created_at::text,
        'Virtual Numbers' as category_name, 0 as average_rating, 0 as review_count,
        COUNT(uvn.id)::int as total_purchased,
        json_build_array(json_build_object(
          'url', 'https://flagcdn.com/w160/' || lower(vnc.iso_code) || '.png',
          'isPrimary', true
        )) as images
      FROM virtual_number_countries vnc
      LEFT JOIN user_virtual_numbers uvn ON uvn.country_id = vnc.id
      WHERE vnc.is_active = true
      GROUP BY vnc.id
      ORDER BY total_purchased DESC, vnc.retail_monthly ASC
      LIMIT 2
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/virtual-numbers?country=${r.id}` }))
  } catch { return [] }
}

async function getTopCards(): Promise<PopularItem[]> {
  try {
    const result = await executeQuery(`
      (SELECT md5('instantmastercard') as id, 'Mastercard Instant Card' as name,
        'instant-mastercard' as slug, null as description,
        COALESCE(AVG(denomination), 0)::float as price, false as is_featured, null as created_at,
        'Cards' as category_name, 0 as average_rating, 0 as review_count,
        COUNT(*)::int as total_purchased, null as images
       FROM user_cards WHERE status = 'active' AND card_type = 'instant' AND card_brand = 'mastercard')
      UNION ALL
      (SELECT md5('virtualvisa') as id, 'Visa Virtual Card' as name,
        'virtual-visa' as slug, null as description,
        COALESCE(AVG(denomination), 0)::float as price, false as is_featured, null as created_at,
        'Cards' as category_name, 0 as average_rating, 0 as review_count,
        COUNT(*)::int as total_purchased, null as images
       FROM user_cards WHERE status = 'active' AND card_type = 'virtual' AND card_brand = 'visa')
    `)
    return result.rows.map((r: any) => {
      const tab = r.slug.startsWith('instant') ? 'instant' : 'virtual'
      return { ...r, href: `/cards?tab=${tab}` }
    })
  } catch { return [] }
}

async function getTopPhoneRefills(): Promise<PopularItem[]> {
  try {
    const result = await executeQuery(`
      SELECT
        md5(metadata->>'offerId') as id,
        metadata->>'operatorName' as name,
        metadata->>'offerId' as slug,
        null as description,
        AVG(price::float) as price,
        false as is_featured, null as created_at,
        'Phone Refills' as category_name, 0 as average_rating, 0 as review_count,
        COUNT(*)::int as total_purchased, null as images
      FROM order_items
      WHERE product_type = 'phone_refill'
        AND metadata->>'operatorName' IS NOT NULL
        AND LOWER(metadata->>'operatorName') NOT LIKE '%nigeria%'
        AND LOWER(metadata->>'operatorName') NOT LIKE '%nine mobile%'
        AND LOWER(metadata->>'operatorName') NOT LIKE '%9mobile%'
        AND LOWER(metadata->>'operatorName') NOT LIKE '%glo%'
      GROUP BY metadata->>'offerId', metadata->>'operatorName'
      ORDER BY total_purchased DESC
      LIMIT 2
    `)
    return result.rows.map((r: any) => ({
      ...r,
      href: `/phone-refills?search=${encodeURIComponent(r.name)}`,
    }))
  } catch { return [] }
}

export async function GET() {
  try {
    const [scripts, esims, giftCards, virtualNumbers, cards, phoneRefills] = await Promise.all([
      getTopScripts(),
      getTopEsims(),
      getTopGiftCards(),
      getTopVirtualNumbers(),
      getTopCards(),
      getTopPhoneRefills(),
    ])

    const data = [...scripts, ...giftCards, ...esims, ...virtualNumbers, ...cards, ...phoneRefills]

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Popular products error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 })
  }
}
