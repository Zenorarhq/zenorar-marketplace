import { NextRequest, NextResponse } from 'next/server'
import { fulfillOrder } from '@/lib/order-fulfillment'

/**
 * POST /api/orders/[id]/fulfill
 * Runs digital product fulfillment (license generation, eSIM provisioning, etc.)
 * Called after payment is confirmed by any gateway.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const result = await fulfillOrder(orderId)

    if (!result.success) {
      console.warn('Fulfillment had issues for order', orderId, result)
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Order fulfill error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fulfillment failed' },
      { status: 500 }
    )
  }
}
