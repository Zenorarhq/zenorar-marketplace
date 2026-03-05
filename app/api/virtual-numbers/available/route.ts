export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { twilioService } from '@/lib/virtual-numbers/providers/twilio'

function formatPhoneNumber(phone: string, country: string): string {
  if (country === 'US' || country === 'CA') {
    // +1 (XXX) XXX-XXXX
    const cleaned = phone.replace(/\D/g, '')
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

/**
 * GET /api/virtual-numbers/available
 * Search available numbers from provider
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('country')
    const type = searchParams.get('type') || 'local'
    const areaCode = searchParams.get('areaCode')

    if (!countryCode) {
      return NextResponse.json(
        { success: false, error: 'Country code is required' },
        { status: 400 }
      )
    }

    // Get country details from database
    const countryResult = await query(
      `SELECT dial_code, retail_monthly FROM virtual_number_countries WHERE iso_code = $1 AND is_active = true`,
      [countryCode]
    )

    if (countryResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Country not supported' },
        { status: 404 }
      )
    }

    const { dial_code: dialCode, retail_monthly: retailMonthly } = countryResult.rows[0]

    // Map type parameter to Twilio type
    const twilioType = type === 'toll-free' ? 'tollFree' : type === 'mobile' ? 'mobile' : 'local'

    // Try to fetch from Twilio first
    const twilioNumbers = await twilioService.searchNumbers(countryCode, twilioType, areaCode || undefined, 20)

    // Format Twilio results for frontend (no mock fallback - show only real numbers)
    const formattedNumbers = twilioNumbers.map(n => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName || formatPhoneNumber(n.phoneNumber, countryCode),
      locality: n.locality || 'Unknown',
      region: n.region || countryCode,
      type,
      capabilities: n.capabilities,
      monthlyPrice: parseFloat(retailMonthly) || (type === 'toll-free' ? 8.00 : type === 'mobile' ? 6.00 : 5.00)
    }))

    return NextResponse.json({
      success: true,
      data: formattedNumbers,
      source: 'twilio',
      message: formattedNumbers.length === 0 ? 'No numbers available for this country/type' : undefined
    })
  } catch (error: any) {
    console.error('Error searching available numbers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search numbers' },
      { status: 500 }
    )
  }
}
