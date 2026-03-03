export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { twilioService } from '@/lib/virtual-numbers/providers/twilio'

// Mock available numbers for development
// In production, this will call Twilio/Plivo API
function generateMockNumbers(countryCode: string, type: string, dialCode: string, count: number = 10) {
  const areaCodes: Record<string, string[]> = {
    'US': ['212', '415', '310', '305', '312', '713', '602', '206'],
    'GB': ['20', '121', '161', '141', '131', '117', '113', '115'],
    'CA': ['416', '604', '514', '403', '613', '250', '780', '306'],
    'DE': ['30', '89', '69', '40', '221', '711', '511', '341'],
    'FR': ['1', '4', '5', '6', '7', '8', '9'],
    'AU': ['2', '3', '7', '8'],
    'JP': ['3', '6', '45', '52', '11', '22', '92'],
    'SG': ['6']
  }

  const codes = areaCodes[countryCode] || ['1']
  const numbers = []

  for (let i = 0; i < count; i++) {
    const areaCode = codes[Math.floor(Math.random() * codes.length)]
    const lineNumber = String(Math.floor(Math.random() * 9000000) + 1000000).slice(0, 7)
    const phoneNumber = `${dialCode}${areaCode}${lineNumber}`

    numbers.push({
      phoneNumber,
      friendlyName: formatPhoneNumber(phoneNumber, countryCode),
      locality: getRandomCity(countryCode),
      region: countryCode,
      type,
      capabilities: {
        sms: true,
        voice: true,
        mms: countryCode === 'US' || countryCode === 'CA'
      },
      monthlyPrice: type === 'toll-free' ? 8.00 : type === 'mobile' ? 6.00 : 5.00
    })
  }

  return numbers
}

function formatPhoneNumber(phone: string, country: string): string {
  if (country === 'US' || country === 'CA') {
    // +1 (XXX) XXX-XXXX
    const cleaned = phone.replace(/\D/g, '')
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

function getRandomCity(country: string): string {
  const cities: Record<string, string[]> = {
    'US': ['New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Miami', 'Houston', 'Phoenix', 'Seattle'],
    'GB': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Edinburgh', 'Bristol', 'Leeds', 'Nottingham'],
    'CA': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Victoria', 'Edmonton', 'Saskatoon'],
    'DE': ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Stuttgart', 'Hanover', 'Leipzig'],
    'FR': ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Strasbourg', 'Nantes', 'Nice'],
    'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
    'JP': ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Sendai', 'Fukuoka'],
    'SG': ['Singapore']
  }
  const list = cities[country] || ['Unknown']
  return list[Math.floor(Math.random() * list.length)]
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

    if (twilioNumbers.length > 0) {
      // Format Twilio results for frontend
      const formattedNumbers = twilioNumbers.map(n => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName || formatPhoneNumber(n.phoneNumber, countryCode),
        locality: n.locality || getRandomCity(countryCode),
        region: n.region || countryCode,
        type,
        capabilities: n.capabilities,
        monthlyPrice: parseFloat(retailMonthly) || (type === 'toll-free' ? 8.00 : type === 'mobile' ? 6.00 : 5.00)
      }))

      return NextResponse.json({
        success: true,
        data: formattedNumbers,
        source: 'twilio'
      })
    }

    // Fall back to mock numbers if Twilio not configured or returns no results
    const numbers = generateMockNumbers(countryCode, type, dialCode, 12)

    // Filter by area code if provided
    const filteredNumbers = areaCode
      ? numbers.filter(n => n.phoneNumber.includes(areaCode))
      : numbers

    return NextResponse.json({
      success: true,
      data: filteredNumbers,
      source: 'mock'
    })
  } catch (error: any) {
    console.error('Error searching available numbers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search numbers' },
      { status: 500 }
    )
  }
}
