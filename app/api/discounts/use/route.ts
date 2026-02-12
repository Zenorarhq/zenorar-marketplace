import { NextRequest, NextResponse } from 'next/server'
import { parseRequestBody } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// POST /api/discounts/use — Increment usage count for a discount code
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request)
    if (!body || !body.code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 })
    }

    const result = await executeQuery(
      `UPDATE discounts
       SET "usageCount" = "usageCount" + 1
       WHERE code = $1 AND "isActive" = true
       RETURNING id, code, "usageCount"`,
      [body.code.toUpperCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Error incrementing discount usage:', error)
    return NextResponse.json({ success: false, error: 'Failed to update usage' }, { status: 500 })
  }
}
