// Gift Card GDPR Compliance
// Data deletion and anonymization for user privacy

import { query } from '@/lib/db'
import { logAuditEvent } from './audit'

export interface DeletionResult {
  success: boolean
  deletedUserGiftCards: number
  anonymizedAuditLogs: number
  error?: string
}

/**
 * Delete all gift card data for a user (GDPR right to be forgotten)
 * This performs soft deletion and anonymization
 */
export async function deleteUserGiftCardData(
  userId: string,
  requestedBy: string,
  reason: string = 'GDPR data deletion request'
): Promise<DeletionResult> {
  try {
    // Start transaction
    await query('BEGIN')

    try {
      // 1. Soft delete user gift cards (anonymize the code)
      const userCardsResult = await query(
        `UPDATE user_gift_cards
         SET deleted_at = NOW(),
             deletion_reason = $2,
             code = 'DELETED',
             pin = NULL
         WHERE user_id = $1
           AND deleted_at IS NULL
         RETURNING id`,
        [userId, reason]
      )

      // 2. Anonymize audit logs (keep for security but remove user identification)
      const auditResult = await query(
        `UPDATE gift_card_audit_log
         SET user_id = NULL,
             ip_address = NULL,
             user_agent = NULL,
             metadata = jsonb_set(
               COALESCE(metadata, '{}')::jsonb,
               '{gdpr_anonymized}',
               'true'::jsonb
             )
         WHERE user_id = $1
         RETURNING id`,
        [userId]
      )

      // 3. Remove rate limit data
      await query(
        `DELETE FROM gift_card_rate_limits WHERE user_id = $1`,
        [userId]
      )

      await query(
        `DELETE FROM gift_card_rate_limit_log WHERE user_id = $1`,
        [userId]
      )

      // 4. Release any reserved codes back to inventory
      await query(
        `UPDATE gift_card_codes
         SET status = 'available',
             reserved_at = NULL,
             reserved_by = NULL,
             reservation_expires_at = NULL
         WHERE reserved_by = $1
           AND status = 'reserved'`,
        [userId]
      )

      // Commit transaction
      await query('COMMIT')

      // Log the deletion (with requestedBy, not userId)
      await logAuditEvent({
        userId: requestedBy,
        action: 'code_marked_redeemed', // Using existing type
        resourceType: 'user_gift_card',
        resourceId: userId, // Using userId as reference
        metadata: {
          action: 'gdpr_deletion',
          reason,
          deletedUserGiftCards: userCardsResult.rows.length,
          anonymizedAuditLogs: auditResult.rows.length
        }
      })

      return {
        success: true,
        deletedUserGiftCards: userCardsResult.rows.length,
        anonymizedAuditLogs: auditResult.rows.length
      }
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    console.error('Error deleting user gift card data:', error)
    return {
      success: false,
      deletedUserGiftCards: 0,
      anonymizedAuditLogs: 0,
      error: error.message
    }
  }
}

/**
 * Export all gift card data for a user (GDPR right to data portability)
 */
export async function exportUserGiftCardData(userId: string): Promise<{
  success: boolean
  data?: {
    giftCards: Array<{
      id: string
      brand: string
      denomination: number
      status: string
      purchaseDate: Date
      expiresAt?: Date
    }>
    totalSpent: number
    categories: string[]
  }
  error?: string
}> {
  try {
    // Get user gift cards (without actual codes for security)
    const result = await query(
      `SELECT
         id,
         brand,
         category,
         denomination,
         status,
         created_at as purchase_date,
         expires_at
       FROM user_gift_cards
       WHERE user_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    )

    const giftCards = result.rows.map(row => ({
      id: row.id,
      brand: row.brand,
      denomination: parseFloat(row.denomination),
      status: row.status,
      purchaseDate: row.purchase_date,
      expiresAt: row.expires_at
    }))

    const totalSpent = giftCards.reduce((sum, card) => sum + card.denomination, 0)
    const categories = [...new Set(result.rows.map(row => row.category).filter(Boolean))]

    return {
      success: true,
      data: {
        giftCards,
        totalSpent,
        categories
      }
    }
  } catch (error: any) {
    console.error('Error exporting user gift card data:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Anonymize old audit logs (for data retention compliance)
 * Keeps logs for security but removes PII after retention period
 */
export async function anonymizeOldAuditLogs(
  retentionDays: number = 90
): Promise<number> {
  try {
    const result = await query(
      `UPDATE gift_card_audit_log
       SET user_id = NULL,
           ip_address = NULL,
           user_agent = NULL,
           metadata = jsonb_set(
             COALESCE(metadata, '{}')::jsonb,
             '{retention_anonymized}',
             'true'::jsonb
           )
       WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
         AND user_id IS NOT NULL
       RETURNING id`
    )

    return result.rows.length
  } catch (error) {
    console.error('Error anonymizing old audit logs:', error)
    return 0
  }
}

/**
 * Permanently delete soft-deleted gift cards older than retention period
 */
export async function purgeDeletedGiftCards(
  retentionDays: number = 30
): Promise<number> {
  try {
    const result = await query(
      `DELETE FROM user_gift_cards
       WHERE deleted_at IS NOT NULL
         AND deleted_at < NOW() - INTERVAL '${retentionDays} days'
       RETURNING id`
    )

    return result.rows.length
  } catch (error) {
    console.error('Error purging deleted gift cards:', error)
    return 0
  }
}
