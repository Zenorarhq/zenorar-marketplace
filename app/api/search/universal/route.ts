export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

type CategoryFilter = 'all' | 'scripts' | 'esims' | 'gift_cards' | 'virtual_numbers' | 'carrier_esims'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const category = (searchParams.get('category') || 'all') as CategoryFilter
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')))
    const offset = (page - 1) * limit

    if (!query || query.length < 1) {
      return NextResponse.json({
        success: true,
        data: {
          results: {
            scripts: { items: [], total: 0 },
            esims: { items: [], total: 0 },
            gift_cards: { items: [], total: 0 },
            virtual_numbers: { items: [], total: 0 },
            carrier_esims: { items: [], total: 0 },
          },
          query: '',
          totalResults: 0,
        },
      })
    }

    const pattern = `%${query}%`

    // Build queries based on category filter
    const shouldQuery = (cat: CategoryFilter) => category === 'all' || category === cat

    // For "all" tab, show top 4 per category; for specific tab, use full pagination
    const perCategoryLimit = category === 'all' ? 4 : limit
    const perCategoryOffset = category === 'all' ? 0 : offset

    // Scripts / Products
    const scriptsPromise = shouldQuery('scripts') ? Promise.all([
      executeQuery(
        `SELECT p.id, p.name, p.slug, p.description, p.price,
          p."compareAtPrice" as "comparePrice", p."isFeatured",
          c.name as category_name, c.slug as category_slug,
          (SELECT pi.url FROM product_images pi WHERE pi."productId" = p.id ORDER BY pi."isPrimary" DESC, pi."order" ASC LIMIT 1) as image
        FROM products p
        LEFT JOIN categories c ON p."categoryId" = c.id
        WHERE p.status = 'ACTIVE' AND (p.name ILIKE $1 OR p.description ILIKE $1)
        ORDER BY p."isFeatured" DESC, p.name ASC
        LIMIT $2 OFFSET $3`,
        [pattern, perCategoryLimit, perCategoryOffset]
      ),
      executeQuery(
        `SELECT COUNT(*) as total FROM products p
        WHERE p.status = 'ACTIVE' AND (p.name ILIKE $1 OR p.description ILIKE $1)`,
        [pattern]
      ),
    ]) : Promise.resolve([{ rows: [] }, { rows: [{ total: '0' }] }])

    // eSIM Plans (data eSIMs)
    const esimsPromise = shouldQuery('esims') ? Promise.all([
      executeQuery(
        `SELECT id, name, slug, description, data_amount_gb, data_amount_display,
          validity_days, is_unlimited, network_type, retail_price, currency,
          coverage_type, countries
        FROM esim_plans
        WHERE is_active = true AND (name ILIKE $1 OR description ILIKE $1 OR data_amount_display ILIKE $1)
        ORDER BY is_featured DESC, retail_price ASC
        LIMIT $2 OFFSET $3`,
        [pattern, perCategoryLimit, perCategoryOffset]
      ),
      executeQuery(
        `SELECT COUNT(*) as total FROM esim_plans
        WHERE is_active = true AND (name ILIKE $1 OR description ILIKE $1 OR data_amount_display ILIKE $1)`,
        [pattern]
      ),
    ]) : Promise.resolve([{ rows: [] }, { rows: [{ total: '0' }] }])

    // Gift Cards
    const giftCardsPromise = shouldQuery('gift_cards') ? Promise.all([
      executeQuery(
        `SELECT id, brand, slug, category, description, image_url,
          denominations, discount_percent, min_custom_amount, max_custom_amount
        FROM gift_cards
        WHERE is_active = true AND (brand ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
        ORDER BY is_featured DESC, brand ASC
        LIMIT $2 OFFSET $3`,
        [pattern, perCategoryLimit, perCategoryOffset]
      ),
      executeQuery(
        `SELECT COUNT(*) as total FROM gift_cards
        WHERE is_active = true AND (brand ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)`,
        [pattern]
      ),
    ]) : Promise.resolve([{ rows: [] }, { rows: [{ total: '0' }] }])

    // Virtual Number Countries
    const virtualNumbersPromise = shouldQuery('virtual_numbers') ? Promise.all([
      executeQuery(
        `SELECT id, name, iso_code, dial_code, flag_emoji,
          sms_enabled, voice_enabled, retail_monthly
        FROM virtual_number_countries
        WHERE is_active = true AND (name ILIKE $1 OR iso_code ILIKE $1 OR dial_code ILIKE $1)
        ORDER BY display_order ASC, name ASC
        LIMIT $2 OFFSET $3`,
        [pattern, perCategoryLimit, perCategoryOffset]
      ),
      executeQuery(
        `SELECT COUNT(*) as total FROM virtual_number_countries
        WHERE is_active = true AND (name ILIKE $1 OR iso_code ILIKE $1 OR dial_code ILIKE $1)`,
        [pattern]
      ),
    ]) : Promise.resolve([{ rows: [] }, { rows: [{ total: '0' }] }])

    // Carrier eSIM Plans
    const carrierEsimsPromise = shouldQuery('carrier_esims') ? Promise.all([
      executeQuery(
        `SELECT id, carrier_name, carrier_slug, plan_name, description,
          country, data_amount_display, is_unlimited, voice_display, sms_display,
          network_type, retail_price, currency
        FROM carrier_esim_plans
        WHERE is_active = true AND (carrier_name ILIKE $1 OR plan_name ILIKE $1 OR description ILIKE $1)
        ORDER BY is_featured DESC, carrier_name ASC, retail_price ASC
        LIMIT $2 OFFSET $3`,
        [pattern, perCategoryLimit, perCategoryOffset]
      ),
      executeQuery(
        `SELECT COUNT(*) as total FROM carrier_esim_plans
        WHERE is_active = true AND (carrier_name ILIKE $1 OR plan_name ILIKE $1 OR description ILIKE $1)`,
        [pattern]
      ),
    ]) : Promise.resolve([{ rows: [] }, { rows: [{ total: '0' }] }])

    const [scriptsResult, esimsResult, giftCardsResult, virtualNumbersResult, carrierEsimsResult] =
      await Promise.all([scriptsPromise, esimsPromise, giftCardsPromise, virtualNumbersPromise, carrierEsimsPromise])

    const scripts = {
      items: scriptsResult[0].rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        price: Number(row.price),
        comparePrice: row.comparePrice ? Number(row.comparePrice) : null,
        image: row.image || null,
        category: row.category_name ? { name: row.category_name, slug: row.category_slug } : null,
        isFeatured: row.isFeatured || false,
      })),
      total: parseInt(scriptsResult[1].rows[0]?.total || '0'),
    }

    const esims = {
      items: esimsResult[0].rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        dataAmountGb: Number(row.data_amount_gb),
        dataAmountDisplay: row.data_amount_display,
        validityDays: row.validity_days,
        isUnlimited: row.is_unlimited,
        networkType: row.network_type,
        retailPrice: Number(row.retail_price),
        currency: row.currency,
        coverageType: row.coverage_type,
        countries: row.countries || [],
      })),
      total: parseInt(esimsResult[1].rows[0]?.total || '0'),
    }

    const giftCards = {
      items: giftCardsResult[0].rows.map((row: any) => ({
        id: row.id,
        brand: row.brand,
        slug: row.slug,
        category: row.category,
        description: row.description,
        imageUrl: row.image_url,
        denominations: row.denominations,
        discountPercent: row.discount_percent ? Number(row.discount_percent) : 0,
        minCustomAmount: row.min_custom_amount ? Number(row.min_custom_amount) : null,
        maxCustomAmount: row.max_custom_amount ? Number(row.max_custom_amount) : null,
      })),
      total: parseInt(giftCardsResult[1].rows[0]?.total || '0'),
    }

    const virtualNumbers = {
      items: virtualNumbersResult[0].rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        isoCode: row.iso_code,
        dialCode: row.dial_code,
        flagEmoji: row.flag_emoji,
        smsEnabled: row.sms_enabled,
        voiceEnabled: row.voice_enabled,
        retailMonthly: Number(row.retail_monthly),
      })),
      total: parseInt(virtualNumbersResult[1].rows[0]?.total || '0'),
    }

    const carrierEsims = {
      items: carrierEsimsResult[0].rows.map((row: any) => ({
        id: row.id,
        carrierName: row.carrier_name,
        carrierSlug: row.carrier_slug,
        planName: row.plan_name,
        description: row.description,
        country: row.country,
        dataAmountDisplay: row.data_amount_display,
        isUnlimited: row.is_unlimited,
        voiceDisplay: row.voice_display,
        smsDisplay: row.sms_display,
        networkType: row.network_type,
        retailPrice: Number(row.retail_price),
        currency: row.currency,
      })),
      total: parseInt(carrierEsimsResult[1].rows[0]?.total || '0'),
    }

    const totalResults = scripts.total + esims.total + giftCards.total + virtualNumbers.total + carrierEsims.total

    return NextResponse.json({
      success: true,
      data: {
        results: {
          scripts,
          esims,
          gift_cards: giftCards,
          virtual_numbers: virtualNumbers,
          carrier_esims: carrierEsims,
        },
        query,
        totalResults,
      },
      pagination: category !== 'all' ? {
        page,
        limit,
        total: category === 'scripts' ? scripts.total
          : category === 'esims' ? esims.total
          : category === 'gift_cards' ? giftCards.total
          : category === 'virtual_numbers' ? virtualNumbers.total
          : carrierEsims.total,
        totalPages: Math.ceil(
          (category === 'scripts' ? scripts.total
            : category === 'esims' ? esims.total
            : category === 'gift_cards' ? giftCards.total
            : category === 'virtual_numbers' ? virtualNumbers.total
            : carrierEsims.total) / limit
        ),
      } : undefined,
    })
  } catch (error) {
    console.error('Universal search error:', error)
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
  }
}
