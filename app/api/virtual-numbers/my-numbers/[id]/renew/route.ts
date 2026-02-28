import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { virtualNumberService } from '@/lib/virtual-numbers/service'

/**
 * GET /api/virtual-numbers/my-numbers/[id]/renew
 * Get renewal price for a virtual number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const result = await virtualNumberService.getRenewalPrice(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      price: result.price,
      durationDays: result.durationDays
    })
  } catch (error: any) {
    console.error('Error getting renewal price:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get renewal price' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/virtual-numbers/my-numbers/[id]/renew
 * Renew a virtual number
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    // In a full implementation, you would:
    // 1. Get the renewal price
    // 2. Create a payment intent/order
    // 3. Process payment
    // 4. Only then renew the number

    // For now, we'll just renew (assuming payment was handled externally)
    const result = await virtualNumberService.renewNumber(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      newExpiresAt: result.newExpiresAt,
      message: 'Virtual number renewed successfully'
    })
  } catch (error: any) {
    console.error('Error renewing virtual number:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to renew virtual number' },
      { status: 500 }
    )
  }
}
