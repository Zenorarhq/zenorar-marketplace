import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * PATCH /api/admin/esim/plans/[id]
 * Toggle is_featured (Recommended) or is_staff_pick (Staff Picks) on an eSIM plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN', 'EDITOR'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedFields: Record<string, string> = {
      isFeatured: 'is_featured',
      isStaffPick: 'is_staff_pick',
    }

    const updates: string[] = []
    const values: any[] = []
    let idx = 1

    for (const [key, col] of Object.entries(allowedFields)) {
      if (body[key] !== undefined) {
        updates.push(`${col} = $${idx++}`)
        values.push(body[key])
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)
    const result = await query(
      `UPDATE esim_plans SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, is_featured, is_staff_pick`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
