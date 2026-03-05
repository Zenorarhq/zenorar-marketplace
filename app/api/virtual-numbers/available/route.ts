export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { inventoryService } from '@/lib/virtual-numbers/inventory'

/**
 * GET /api/virtual-numbers/available
 * Search available numbers - inventory first, then Twilio
 * Returns numbers with 'source' field: 'inventory' (instant) or 'twilio' (new)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('country')
    const type = searchParams.get('type') || 'local'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!countryCode) {
      return NextResponse.json(
        { success: false, error: 'Country code is required' },
        { status: 400 }
      )
    }

    // Validate country is supported
    const countryResult = await query(
      `SELECT retail_monthly FROM virtual_number_countries WHERE iso_code = $1 AND is_active = true`,
      [countryCode]
    )

    if (countryResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Country not supported' },
        { status: 404 }
      )
    }

    const retailMonthly = parseFloat(countryResult.rows[0].retail_monthly) ||
      (type === 'toll-free' ? 8.00 : type === 'mobile' ? 6.00 : 5.00)

    // Get numbers from inventory service (handles inventory first, then Twilio)
    const numbers = await inventoryService.getAvailableNumbers(countryCode, type, limit)

    // Format for frontend
    const formattedNumbers = numbers.map(n => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.phoneNumberDisplay || n.phoneNumber,
      locality: undefined, // Will be populated from Twilio response if available
      type: n.numberType || type,
      capabilities: {
        sms: n.smsEnabled,
        voice: n.voiceEnabled,
        mms: n.mmsEnabled
      },
      monthlyPrice: retailMonthly,
      source: n.source // 'inventory' or 'twilio'
    }))

    // Count inventory vs Twilio numbers for stats
    const inventoryCount = formattedNumbers.filter(n => n.source === 'inventory').length
    const twilioCount = formattedNumbers.filter(n => n.source === 'twilio').length

    return NextResponse.json({
      success: true,
      data: formattedNumbers,
      stats: {
        total: formattedNumbers.length,
        fromInventory: inventoryCount,
        fromTwilio: twilioCount
      },
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
