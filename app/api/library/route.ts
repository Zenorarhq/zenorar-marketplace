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
    const result = await query(
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

    // Transform database results to library item format
    const libraryItems = result.rows.map((row: any) => {
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
        status: 'active', // Default status - will be enhanced in Phase 2
        // Optional fields that will be populated in Phase 2:
        // version: undefined,
        // downloadCount: undefined,
        // expiresAt: undefined,
      }
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
