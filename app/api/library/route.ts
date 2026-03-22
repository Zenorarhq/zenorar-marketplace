export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

export async function GET(request: Request) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.payload.userId

    // Query user's licenses — one row per license so multiple purchases of the same product show separately
    // Also joins download_history and product_files to detect update-available status
    const productsResult = await query(
      `
      SELECT
        l.id as license_id,
        p.id as product_id,
        p.name,
        p.slug,
        p.description,
        c.slug as category,
        c.icon as category_icon,
        l.created_at as purchase_date,
        l.order_id as order_id,
        l.status as license_status,
        dh.last_file_id,
        lf.latest_file_id
      FROM licenses l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN (
        SELECT DISTINCT ON (product_id) file_id as last_file_id, product_id
        FROM download_history
        WHERE user_id = $1
        ORDER BY product_id, downloaded_at DESC
      ) dh ON dh.product_id = p.id
      LEFT JOIN (
        SELECT id as latest_file_id, product_id
        FROM product_files
        WHERE is_latest = true
      ) lf ON lf.product_id = p.id
      WHERE l.user_id = $1
      ORDER BY l.created_at DESC
      `,
      [userId]
    )

    // Query user's gift cards
    const giftCardsResult = await query(
      `
      SELECT
        ugc.id,
        ugc.brand,
        ugc.category,
        ugc.denomination,
        ugc.status,
        COALESCE(gc.image_url, ugc.image_url) as image_url,
        ugc.delivered_at as purchase_date,
        ugc.expires_at,
        ugc.redeemed_at,
        ugc.order_id,
        ugc.gift_card_id,
        gc.slug as gift_card_slug
      FROM user_gift_cards ugc
      LEFT JOIN gift_cards gc ON ugc.gift_card_id = gc.id
      WHERE ugc.user_id = $1
      ORDER BY ugc.delivered_at DESC
      `,
      [userId]
    )

    // Query user's virtual numbers
    const virtualNumbersResult = await query(
      `
      SELECT
        uvn.id,
        'virtual-numbers' as category,
        COALESCE(vnp.name, INITCAP(COALESCE(uvn.plan_category, 'basic')) || ' Plan') as name,
        uvn.phone_number_display as "phoneNumberDisplay",
        uvn.phone_number as "phoneNumber",
        uvn.status,
        uvn.created_at as purchase_date,
        uvn.expires_at as "expiresAt",
        uvn.current_period_sms as "smsUsed",
        COALESCE(vnp.sms_included, uvn.sms_limit, 100) as "smsIncluded",
        (SELECT COUNT(*)::int FROM virtual_number_messages WHERE virtual_number_id = uvn.id AND direction = 'inbound' AND is_read = false) as "unreadCount"
      FROM user_virtual_numbers uvn
      LEFT JOIN virtual_number_plans vnp ON uvn.plan_id::text = vnp.id::text
      WHERE uvn.user_id = $1 AND uvn.status IN ('active', 'expired')
      ORDER BY uvn.created_at DESC
      `,
      [userId]
    )

    // Query pending/failed virtual number orders (orders placed but not yet provisioned)
    const pendingVirtualNumbersResult = await query(
      `
      SELECT
        oi.id,
        'virtual-numbers' as category,
        INITCAP(COALESCE(oi.metadata->>'planCategory', 'basic')) || ' Plan' as name,
        oi.metadata->>'friendlyName' as "phoneNumberDisplay",
        oi.metadata->>'phone_number' as "phoneNumber",
        CASE
          WHEN vnpl.status = 'failed' THEN 'failed'
          ELSE 'pending'
        END as status,
        o."createdAt" as purchase_date,
        NULL as "expiresAt",
        0 as "smsUsed",
        COALESCE((oi.metadata->>'sms_limit')::int, 100) as "smsIncluded",
        0 as "unreadCount",
        vnpl.error_message as "errorMessage"
      FROM orders o
      JOIN order_items oi ON oi."orderId" = o.id
      LEFT JOIN virtual_number_provision_log vnpl ON vnpl.order_id = o.id
      LEFT JOIN user_virtual_numbers uvn ON uvn.order_id = o.id
      WHERE o."userId" = $1
        AND oi.product_type = 'virtual_number'
        AND uvn.id IS NULL
      ORDER BY o."createdAt" DESC
      LIMIT 10
      `,
      [userId]
    )

    // Query user's eSIMs
    const esimsResult = await query(
      `
      SELECT
        ue.id,
        ue.iccid,
        ue.status,
        ue.data_used_mb,
        ue.data_remaining_mb,
        ue.expires_at,
        ue.created_at as purchase_date,
        ue.qr_code_data,
        ep.name as plan_name,
        ep.data_amount_display,
        ep.validity_days,
        ep.countries,
        er.name as region_name,
        er.slug as region_slug,
        ec.name as country_name
      FROM user_esims ue
      JOIN esim_plans ep ON ue.plan_id = ep.id
      LEFT JOIN esim_regions er ON ep.region_id = er.id
      LEFT JOIN esim_countries ec ON array_length(ep.countries, 1) = 1 AND ec.iso_code = ep.countries[1]
      WHERE ue.user_id = $1
      ORDER BY ue.created_at DESC
      `,
      [userId]
    )

    // Query pending/failed eSIM orders (orders placed but not yet provisioned)
    const pendingEsimsResult = await query(
      `
      SELECT
        oi.id,
        oi.name,
        oi.metadata,
        CASE
          WHEN epl.status = 'failed' THEN 'failed'
          WHEN o.status = 'CANCELLED' THEN 'failed'
          ELSE 'pending'
        END as status,
        o."createdAt" as purchase_date,
        epl.error_message as "errorMessage"
      FROM orders o
      JOIN order_items oi ON oi."orderId" = o.id
      LEFT JOIN esim_provision_log epl ON epl.order_id = o.id AND epl.order_item_id = oi.id
      LEFT JOIN user_esims ue ON ue.order_id = o.id AND ue.order_item_id = oi.id
      WHERE o."userId" = $1
        AND oi.product_type = 'esim'
        AND ue.id IS NULL
        AND o.status NOT IN ('CANCELLED')
      ORDER BY o."createdAt" DESC
      LIMIT 10
      `,
      [userId]
    ).catch(() => ({ rows: [] }))

    // Query user's virtual cards (from user_cards table)
    const cardsResult = await query(
      `
      SELECT
        uc.id,
        uc.provider,
        uc.card_type,
        uc.card_brand,
        uc.card_last_four,
        uc.card_expiry,
        uc.currency,
        uc.balance,
        uc.denomination,
        uc.status,
        uc.nickname,
        uc.created_at as purchase_date,
        uc.expires_at
      FROM user_cards uc
      WHERE uc.user_id = $1 AND uc.status NOT IN ('used', 'expired')
      ORDER BY uc.created_at DESC
      `,
      [userId]
    ).catch(() => ({ rows: [] })) // Table may not exist yet

    // Transform product results to library item format
    const productItems = productsResult.rows.map((row: any) => {
      // Map category slugs to library filter types
      const categoryMap: Record<string, string> = {
        'scripts': 'scripts',
        'esims': 'esims',
        'tools': 'tools',
        'api-access': 'api',
        'api': 'api',
      }

      // Determine icon based on category
      const iconMap: Record<string, string> = {
        'scripts': 'code',
        'esims': 'sim-card',
        'tools': 'terminal',
        'api': 'api',
      }

      // Map license status to library item status
      const statusMap: Record<string, string> = {
        'ACTIVE': 'active',
        'SUSPENDED': 'suspended',
        'REVOKED': 'expired',
        'EXPIRED': 'expired',
      }

      const category = categoryMap[row.category] || row.category
      const icon = iconMap[category] || row.category_icon || 'box'

      return {
        id: row.product_id,
        licenseId: row.license_id,
        name: row.name,
        slug: row.slug,
        description: row.description || `${row.name} - Digital product`,
        category: category,
        icon: icon,
        orderId: row.order_id,
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: (row.last_file_id && row.latest_file_id && row.last_file_id !== row.latest_file_id)
          ? 'update-available'
          : (statusMap[row.license_status] || 'active'),
      }
    })

    // Transform virtual numbers to library item format
    const virtualNumberItems = virtualNumbersResult.rows.map((row: any) => {
      return {
        id: row.id,
        name: row.phoneNumberDisplay || row.phoneNumber,
        slug: `virtual-number-${row.id}`,
        description: `${row.name} - ${row.phoneNumber}`,
        category: 'virtual-numbers',
        icon: 'phone',
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: row.status,
        phoneNumber: row.phoneNumber,
        phoneNumberDisplay: row.phoneNumberDisplay,
        expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
        smsUsed: row.smsUsed || 0,
        smsIncluded: row.smsIncluded || 0,
        unreadCount: row.unreadCount || 0,
      }
    })

    // Transform pending/failed virtual number orders
    const pendingVirtualNumberItems = pendingVirtualNumbersResult.rows.map((row: any) => {
      const isFailed = row.status === 'failed'
      return {
        id: row.id,
        name: row.phoneNumberDisplay || row.phoneNumber || 'Virtual Number',
        slug: `virtual-number-pending-${row.id}`,
        description: isFailed
          ? `Provisioning Failed: ${row.errorMessage || 'Provider error'}`
          : `${row.name} - Provisioning...`,
        category: 'virtual-numbers',
        icon: 'phone',
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: isFailed ? 'failed' : 'pending',
        phoneNumber: row.phoneNumber,
        phoneNumberDisplay: row.phoneNumberDisplay,
        expiresAt: null,
        smsUsed: 0,
        smsIncluded: row.smsIncluded || 0,
        unreadCount: 0,
        errorMessage: row.errorMessage,
      }
    })

    // Transform gift cards to library item format
    const giftCardItems = giftCardsResult.rows.map((row: any) => {
      return {
        id: row.id,
        name: `${row.brand} $${row.denomination}`,
        slug: row.gift_card_slug || null, // Actual gift card product slug for navigation
        description: `${row.brand} Gift Card - $${row.denomination}`,
        category: 'gift-cards',
        icon: 'gift',
        imageUrl: row.image_url,
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: row.status,
        denomination: parseFloat(row.denomination),
        brand: row.brand,
        giftCardCategory: row.category,
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        redeemedAt: row.redeemed_at ? new Date(row.redeemed_at).toISOString() : null,
        orderId: row.order_id,
        giftCardId: row.gift_card_id,
      }
    })

    // Transform eSIMs to library item format
    const esimItems = esimsResult.rows.map((row: any) => {
      const dataUsedMb = parseFloat(row.data_used_mb) || 0
      const dataRemainingMb = parseFloat(row.data_remaining_mb) || 0
      const totalDataMb = dataUsedMb + dataRemainingMb
      const usagePercent = totalDataMb > 0 ? Math.round((dataUsedMb / totalDataMb) * 100) : 0

      return {
        id: row.id,
        name: row.plan_name,
        slug: `esim-${row.id}`,
        description: row.country_name
          ? `${row.data_amount_display} - ${row.country_name}`
          : row.region_name
            ? `${row.data_amount_display} - ${row.region_name}`
            : `${row.data_amount_display} - ${row.validity_days} days`,
        category: 'esims',
        icon: 'sim-card',
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: row.status,
        iccid: row.iccid,
        dataAmountDisplay: row.data_amount_display,
        dataUsedMb,
        dataRemainingMb,
        usagePercent,
        validityDays: row.validity_days,
        regionName: row.region_name,
        regionSlug: row.region_slug,
        countries: row.countries,
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        hasQrCode: !!row.qr_code_data,
      }
    })

    // Transform cards to library item format
    const cardItems = cardsResult.rows.map((row: any) => {
      const brandDisplay = row.card_brand === 'mastercard' ? 'Mastercard' : 'Visa'
      const typeDisplay = row.card_type === 'instant' ? 'Instant Card' : 'Virtual Card'
      const valueDisplay = row.denomination
        ? `$${parseFloat(row.denomination).toFixed(0)}`
        : `$${parseFloat(row.balance || 0).toFixed(2)}`
      const cardName = row.card_type === 'virtual'
        ? `${brandDisplay} ${typeDisplay}`
        : `${brandDisplay} ${valueDisplay}`

      return {
        id: row.id,
        name: cardName,
        slug: null,
        description: `${typeDisplay} - ${row.card_last_four ? `****${row.card_last_four}` : 'Card'}`,
        category: 'cards',
        icon: 'credit-card',
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: row.status === 'active' ? 'active' : row.status,
        cardBrand: row.card_brand,
        cardType: row.card_type,
        cardLastFour: row.card_last_four,
        cardExpiry: row.card_expiry,
        balance: parseFloat(row.balance || 0),
        denomination: row.denomination ? parseFloat(row.denomination) : null,
        currency: row.currency || 'USD',
        provider: row.provider,
        nickname: row.nickname,
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      }
    })

    // Transform pending/failed eSIM orders
    const pendingEsimItems = pendingEsimsResult.rows.map((row: any) => {
      const isFailed = row.status === 'failed'
      const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {})
      return {
        id: row.id,
        name: row.name || 'eSIM',
        slug: `esim-pending-${row.id}`,
        description: isFailed
          ? `Provisioning Failed: ${row.errorMessage || 'Provider error'}`
          : 'eSIM - Provisioning...',
        category: 'esims',
        icon: 'sim-card',
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: isFailed ? 'failed' : 'pending',
        errorMessage: row.errorMessage,
        countries: metadata.countryIsoCode ? [metadata.countryIsoCode] : [],
      }
    })

    // Query fulfilled carrier eSIMs from user_esims (source_type = 'carrier')
    const fulfilledCarrierEsimsResult = await query(
      `
      SELECT
        ue.id,
        ue.iccid,
        ue.status,
        ue.qr_code_data,
        ue.smdp_address,
        ue.activation_code,
        ue.created_at as purchase_date,
        cep.carrier_name,
        cep.carrier_slug,
        cep.plan_name,
        cep.data_amount_display,
        cep.voice_display,
        cep.sms_display,
        cep.country,
        cep.network_type
      FROM user_esims ue
      JOIN carrier_esim_plans cep ON ue.carrier_plan_id = cep.id
      WHERE ue.user_id = $1 AND ue.source_type = 'carrier'
      ORDER BY ue.created_at DESC
      `,
      [userId]
    ).catch(() => ({ rows: [] }))

    const fulfilledCarrierEsimItems = fulfilledCarrierEsimsResult.rows.map((row: any) => ({
      id: row.id,
      name: `${row.carrier_name} ${row.plan_name}`,
      slug: `carrier-esim-${row.id}`,
      description: `${row.data_amount_display} · ${row.voice_display || 'Voice'} · ${row.sms_display || 'SMS'} · ${row.network_type?.toUpperCase()}`,
      category: 'esims',
      icon: 'sim-card',
      purchaseDateRaw: new Date(row.purchase_date).getTime(),
      purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'active',
      iccid: row.iccid,
      hasQrCode: !!row.qr_code_data,
      carrierName: row.carrier_name,
      carrierSlug: row.carrier_slug,
      isCarrierEsim: true,
      countries: [row.country],
    }))

    // Query user's carrier eSIM orders (pending/cancelled only — fulfilled ones are in user_esims above)
    const carrierEsimOrdersResult = await query(
      `
      SELECT
        ceo.id,
        ceo.status,
        ceo.fulfillment_deadline,
        ceo.cancellation_reason,
        ceo.created_at as purchase_date,
        cep.carrier_name,
        cep.carrier_slug,
        cep.plan_name,
        cep.data_amount_display,
        cep.voice_display,
        cep.sms_display,
        cep.country,
        cep.network_type
      FROM carrier_esim_orders ceo
      JOIN carrier_esim_plans cep ON ceo.carrier_plan_id = cep.id
      WHERE ceo.user_id = $1 AND ceo.status IN ('pending_fulfillment', 'cancelled')
      ORDER BY ceo.created_at DESC
      `,
      [userId]
    ).catch(() => ({ rows: [] }))

    // Transform carrier eSIM orders to library item format
    const carrierEsimItems = carrierEsimOrdersResult.rows.map((row: any) => {
      const isPending = row.status === 'pending_fulfillment'
      const isCancelled = row.status === 'cancelled'
      return {
        id: row.id,
        name: `${row.carrier_name} ${row.plan_name}`,
        slug: `carrier-esim-${row.id}`,
        description: isCancelled
          ? `Cancelled — Refunded to wallet${row.cancellation_reason ? `: ${row.cancellation_reason}` : ''}`
          : `${row.data_amount_display} · ${row.voice_display || 'Voice'} · ${row.sms_display || 'SMS'} · ${row.network_type?.toUpperCase()}`,
        category: 'esims',
        icon: 'sim-card',
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: isPending ? 'pending' : 'failed',
        carrierName: row.carrier_name,
        carrierSlug: row.carrier_slug,
        fulfillmentDeadline: row.fulfillment_deadline ? new Date(row.fulfillment_deadline).toISOString() : null,
        isCarrierEsim: true,
        countries: [row.country],
      }
    })

    // Query user's phone refill orders
    const phoneRefillsResult = await query(
      `
      SELECT
        oi.id,
        oi.name,
        oi.price,
        oi.metadata,
        o."createdAt" as purchase_date,
        o.status as order_status,
        o.id as order_id
      FROM orders o
      JOIN order_items oi ON oi."orderId" = o.id
      WHERE o."userId" = $1
        AND oi.product_type = 'phone_refill'
      ORDER BY o."createdAt" DESC
      `,
      [userId]
    ).catch(() => ({ rows: [] }))

    // Transform phone refills to library item format
    const phoneRefillItems = phoneRefillsResult.rows.map((row: any) => {
      const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {})
      const operatorName = metadata.operatorName || 'Top-Up'
      const sendAmount = metadata.sendAmount
      const sendCurrency = metadata.sendCurrency || 'USD'
      const country = metadata.country || ''

      return {
        id: row.id,
        name: `${operatorName} Top-Up`,
        slug: null,
        description: sendAmount
          ? `${sendAmount} ${sendCurrency} to ${metadata.recipientPhone || 'recipient'}`
          : row.name || 'Phone Refill',
        category: 'phone-refills',
        icon: 'phone',
        purchaseDateRaw: new Date(row.purchase_date).getTime(),
        purchaseDate: new Date(row.purchase_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: row.order_status === 'CONFIRMED' ? 'delivered' : 'pending',
        operatorName,
        country,
        recipientPhone: metadata.recipientPhone,
        sendAmount,
        sendCurrency,
        orderId: row.order_id,
      }
    })

    // Combine all library items (include pending/failed virtual numbers and eSIMs)
    const libraryItems = [...productItems, ...virtualNumberItems, ...pendingVirtualNumberItems, ...giftCardItems, ...esimItems, ...fulfilledCarrierEsimItems, ...pendingEsimItems, ...carrierEsimItems, ...cardItems, ...phoneRefillItems]

    // Sort all items by purchase date (newest first)
    libraryItems.sort((a, b) => {
      const itemA = a as any
      const itemB = b as any
      const dateA = itemA.purchaseDateRaw || 0
      const dateB = itemB.purchaseDateRaw || 0
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      data: libraryItems,
    })
  } catch (error: any) {
    console.error('Library fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch library',
      },
      { status: 500 }
    )
  }
}
