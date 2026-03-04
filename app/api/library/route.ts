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
      JOIN categories c ON p."categoryId" = c.id
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
        ugc.image_url,
        ugc.delivered_at as purchase_date,
        ugc.expires_at,
        ugc.redeemed_at
      FROM user_gift_cards ugc
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
        COALESCE(vnp.name, 'Virtual Number') as name,
        uvn.phone_number_display as "phoneNumberDisplay",
        uvn.phone_number as "phoneNumber",
        uvn.status,
        uvn.created_at as purchase_date,
        uvn.expires_at as "expiresAt",
        uvn.current_period_sms as "smsUsed",
        COALESCE(vnp.sms_included, 0) as "smsIncluded",
        (SELECT COUNT(*)::int FROM virtual_number_messages WHERE virtual_number_id = uvn.id AND direction = 'inbound' AND is_read = false) as "unreadCount"
      FROM user_virtual_numbers uvn
      LEFT JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
      WHERE uvn.user_id = $1 AND uvn.status IN ('active', 'expired')
      ORDER BY uvn.created_at DESC
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
        er.slug as region_slug
      FROM user_esims ue
      JOIN esim_plans ep ON ue.plan_id = ep.id
      LEFT JOIN esim_regions er ON ep.region_id = er.id
      WHERE ue.user_id = $1
      ORDER BY ue.created_at DESC
      `,
      [userId]
    )

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

    // Transform gift cards to library item format
    const giftCardItems = giftCardsResult.rows.map((row: any) => {
      return {
        id: row.id,
        name: `${row.brand} $${row.denomination}`,
        slug: `gift-card-${row.id}`,
        description: `${row.brand} Gift Card - $${row.denomination}`,
        category: 'gift-cards',
        icon: 'gift',
        imageUrl: row.image_url,
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
        description: row.region_name
          ? `${row.data_amount_display} - ${row.region_name}`
          : `${row.data_amount_display} - ${row.validity_days} days`,
        category: 'esims',
        icon: 'sim-card',
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

    // Combine all library items
    const libraryItems = [...productItems, ...virtualNumberItems, ...giftCardItems, ...esimItems]

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
