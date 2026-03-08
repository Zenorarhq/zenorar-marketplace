import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { otpNumberService, setTestMode, isTestMode } from '@/lib/otp-numbers/service'

/**
 * GET /api/otp-numbers
 * Get available OTP services and user's recent numbers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const provider = searchParams.get('provider') as 'smspool' | '5sim' | 'test-mock' | undefined
    const serviceId = searchParams.get('service')
    const countryCode = searchParams.get('country')
    const testMode = searchParams.get('testMode')

    // Handle test mode toggle
    if (testMode === 'true') {
      setTestMode(true)
    } else if (testMode === 'false') {
      setTestMode(false)
    }

    // Return test mode status
    if (action === 'testModeStatus') {
      return NextResponse.json({ success: true, testMode: isTestMode() })
    }

    // Get services
    if (action === 'services') {
      const services = await otpNumberService.getServices(provider)
      return NextResponse.json({ success: true, data: services })
    }

    // Get countries for a service
    if (action === 'countries' && serviceId) {
      const countries = await otpNumberService.getCountries(serviceId, provider)
      return NextResponse.json({ success: true, data: countries })
    }

    // Get price
    if (action === 'price' && serviceId && countryCode) {
      const priceInfo = await otpNumberService.getPrice(serviceId, countryCode, provider)
      return NextResponse.json({ success: true, data: priceInfo })
    }

    // Get all prices from enabled providers
    if (action === 'prices' && serviceId && countryCode) {
      const prices = await otpNumberService.getAllPrices(serviceId, countryCode)
      return NextResponse.json({ success: true, data: prices })
    }

    // Get user's recent OTP numbers (requires auth)
    if (user) {
      const numbers = await otpNumberService.getUserOtpNumbers(user.id, 20)
      return NextResponse.json({ success: true, data: numbers })
    }

    // Default: return services list
    const services = await otpNumberService.getServices()
    return NextResponse.json({ success: true, data: services })
  } catch (error: any) {
    console.error('OTP numbers GET error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get OTP data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/otp-numbers
 * Request a new OTP number
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { serviceId, countryCode, provider, testMode } = body

    // Enable test mode if requested
    if (testMode === true) {
      setTestMode(true)
    }

    if (!serviceId || !countryCode) {
      return NextResponse.json(
        { success: false, error: 'Service ID and country code are required' },
        { status: 400 }
      )
    }

    const result = await otpNumberService.requestNumber(
      user.id,
      serviceId,
      countryCode,
      provider
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.userOtpId,
        number: result.number
      }
    })
  } catch (error: any) {
    console.error('OTP numbers POST error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to request number' },
      { status: 500 }
    )
  }
}
