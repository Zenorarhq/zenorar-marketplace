import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

interface StaffPickItem {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  compare_price: number | null
  is_featured: boolean
  created_at: string | null
  category_name: string
  average_rating: number
  review_count: number
  images: { url: string; isPrimary: boolean }[] | null
  href: string
}

async function getStaffPickScripts(): Promise<StaffPickItem[]> {
  try {
    const result = await executeQuery(`
      SELECT p.id::text, p.name, p.slug, p.description, p.price::float,
        p."comparePrice"::float as compare_price,
        p."isFeatured" as is_featured, p."createdAt"::text as created_at,
        'Scripts' as category_name,
        COALESCE(AVG(r.rating), 0)::float as average_rating,
        COUNT(DISTINCT r.id)::int as review_count,
        (
          SELECT json_agg(json_build_object('url', pi.url, 'isPrimary', pi."isPrimary")
            ORDER BY pi."isPrimary" DESC, pi."order")
          FROM product_images pi WHERE pi."productId" = p.id
        ) as images
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN reviews r ON r."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p."isStaffPick" = true AND c.slug = 'scripts'
      GROUP BY p.id
      ORDER BY p."createdAt" DESC
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/scripts/${r.slug}` }))
  } catch { return [] }
}

async function getStaffPickGiftCards(): Promise<StaffPickItem[]> {
  try {
    const result = await executeQuery(`
      SELECT gc.id::text, gc.brand as name, gc.slug, gc.description,
        (gc.denominations->0)::float as price, null as compare_price,
        gc.is_featured, gc.created_at::text,
        'Gift Cards' as category_name, 0::float as average_rating, 0 as review_count,
        CASE WHEN gc.image_url IS NOT NULL
          THEN json_build_array(json_build_object('url', gc.image_url, 'isPrimary', true))
          ELSE null END as images
      FROM gift_cards gc
      WHERE gc.is_active = true AND gc.is_staff_pick = true
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/gift-cards?card=${r.slug}` }))
  } catch { return [] }
}

async function getStaffPickEsims(): Promise<StaffPickItem[]> {
  try {
    const result = await executeQuery(`
      SELECT ep.id::text, ep.name, ep.slug, ep.description,
        ep.retail_price::float as price, null as compare_price,
        ep.is_featured, ep.created_at::text,
        'eSIM' as category_name, 0::float as average_rating, 0 as review_count,
        CASE WHEN array_length(ep.countries, 1) > 0
          THEN json_build_array(json_build_object(
            'url', 'https://flagcdn.com/w160/' || lower(ep.countries[1]) || '.png',
            'isPrimary', true
          ))
          ELSE null END as images
      FROM esim_plans ep
      WHERE ep.is_active = true AND ep.is_staff_pick = true
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/esim?plan=${r.id}` }))
  } catch { return [] }
}

async function getStaffPickVirtualNumbers(): Promise<StaffPickItem[]> {
  try {
    const result = await executeQuery(`
      SELECT uvn.id::text, uvn.phone_number as name, uvn.phone_number as slug, null as description,
        vnp.base_price::float as price, null as compare_price,
        uvn.is_featured, uvn.created_at::text,
        'Virtual Numbers' as category_name, 0::float as average_rating, 0 as review_count,
        CASE WHEN vnc.iso_code IS NOT NULL
          THEN json_build_array(json_build_object(
            'url', 'https://flagcdn.com/w160/' || lower(vnc.iso_code) || '.png',
            'isPrimary', true
          ))
          ELSE null END as images
      FROM user_virtual_numbers uvn
      LEFT JOIN virtual_number_countries vnc ON uvn.country_id = vnc.id
      LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id::text
      WHERE uvn.is_staff_pick = true AND uvn.status = 'active'
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/virtual-numbers` }))
  } catch { return [] }
}

async function getStaffPickCards(): Promise<StaffPickItem[]> {
  try {
    const result = await executeQuery(`
      SELECT cp.id::text, cp.display_name as name, cp.provider as slug, null as description,
        cp.min_denomination::float as price, null as compare_price,
        cp.is_featured, null as created_at,
        'Cards' as category_name, 0::float as average_rating, 0 as review_count,
        null as images
      FROM card_pricing cp
      WHERE cp.is_enabled = true AND cp.is_staff_pick = true
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/cards` }))
  } catch { return [] }
}

async function getStaffPickPhoneRefills(): Promise<StaffPickItem[]> {
  try {
    const result = await executeQuery(`
      SELECT id::text, operator_name as name, operator_name as slug, null as description,
        0::float as price, null as compare_price,
        true as is_featured, created_at::text,
        'Phone Refills' as category_name, 0::float as average_rating, 0 as review_count,
        CASE WHEN image_url IS NOT NULL
          THEN json_build_array(json_build_object('url', image_url, 'isPrimary', true))
          ELSE json_build_array(json_build_object(
            'url', 'https://flagcdn.com/w160/' || lower(country_code) || '.png',
            'isPrimary', true
          )) END as images
      FROM featured_phone_refill_operators
      WHERE is_staff_pick = true
    `)
    return result.rows.map((r: any) => ({ ...r, href: `/phone-refills` }))
  } catch { return [] }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 50)

  try {
    const [scripts, giftCards, esims, virtualNumbers, cards, phoneRefills] = await Promise.all([
      getStaffPickScripts(),
      getStaffPickGiftCards(),
      getStaffPickEsims(),
      getStaffPickVirtualNumbers(),
      getStaffPickCards(),
      getStaffPickPhoneRefills(),
    ])

    const data = [...scripts, ...giftCards, ...esims, ...virtualNumbers, ...cards, ...phoneRefills]
      .slice(0, limit)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Staff picks error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load staff picks' }, { status: 500 })
  }
}
