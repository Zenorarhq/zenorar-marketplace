// Gift Card Audit Logging
// Tracks all access and operations on gift card codes

import { query } from '@/lib/db'

export type AuditAction =
  | 'code_revealed'
  | 'code_copied'
  | 'code_reserved'
  | 'code_released'
  | 'code_sold'
  | 'code_refunded'
  | 'code_imported'
  | 'code_marked_redeemed'
  | 'admin_view_code'
  | 'support_view_code'
  | 'support_replace_code'

export interface AuditLogEntry {
  id: string
  userId: string
  action: AuditAction
  resourceType: 'gift_card_code' | 'user_gift_card'
  resourceId: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

/**
 * Log an audit event for gift card operations
 */
export async function logAuditEvent(params: {
  userId: string
  action: AuditAction
  resourceType: 'gift_card_code' | 'user_gift_card'
  resourceId: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  try {
    await query(
      `INSERT INTO gift_card_audit_log
         (user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId,
        params.action,
        params.resourceType,
        params.resourceId,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ipAddress || null,
        params.userAgent || null
      ]
    )
  } catch (error) {
    // Log to console but don't fail the operation
    console.error('Failed to log gift card audit event:', error)
  }
}

/**
 * Get audit log for a specific resource
 */
export async function getAuditLog(params: {
  resourceType?: 'gift_card_code' | 'user_gift_card'
  resourceId?: string
  userId?: string
  action?: AuditAction
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}): Promise<{ entries: AuditLogEntry[]; total: number }> {
  try {
    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (params.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`)
      values.push(params.resourceType)
    }

    if (params.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`)
      values.push(params.resourceId)
    }

    if (params.userId) {
      conditions.push(`user_id = $${paramIndex++}`)
      values.push(params.userId)
    }

    if (params.action) {
      conditions.push(`action = $${paramIndex++}`)
      values.push(params.action)
    }

    if (params.fromDate) {
      conditions.push(`created_at >= $${paramIndex++}`)
      values.push(params.fromDate)
    }

    if (params.toDate) {
      conditions.push(`created_at <= $${paramIndex++}`)
      values.push(params.toDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = params.limit || 50
    const offset = params.offset || 0

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM gift_card_audit_log ${whereClause}`,
      values
    )

    // Get entries
    const result = await query(
      `SELECT * FROM gift_card_audit_log
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    )

    return {
      entries: result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at
      })),
      total: parseInt(countResult.rows[0]?.total || '0')
    }
  } catch (error) {
    console.error('Failed to get gift card audit log:', error)
    return { entries: [], total: 0 }
  }
}

/**
 * Get audit summary for a user (for suspicious activity detection)
 */
export async function getUserAuditSummary(
  userId: string,
  hours: number = 24
): Promise<{
  codeReveals: number
  codeCopies: number
  totalActions: number
}> {
  try {
    const result = await query(
      `SELECT
         action,
         COUNT(*) as count
       FROM gift_card_audit_log
       WHERE user_id = $1
         AND created_at > NOW() - INTERVAL '${hours} hours'
       GROUP BY action`,
      [userId]
    )

    const counts: Record<string, number> = {}
    let totalActions = 0

    for (const row of result.rows) {
      counts[row.action] = parseInt(row.count)
      totalActions += parseInt(row.count)
    }

    return {
      codeReveals: counts['code_revealed'] || 0,
      codeCopies: counts['code_copied'] || 0,
      totalActions
    }
  } catch (error) {
    console.error('Failed to get user audit summary:', error)
    return { codeReveals: 0, codeCopies: 0, totalActions: 0 }
  }
}
