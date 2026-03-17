import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/cards/transactions
 * Paginated card transactions with filters
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
    const offset = (page - 1) * limit
    const typeFilter = searchParams.get('type') || ''
    const providerFilter = searchParams.get('provider') || ''

    let where = 'WHERE 1=1'
    const params: any[] = []
    let paramIdx = 1

    if (typeFilter) {
      where += ` AND ct.type = $${paramIdx++}`
      params.push(typeFilter)
    }
    if (providerFilter) {
      where += ` AND ct.provider = $${paramIdx++}`
      params.push(providerFilter)
    }

    const countResult = await query(
      `SELECT COUNT(*)::int as total FROM card_transactions ct ${where}`,
      params
    )

    const result = await query(
      `SELECT
        ct.id, ct.card_id, ct.provider, ct.type, ct.amount, ct.fee,
        ct.merchant_name, ct.merchant_category, ct.status, ct.description,
        ct.created_at,
        u.name as user_name, u.email as user_email,
        uc.card_last_four, uc.card_type
      FROM card_transactions ct
      LEFT JOIN users u ON ct.user_id = u.id
      LEFT JOIN user_cards uc ON ct.card_id = uc.id
      ${where}
      ORDER BY ct.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    )

    const total = countResult.rows[0]?.total || 0

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Admin card transactions error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load transactions' },
      { status: 500 }
    )
  }
}