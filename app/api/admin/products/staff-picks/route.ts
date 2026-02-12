import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET() {
  try {
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
