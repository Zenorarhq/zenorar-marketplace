export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

// POST /api/orders/enrich
// Returns product_type and metadata for order items, keyed by orderId
export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { orderIds } = await req.json()
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ success: true, data: {} })
    }

    // Limit to 50 orders per request
    const ids = orderIds.slice(0, 50)
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')

    const result = await query(
      `SELECT oi."orderId", oi.id, oi.product_type, oi.metadata
       FROM order_items oi
       WHERE oi."orderId" IN (${placeholders})`,
      ids
    )

    // Group by orderId
    const enrichMap: Record<string, Record<string, { product_type: string; metadata: any }>> = {}
    for (const row of result.rows) {
      if (!enrichMap[row.orderId]) enrichMap[row.orderId] = {}
      enrichMap[row.orderId][row.id] = {
        product_type: row.product_type,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      }
    }

    return NextResponse.json({ success: true, data: enrichMap })
  } catch (error: any) {
    console.error('Orders enrich error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to enrich orders' },
      { status: 500 }
    )
  }
}
