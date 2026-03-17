import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/cards
 * Get cards overview: stats + issued cards list (paginated)
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
    const statusFilter = searchParams.get('status') || ''
    const providerFilter = searchParams.get('provider') || ''

    // Get stats
    const statsResult = await query(`
      SELECT
        COUNT(*)::int as total_cards,
        COUNT(*) FILTER (WHERE status = 'active')::int as active_cards,
        COUNT(*) FILTER (WHERE status = 'frozen')::int as frozen_cards,
        COUNT(*) FILTER (WHERE status = 'expired')::int as expired_cards,
        COUNT(*) FILTER (WHERE status = 'used')::int as used_cards,
        COUNT(*) FILTER (WHERE card_type = 'virtual')::int as virtual_cards,
        COUNT(*) FILTER (WHERE card_type = 'instant')::int as instant_cards
      FROM user_cards
    `)

    // Revenue from card transactions (creation + top_up)
    const revenueResult = await query(`
      SELECT
        COALESCE(SUM(amount + fee), 0)::float as total_revenue,
        COALESCE(SUM(fee), 0)::float as total_fees,
        COUNT(*)::int as total_transactions
      FROM card_transactions
      WHERE status = 'completed'
    `)

    // By-provider breakdown
    const providerBreakdown = await query(`
      SELECT
        provider,
        COUNT(*)::int as card_count,
        COUNT(*) FILTER (WHERE status = 'active')::int as active_count
      FROM user_cards
      GROUP BY provider
      ORDER BY provider
    `)

    // Build cards query with optional filters
    let cardsWhere = 'WHERE 1=1'
    const cardsParams: any[] = []
    let paramIdx = 1

    if (statusFilter) {
      cardsWhere += ` AND uc.status = $${paramIdx++}`
      cardsParams.push(statusFilter)
    }
    if (providerFilter) {
      cardsWhere += ` AND uc.provider = $${paramIdx++}`
      cardsParams.push(providerFilter)
    }

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*)::int as total FROM user_cards uc ${cardsWhere}`,
      cardsParams
    )

    // Get paginated cards with user info
    const cardsResult = await query(
      `SELECT
        uc.id, uc.provider, uc.card_type, uc.card_brand, uc.card_last_four,
        uc.card_expiry, uc.currency, uc.balance, uc.denomination,
        uc.status, uc.nickname, uc.is_premium, uc.created_at, uc.expires_at,
        u.name as user_name, u.email as user_email
      FROM user_cards uc
      LEFT JOIN users u ON uc.user_id = u.id
      ${cardsWhere}
      ORDER BY uc.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...cardsParams, limit, offset]
    )

    const stats = statsResult.rows[0]
    const revenue = revenueResult.rows[0]
    const total = countResult.rows[0]?.total || 0

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          ...stats,
          ...revenue,
          by_provider: providerBreakdown.rows,
        },
        cards: cardsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    console.error('Admin cards error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load cards data' },
      { status: 500 }
    )
  }
}