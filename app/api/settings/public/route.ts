export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/settings/public
 * Get public settings without authentication
 *
 * Query params:
 *   - keys: comma-separated list of specific keys to fetch (optional)
 *   - group: filter by group (optional)
 *
 * Only returns settings with isPublic = true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keys = searchParams.get('keys')?.split(',').filter(Boolean)
    const group = searchParams.get('group')

    let sql = `SELECT key, value, "group"
               FROM site_settings
               WHERE "isPublic" = true`
    const params: any[] = []

    // Filter by specific keys if provided
    if (keys && keys.length > 0) {
      sql += ` AND key = ANY($${params.length + 1})`
      params.push(keys)
    }

    // Filter by group if provided
    if (group) {
      sql += ` AND "group" = $${params.length + 1}`
      params.push(group)
    }

    sql += ' ORDER BY key'

    const result = await query(sql, params)

    // Parse values and return as flat object
    const settings: Record<string, any> = {}
    for (const row of result.rows) {
      let parsedValue = row.value
      try {
        parsedValue = JSON.parse(row.value)
      } catch {
        // Keep original value if not valid JSON
      }
      settings[row.key] = parsedValue
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error: any) {
    console.error('Error fetching public settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}
