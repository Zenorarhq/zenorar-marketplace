import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/virtual-numbers/types
 * Get number types (local, toll-free, mobile)
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT
         id,
         name,
         slug,
         description,
         price_multiplier as "priceMultiplier"
       FROM virtual_number_types
       WHERE is_active = true
       ORDER BY display_order, name`
    )

    return NextResponse.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    console.error('Error fetching virtual number types:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch types' },
      { status: 500 }
    )
  }
}
