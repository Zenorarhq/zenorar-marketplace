import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/virtual-numbers/countries
 * Get all available countries for virtual numbers
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT
         id,
         name,
         iso_code as "isoCode",
         dial_code as "dialCode",
         flag_emoji as "flagEmoji",
         sms_enabled as "smsEnabled",
         voice_enabled as "voiceEnabled",
         mms_enabled as "mmsEnabled",
         retail_monthly as "retailMonthly",
         is_active as "isActive"
       FROM virtual_number_countries
       WHERE is_active = true
       ORDER BY display_order, name`
    )

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    console.error('Error fetching virtual number countries:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch countries' },
      { status: 500 }
    )
  }
}
