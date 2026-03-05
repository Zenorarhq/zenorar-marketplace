import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const result = await executeQuery(
      `SELECT id FROM products WHERE is_staff_pick = true`
    )
    const ids = result.rows.map(row => row.id)
    return NextResponse.json({ success: true, data: ids })
  } catch (error) {
    console.error('Staff pick IDs error:', error)
    return NextResponse.json({ success: false, data: [] })
  }
}
