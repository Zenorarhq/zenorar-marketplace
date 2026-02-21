import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 20
    const offset = (page - 1) * limit
    const search = searchParams.get('search') || ''

    let rows, countRows

    if (search) {
      ;[rows, countRows] = await Promise.all([
        executeQuery(
          `SELECT id, email, "createdAt" FROM newsletter_subscribers WHERE email ILIKE $3 ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
          [limit, offset, `%${search}%`]
        ),
        executeQuery(
          `SELECT COUNT(*) as total FROM newsletter_subscribers WHERE email ILIKE $1`,
          [`%${search}%`]
        ),
      ])
    } else {
      ;[rows, countRows] = await Promise.all([
        executeQuery(
          `SELECT id, email, "createdAt" FROM newsletter_subscribers ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        ),
        executeQuery(
          `SELECT COUNT(*) as total FROM newsletter_subscribers`,
          []
        ),
      ])
    }

    const total = parseInt(countRows.rows[0]?.total || '0')

    return NextResponse.json({
      success: true,
      data: rows.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Newsletter admin fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch subscribers' }, { status: 500 })
  }
}
