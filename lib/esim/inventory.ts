// eSIM Bulk Inventory Management
// Handles pre-purchased eSIMs for higher-margin sales

import { query } from '@/lib/db'
import { BulkEsimItem } from './types'

export class EsimInventoryService {
  /**
   * Check if we have bulk inventory available for a plan
   */
  async checkBulkAvailability(planId: string): Promise<boolean> {
    const result = await query(
      `
      SELECT COUNT(*) as count
      FROM esim_inventory
      WHERE plan_id = $1
        AND status = 'available'
        AND (expires_at IS NULL OR expires_at > NOW())
      `,
      [planId]
    )
    return parseInt(result.rows[0]?.count || '0') > 0
  }

  /**
   * Get available bulk count for a plan
   */
  async getAvailableCount(planId: string): Promise<number> {
    const result = await query(
      `
      SELECT COUNT(*) as count
      FROM esim_inventory
      WHERE plan_id = $1
        AND status = 'available'
        AND (expires_at IS NULL OR expires_at > NOW())
      `,
      [planId]
    )
    return parseInt(result.rows[0]?.count || '0')
  }

  /**
   * Reserve a bulk eSIM for purchase
   * Uses database transaction to prevent race conditions
   */
  async reserveBulkEsim(planId: string, orderId: string): Promise<BulkEsimItem | null> {
    // Use FOR UPDATE SKIP LOCKED to prevent race conditions
    const result = await query(
      `
      UPDATE esim_inventory
      SET status = 'reserved',
          order_id = $2,
          reserved_at = NOW(),
          updated_at = NOW()
      WHERE id = (
        SELECT id FROM esim_inventory
        WHERE plan_id = $1
          AND status = 'available'
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
      `,
      [planId, orderId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      planId: row.plan_id,
      iccid: row.iccid,
      matchingId: row.matching_id,
      smdpAddress: row.smdp_address,
      qrCodeData: row.qr_code_data,
      activationCode: row.activation_code,
      status: row.status,
      costPrice: parseFloat(row.cost_price) || 0,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    }
  }

  /**
   * Complete the sale of a bulk eSIM
   */
  async completeBulkSale(
    inventoryId: string,
    userId: string,
    orderItemId?: string
  ): Promise<boolean> {
    const result = await query(
      `
      UPDATE esim_inventory
      SET status = 'sold',
          sold_to_user_id = $2,
          order_item_id = $3,
          sold_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND status = 'reserved'
      RETURNING id
      `,
      [inventoryId, userId, orderItemId]
    )
    return result.rows.length > 0
  }

  /**
   * Release a reserved eSIM (if payment fails)
   */
  async releaseReservation(orderId: string): Promise<number> {
    const result = await query(
      `
      UPDATE esim_inventory
      SET status = 'available',
          order_id = NULL,
          reserved_at = NULL,
          updated_at = NOW()
      WHERE order_id = $1 AND status = 'reserved'
      `,
      [orderId]
    )
    return result.rowCount || 0
  }

  /**
   * Release stale reservations (older than 15 minutes)
   * Should be called by a cron job
   */
  async releaseStaleReservations(): Promise<number> {
    const result = await query(
      `
      UPDATE esim_inventory
      SET status = 'available',
          order_id = NULL,
          reserved_at = NULL,
          updated_at = NOW()
      WHERE status = 'reserved'
        AND reserved_at < NOW() - INTERVAL '15 minutes'
      `
    )
    return result.rowCount || 0
  }

  /**
   * Get bulk eSIM by ID
   */
  async getBulkEsim(inventoryId: string): Promise<BulkEsimItem | null> {
    const result = await query(
      `SELECT * FROM esim_inventory WHERE id = $1`,
      [inventoryId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      planId: row.plan_id,
      iccid: row.iccid,
      matchingId: row.matching_id,
      smdpAddress: row.smdp_address,
      qrCodeData: row.qr_code_data,
      activationCode: row.activation_code,
      status: row.status,
      costPrice: parseFloat(row.cost_price) || 0,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    }
  }

  /**
   * Add bulk eSIM to inventory (admin function)
   */
  async addToInventory(
    planId: string,
    esimData: {
      iccid: string
      matchingId: string
      smdpAddress: string
      qrCodeData: string
      activationCode?: string
      costPrice: number
      expiresAt?: Date
      batchId?: string
      sourceProvider?: string
      providerEsimId?: string
    }
  ): Promise<string> {
    const result = await query(
      `
      INSERT INTO esim_inventory (
        plan_id, iccid, matching_id, smdp_address, qr_code_data,
        activation_code, cost_price, expires_at, batch_id,
        source_provider, provider_esim_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'available')
      RETURNING id
      `,
      [
        planId,
        esimData.iccid,
        esimData.matchingId,
        esimData.smdpAddress,
        esimData.qrCodeData,
        esimData.activationCode,
        esimData.costPrice,
        esimData.expiresAt,
        esimData.batchId,
        esimData.sourceProvider,
        esimData.providerEsimId,
      ]
    )
    return result.rows[0].id
  }

  /**
   * Bulk import eSIMs (admin function)
   */
  async bulkImport(
    planId: string,
    esims: Array<{
      iccid: string
      matchingId: string
      smdpAddress: string
      qrCodeData: string
      activationCode?: string
      costPrice: number
      expiresAt?: Date
    }>,
    batchId: string,
    sourceProvider?: string
  ): Promise<{ success: number; duplicates: number; errors: string[] }> {
    const results = { success: 0, duplicates: 0, errors: [] as string[] }

    for (const esim of esims) {
      try {
        // Check for duplicate ICCID
        const existing = await query(
          `SELECT id FROM esim_inventory WHERE iccid = $1`,
          [esim.iccid]
        )

        if (existing.rows.length > 0) {
          results.duplicates++
          continue
        }

        await this.addToInventory(planId, {
          ...esim,
          batchId,
          sourceProvider,
        })
        results.success++
      } catch (error: any) {
        results.errors.push(`${esim.iccid}: ${error.message}`)
      }
    }

    return results
  }

  /**
   * Get inventory stats by plan
   */
  async getInventoryStats(): Promise<
    Array<{
      planId: string
      planName: string
      available: number
      reserved: number
      sold: number
      expired: number
    }>
  > {
    const result = await query(
      `
      SELECT
        ep.id as plan_id,
        ep.name as plan_name,
        COUNT(*) FILTER (WHERE ei.status = 'available') as available,
        COUNT(*) FILTER (WHERE ei.status = 'reserved') as reserved,
        COUNT(*) FILTER (WHERE ei.status = 'sold') as sold,
        COUNT(*) FILTER (WHERE ei.status = 'expired' OR (ei.expires_at IS NOT NULL AND ei.expires_at < NOW())) as expired
      FROM esim_plans ep
      LEFT JOIN esim_inventory ei ON ep.id = ei.plan_id
      GROUP BY ep.id, ep.name
      ORDER BY ep.name
      `
    )

    return result.rows.map((row) => ({
      planId: row.plan_id,
      planName: row.plan_name,
      available: parseInt(row.available) || 0,
      reserved: parseInt(row.reserved) || 0,
      sold: parseInt(row.sold) || 0,
      expired: parseInt(row.expired) || 0,
    }))
  }
}

export const esimInventoryService = new EsimInventoryService()
