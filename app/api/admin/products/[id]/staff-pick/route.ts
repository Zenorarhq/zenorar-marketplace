import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await executeQuery(
      `SELECT COALESCE(is_staff_pick, false) as is_staff_pick FROM products WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, isStaffPick: result.rows[0].is_staff_pick })
  } catch (error) {
    console.error('Get staff pick error:', error)
    return NextResponse.json({ success: false, isStaffPick: false })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if body has a specific value, otherwise toggle
    let sql: string
    const args: any[] = [id]

    try {
      const body = await request.json()
      if (typeof body.value === 'boolean') {
        sql = `UPDATE products SET is_staff_pick = $2 WHERE id = $1 RETURNING is_staff_pick`
        args.push(body.value)
      } else {
        sql = `UPDATE products SET is_staff_pick = NOT COALESCE(is_staff_pick, false) WHERE id = $1 RETURNING is_staff_pick`
      }
    } catch {
      // No body — toggle
      sql = `UPDATE products SET is_staff_pick = NOT COALESCE(is_staff_pick, false) WHERE id = $1 RETURNING is_staff_pick`
    }

    const result = await executeQuery(sql, args)

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, isStaffPick: result.rows[0].is_staff_pick })
  } catch (error) {
    console.error('Toggle staff pick error:', error)
    return NextResponse.json({ success: false, error: 'Failed to toggle staff pick' }, { status: 500 })
  }
}
