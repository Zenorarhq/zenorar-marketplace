import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/virtual-numbers/plans
 * Get subscription plans for virtual numbers
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT
         id,
         name,
         slug,
         duration_type as "durationType",
         duration_days as "durationDays",
         sms_included as "smsIncluded",
         voice_minutes_included as "voiceMinutesIncluded",
         unlimited_sms as "unlimitedSms",
         unlimited_voice as "unlimitedVoice",
         base_price as "basePrice",
         sms_overage_price as "smsOveragePrice",
         voice_overage_price as "voiceOveragePrice",
         features,
         is_featured as "isFeatured"
       FROM virtual_number_plans
       WHERE is_active = true
       ORDER BY display_order, base_price`
    )

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    console.error('Error fetching virtual number plans:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}
