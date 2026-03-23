import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Temporary debug endpoint — lists all categories directly from DB
export async function GET() {
  try {
    const result = await query(`
      SELECT id, name, slug, icon, "parentId", "order", "isActive"
      FROM categories
      ORDER BY "order" ASC NULLS LAST, name ASC
    `)
    return NextResponse.json({ count: result.rows.length, rows: result.rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
