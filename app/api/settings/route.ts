export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

/**
 * GET /api/settings
 * Get all settings grouped by category (admin only)
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

    // Get all settings grouped
    const result = await query(
      `SELECT key, value, "group", description, "isPublic"
       FROM site_settings
       ORDER BY "group", key`
    )

    // Group settings by their group
    const grouped: Record<string, Record<string, any>> = {}
    for (const row of result.rows) {
      if (!grouped[row.group]) {
        grouped[row.group] = {}
      }
      // Parse JSON values
      let parsedValue = row.value
      try {
        parsedValue = JSON.parse(row.value)
      } catch {
        // Keep original value if not valid JSON
      }
      grouped[row.group][row.key] = {
        value: parsedValue,
        description: row.description,
        isPublic: row.isPublic
      }
    }

    return NextResponse.json({ success: true, data: grouped })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings
 * Update multiple settings at once (admin only)
 */
export async function PUT(request: NextRequest) {
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
    const { settings } = body

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: 'Settings must be an array' },
        { status: 400 }
      )
    }

    // Upsert each setting
    for (const setting of settings) {
      const { key, value, group = 'general', isPublic = false } = setting

      if (!key) continue

      // Serialize value to JSON for storage
      const serializedValue = JSON.stringify(value)

      await query(
        `INSERT INTO site_settings (key, value, "group", "isPublic", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (key) DO UPDATE SET
           value = $2,
           "group" = $3,
           "isPublic" = $4,
           "updatedAt" = NOW()`,
        [key, serializedValue, group, isPublic]
      )
    }

    // Return updated settings grouped
    const result = await query(
      `SELECT key, value, "group", description, "isPublic"
       FROM site_settings
       ORDER BY "group", key`
    )

    const grouped: Record<string, Record<string, any>> = {}
    for (const row of result.rows) {
      if (!grouped[row.group]) {
        grouped[row.group] = {}
      }
      let parsedValue = row.value
      try {
        parsedValue = JSON.parse(row.value)
      } catch {
        // Keep original value
      }
      grouped[row.group][row.key] = parsedValue
    }

    return NextResponse.json({ success: true, data: grouped })
  } catch (error: any) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
}
