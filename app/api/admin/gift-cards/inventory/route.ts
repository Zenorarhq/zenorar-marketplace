import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { importCodes, getInventoryStats, getCodesByBatch } from '@/lib/gift-cards/inventory'
import { maskCode } from '@/lib/gift-cards/encryption'
import type { GiftCardCSVRow } from '@/lib/gift-cards/types'

/**
 * GET /api/admin/gift-cards/inventory
 * Get inventory stats or codes
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const giftCardId = searchParams.get('giftCardId')
    const batchId = searchParams.get('batchId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get codes by batch
    if (batchId) {
      const codes = await getCodesByBatch(batchId, limit, offset)
      return NextResponse.json({ success: true, codes })
    }

    // Get inventory stats
    if (!giftCardId || searchParams.get('stats') === 'true') {
      const stats = await getInventoryStats(giftCardId || undefined)
      return NextResponse.json({ success: true, stats })
    }

    // Get codes for a specific gift card
    let whereConditions = ['gift_card_id = $1']
    const params: any[] = [giftCardId]
    let paramIndex = 2

    if (status) {
      whereConditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    params.push(limit, offset)

    const result = await query(
      `SELECT * FROM gift_card_codes
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    const codes = result.rows.map(row => ({
      id: row.id,
      denomination: parseFloat(row.denomination),
      code: maskCode(row.code),
      pin: row.pin ? maskCode(row.pin) : null,
      status: row.status,
      batchId: row.batch_id,
      expiresAt: row.expires_at,
      soldAt: row.sold_at,
      createdAt: row.created_at
    }))

    return NextResponse.json({ success: true, codes })
  } catch (error: any) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/gift-cards/inventory
 * Import codes from CSV data
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

    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (!body.giftCardId || !body.codes || !Array.isArray(body.codes)) {
      return NextResponse.json(
        { success: false, error: 'giftCardId and codes array are required' },
        { status: 400 }
      )
    }

    // Validate gift card exists
    const giftCard = await query(
      `SELECT id, slug FROM gift_cards WHERE id = $1`,
      [body.giftCardId]
    )

    if (giftCard.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Gift card not found' },
        { status: 404 }
      )
    }

    // Convert codes to CSV row format
    const rows: GiftCardCSVRow[] = body.codes.map((code: any) => ({
      brand_slug: giftCard.rows[0].slug,
      denomination: String(code.denomination),
      code: code.code,
      pin: code.pin,
      cost_price: code.costPrice ? String(code.costPrice) : undefined,
      expires_at: code.expiresAt
    }))

    const result = await importCodes(
      body.giftCardId,
      rows,
      user.id,
      body.filename
    )

    return NextResponse.json({
      success: result.success,
      batchId: result.batchId,
      totalRows: result.totalRows,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors.slice(0, 10) // Limit errors in response
    })
  } catch (error: any) {
    console.error('Error importing codes:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import codes' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/gift-cards/inventory
 * Delete codes (available only, not sold)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdmin = user.role?.toUpperCase() === 'ADMIN'
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const codeId = searchParams.get('codeId')
    const batchId = searchParams.get('batchId')

    if (codeId) {
      // Delete single code
      const result = await query(
        `DELETE FROM gift_card_codes
         WHERE id = $1 AND status = 'available'
         RETURNING id`,
        [codeId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Code not found or not deletable' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, deleted: 1 })
    }

    if (batchId) {
      // Delete all available codes in batch
      const result = await query(
        `DELETE FROM gift_card_codes
         WHERE batch_id = $1 AND status = 'available'
         RETURNING id`,
        [batchId]
      )

      return NextResponse.json({ success: true, deleted: result.rows.length })
    }

    return NextResponse.json(
      { success: false, error: 'codeId or batchId required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error deleting codes:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete codes' },
      { status: 500 }
    )
  }
}

