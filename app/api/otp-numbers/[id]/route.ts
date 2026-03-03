import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { otpNumberService } from '@/lib/otp-numbers/service'

/**
 * GET /api/otp-numbers/[id]
 * Check SMS status for an OTP number
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

    const result = await otpNumberService.checkSms(id, user.id)

    return NextResponse.json({
      success: true,
      data: {
        status: result.status,
        code: result.code,
        fullSms: result.fullSms
      }
    })
  } catch (error: any) {
    console.error('OTP check error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check SMS' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/otp-numbers/[id]
 * Cancel an OTP number and get refund
 */
export async function DELETE(
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

    const result = await otpNumberService.cancelNumber(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        refunded: result.refunded
      }
    })
  } catch (error: any) {
    console.error('OTP cancel error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel number' },
      { status: 500 }
    )
  }
}
