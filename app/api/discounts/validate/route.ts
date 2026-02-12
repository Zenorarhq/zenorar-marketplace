import { NextRequest, NextResponse } from 'next/server'
import { parseRequestBody } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

// POST /api/discounts/validate — Validate a discount code (public)
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request)
    if (!body || !body.code || body.orderTotal === undefined) {
      return NextResponse.json({ success: false, error: 'Code and orderTotal are required' }, { status: 400 })
    }

    const result = await executeQuery(
      `SELECT id, code, type, value,
              "minOrderValue",
              "maxDiscountValue",
              "usageLimit",
              "usageCount",
              "isActive",
              "expiresAt"
       FROM discounts
       WHERE code = $1`,
      [body.code.toUpperCase()]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid discount code' }, { status: 404 })
    }

    const discount = result.rows[0]

    if (!discount.isActive) {
      return NextResponse.json({ success: false, error: 'This discount code is no longer active' }, { status: 400 })
    }

    if (discount.expiresAt && new Date(discount.expiresAt) <= new Date()) {
      return NextResponse.json({ success: false, error: 'This discount code has expired' }, { status: 400 })
    }

    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      return NextResponse.json({ success: false, error: 'This discount code has reached its usage limit' }, { status: 400 })
    }

    if (discount.minOrderValue && body.orderTotal < Number(discount.minOrderValue)) {
      return NextResponse.json({
        success: false,
        error: `Minimum order amount of $${Number(discount.minOrderValue).toFixed(2)} required`
      }, { status: 400 })
    }

    // Calculate discount amount
    let discountAmount: number
    if (discount.type === 'PERCENTAGE') {
      discountAmount = (body.orderTotal * Number(discount.value)) / 100
      if (discount.maxDiscountValue) {
        discountAmount = Math.min(discountAmount, Number(discount.maxDiscountValue))
      }
    } else {
      discountAmount = Number(discount.value)
    }

    discountAmount = Math.min(discountAmount, body.orderTotal)
    const finalTotal = body.orderTotal - discountAmount

    return NextResponse.json({
      success: true,
      data: {
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: Number(discount.value),
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
      }
    })
  } catch (error) {
    console.error('Error validating discount:', error)
    return NextResponse.json({ success: false, error: 'Failed to validate discount' }, { status: 500 })
  }
}
