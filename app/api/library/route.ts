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

    // Query user's purchased products from completed orders
    const productsResult = await query(
      `
      SELECT DISTINCT
        p.id,
        p.name,
        p.slug,
        p.description,
        c.slug as category,
        c.icon as category_icon,
        MIN(oi."createdAt") as purchase_date,
        COUNT(DISTINCT o.id) as purchase_count,
        MIN(o.id) as order_id
      FROM orders o
      JOIN order_items oi ON o.id = oi."orderId"
      JOIN products p ON oi."productId" = p.id
      JOIN categories c ON p."categoryId" = c.id
      WHERE o."userId" = $1
        AND o."paymentStatus" = 'PAID'
      GROUP BY p.id, p.name, p.slug, p.description, c.slug, c.icon
      ORDER BY MIN(oi."createdAt") DESC
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

      const category = categoryMap[row.category] || row.category
      const icon = iconMap[category] || row.category_icon || 'box'

      return {
        id: row.id,
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
        status: 'active',
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

    // Combine all library items
    const libraryItems = [...productItems, ...virtualNumberItems]

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
