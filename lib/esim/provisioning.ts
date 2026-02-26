// eSIM Provisioning Service
// Handles the full provisioning flow: Bulk first, then API with fallback

import { query } from '@/lib/db'
import { ProvisioningResult } from './types'
import { esimInventoryService } from './inventory'
import { EsimProviderFactory } from './provider-factory'

export class EsimProvisioningService {
  /**
   * Provision an eSIM for a user
   * Priority: 1. Bulk inventory (higher margin) 2. API providers with fallback
   */
  async provisionEsim(
    userId: string,
    planId: string,
    orderId: string,
    orderItemId?: string
  ): Promise<ProvisioningResult> {
    // Log the provisioning attempt
    const logId = await this.createProvisionLog(planId, orderId, orderItemId, userId)

    try {
      // Step 1: Try bulk inventory first (higher margin)
      const bulkResult = await this.tryBulkProvisioning(
        userId,
        planId,
        orderId,
        orderItemId
      )

      if (bulkResult.success) {
        await this.updateProvisionLog(logId, 'success', 'bulk', bulkResult.userEsimId)
        return bulkResult
      }

      // Step 2: Fall back to API providers
      const apiResult = await this.tryApiProvisioning(
        userId,
        planId,
        orderId,
        orderItemId
      )

      if (apiResult.success) {
        await this.updateProvisionLog(logId, 'success', 'api', apiResult.userEsimId, apiResult.providerId)
        return apiResult
      }

      // All methods failed
      await this.updateProvisionLog(logId, 'failed', 'api', undefined, undefined, apiResult.error)
      return apiResult
    } catch (error: any) {
      await this.updateProvisionLog(logId, 'failed', 'api', undefined, undefined, error.message)
      return {
        success: false,
        sourceType: 'api',
        error: error.message,
      }
    }
  }

  /**
   * Try to provision from bulk inventory
   */
  private async tryBulkProvisioning(
    userId: string,
    planId: string,
    orderId: string,
    orderItemId?: string
  ): Promise<ProvisioningResult> {
    // Check if bulk inventory is available
    const hasBulk = await esimInventoryService.checkBulkAvailability(planId)

    if (!hasBulk) {
      return {
        success: false,
        sourceType: 'bulk',
        error: 'No bulk inventory available',
      }
    }

    // Reserve a bulk eSIM
    const bulkEsim = await esimInventoryService.reserveBulkEsim(planId, orderId)

    if (!bulkEsim) {
      return {
        success: false,
        sourceType: 'bulk',
        error: 'Failed to reserve bulk eSIM',
      }
    }

    // Complete the sale
    await esimInventoryService.completeBulkSale(bulkEsim.id, userId, orderItemId)

    // Create user_esims record
    const userEsimId = await this.createUserEsim({
      userId,
      planId,
      orderId,
      orderItemId,
      sourceType: 'bulk',
      inventoryId: bulkEsim.id,
      iccid: bulkEsim.iccid,
      matchingId: bulkEsim.matchingId,
      smdpAddress: bulkEsim.smdpAddress,
      qrCodeData: bulkEsim.qrCodeData,
      activationCode: bulkEsim.activationCode,
      expiresAt: bulkEsim.expiresAt,
    })

    return {
      success: true,
      sourceType: 'bulk',
      userEsimId,
      qrCodeData: bulkEsim.qrCodeData,
      iccid: bulkEsim.iccid,
    }
  }

  /**
   * Try to provision from API providers with fallback
   */
  private async tryApiProvisioning(
    userId: string,
    planId: string,
    orderId: string,
    orderItemId?: string
  ): Promise<ProvisioningResult> {
    // Get the plan to find the provider plan ID
    const planResult = await query(
      `
      SELECT ep.*, epr.slug as provider_slug
      FROM esim_plans ep
      LEFT JOIN esim_providers epr ON ep.provider_id = epr.id
      WHERE ep.id = $1
      `,
      [planId]
    )

    if (planResult.rows.length === 0) {
      return {
        success: false,
        sourceType: 'api',
        error: 'Plan not found',
      }
    }

    const plan = planResult.rows[0]
    const providerPlanId = plan.provider_plan_id

    if (!providerPlanId) {
      return {
        success: false,
        sourceType: 'api',
        error: 'Plan has no provider mapping',
      }
    }

    // Order from API with fallback
    const result = await EsimProviderFactory.orderWithFallback(
      providerPlanId,
      orderId,
      plan.provider_slug
    )

    if (!result.success) {
      return {
        success: false,
        sourceType: 'api',
        error: result.error,
      }
    }

    // Get provider ID from database
    const providerResult = await query(
      `SELECT id FROM esim_providers WHERE slug = $1`,
      [result.providerUsed]
    )
    const providerId = providerResult.rows[0]?.id

    // Calculate expiry based on plan validity
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (plan.validity_days || 30))

    // Create user_esims record
    const userEsimId = await this.createUserEsim({
      userId,
      planId,
      orderId,
      orderItemId,
      sourceType: 'api',
      providerId,
      providerOrderId: result.providerOrderId,
      providerEsimId: result.providerEsimId,
      iccid: result.iccid,
      matchingId: result.matchingId,
      smdpAddress: result.smdpAddress,
      qrCodeData: result.qrCodeData,
      qrCodeUrl: result.qrCodeUrl,
      activationCode: result.activationCode,
      expiresAt: result.expiresAt || expiresAt,
    })

    return {
      success: true,
      sourceType: 'api',
      providerId,
      userEsimId,
      qrCodeData: result.qrCodeData,
      iccid: result.iccid,
    }
  }

  /**
   * Create user_esims record
   */
  private async createUserEsim(data: {
    userId: string
    planId: string
    orderId: string
    orderItemId?: string
    sourceType: 'bulk' | 'api'
    inventoryId?: string
    providerId?: string
    providerOrderId?: string
    providerEsimId?: string
    iccid: string
    matchingId: string
    smdpAddress: string
    qrCodeData: string
    qrCodeUrl?: string
    activationCode?: string
    expiresAt?: Date
  }): Promise<string> {
    // Get plan details for data amount
    const planResult = await query(
      `SELECT data_amount_gb FROM esim_plans WHERE id = $1`,
      [data.planId]
    )
    const dataRemainingMb = (planResult.rows[0]?.data_amount_gb || 0) * 1024

    // Generate installation instructions
    const installationManual = this.generateInstallationInstructions(data)

    const result = await query(
      `
      INSERT INTO user_esims (
        user_id, plan_id, order_id, order_item_id,
        source_type, inventory_id, provider_id,
        provider_order_id, provider_esim_id,
        iccid, matching_id, smdp_address,
        qr_code_data, qr_code_url, activation_code,
        installation_manual,
        status, expires_at, data_remaining_mb,
        delivered_at, delivery_method
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        'active', $17, $18, NOW(), 'both'
      )
      RETURNING id
      `,
      [
        data.userId,
        data.planId,
        data.orderId,
        data.orderItemId,
        data.sourceType,
        data.inventoryId,
        data.providerId,
        data.providerOrderId,
        data.providerEsimId,
        data.iccid,
        data.matchingId,
        data.smdpAddress,
        data.qrCodeData,
        data.qrCodeUrl,
        data.activationCode,
        JSON.stringify(installationManual),
        data.expiresAt,
        dataRemainingMb,
      ]
    )

    return result.rows[0].id
  }

  /**
   * Generate installation instructions for iOS and Android
   */
  private generateInstallationInstructions(data: {
    smdpAddress: string
    matchingId: string
  }) {
    return {
      ios: {
        automatic: [
          'Go to Settings > Cellular/Mobile Data',
          'Tap "Add eSIM" or "Add Cellular Plan"',
          'Tap "Use QR Code"',
          'Scan the QR code shown above',
          'Wait for the eSIM to download and install',
        ],
        manual: [
          'Go to Settings > Cellular/Mobile Data',
          'Tap "Add eSIM" or "Add Cellular Plan"',
          'Tap "Enter Details Manually"',
          `SM-DP+ Address: ${data.smdpAddress}`,
          `Activation Code: ${data.matchingId}`,
          'Tap "Next" and wait for installation',
        ],
      },
      android: {
        automatic: [
          'Go to Settings > Network & Internet > SIMs',
          'Tap "+" or "Add" to add a new SIM',
          'Select "Download a SIM instead"',
          'Scan the QR code when prompted',
          'Wait for the eSIM to activate',
        ],
        manual: [
          'Go to Settings > Network & Internet > SIMs',
          'Tap "+" to add a new SIM',
          'Select "Download a SIM instead"',
          'Tap "Need help?" or "Enter code manually"',
          `Enter: ${data.smdpAddress}$${data.matchingId}`,
          'Wait for activation',
        ],
      },
    }
  }

  /**
   * Create provision log entry
   */
  private async createProvisionLog(
    planId: string,
    orderId: string,
    orderItemId: string | undefined,
    userId: string
  ): Promise<string> {
    const result = await query(
      `
      INSERT INTO esim_provision_log (plan_id, order_id, order_item_id, user_id, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id
      `,
      [planId, orderId, orderItemId, userId]
    )
    return result.rows[0].id
  }

  /**
   * Update provision log entry
   */
  private async updateProvisionLog(
    logId: string,
    status: 'success' | 'failed',
    attemptType: 'bulk' | 'api',
    userEsimId?: string,
    providerId?: string,
    errorMessage?: string
  ): Promise<void> {
    await query(
      `
      UPDATE esim_provision_log
      SET status = $2,
          attempt_type = $3,
          user_esim_id = $4,
          provider_id = $5,
          error_message = $6,
          updated_at = NOW()
      WHERE id = $1
      `,
      [logId, status, attemptType, userEsimId, providerId, errorMessage]
    )
  }

  /**
   * Retry failed provisions
   * Should be called by a cron job
   */
  async retryFailedProvisions(): Promise<{
    retried: number
    succeeded: number
    failed: number
  }> {
    const results = { retried: 0, succeeded: 0, failed: 0 }

    // Get failed provisions from last 24 hours with retry count < 3
    const failedResult = await query(
      `
      SELECT pl.*, o.user_id
      FROM esim_provision_log pl
      JOIN orders o ON pl.order_id = o.id
      WHERE pl.status = 'failed'
        AND pl.retry_count < 3
        AND pl.created_at > NOW() - INTERVAL '24 hours'
      `
    )

    for (const log of failedResult.rows) {
      results.retried++

      try {
        const result = await this.provisionEsim(
          log.user_id,
          log.plan_id,
          log.order_id,
          log.order_item_id
        )

        if (result.success) {
          results.succeeded++
        } else {
          results.failed++
          await query(
            `UPDATE esim_provision_log SET retry_count = retry_count + 1 WHERE id = $1`,
            [log.id]
          )
        }
      } catch {
        results.failed++
        await query(
          `UPDATE esim_provision_log SET retry_count = retry_count + 1 WHERE id = $1`,
          [log.id]
        )
      }
    }

    return results
  }

  /**
   * Get user's eSIMs
   */
  async getUserEsims(userId: string) {
    const result = await query(
      `
      SELECT
        ue.*,
        ep.name as plan_name,
        ep.data_amount_display,
        ep.validity_days,
        ep.countries,
        er.name as region_name,
        er.slug as region_slug
      FROM user_esims ue
      JOIN esim_plans ep ON ue.plan_id = ep.id
      LEFT JOIN esim_regions er ON ep.region_id = er.id
      WHERE ue.user_id = $1
      ORDER BY ue.created_at DESC
      `,
      [userId]
    )

    return result.rows.map((row) => ({
      id: row.id,
      planId: row.plan_id,
      planName: row.plan_name,
      dataAmountDisplay: row.data_amount_display,
      validityDays: row.validity_days,
      countries: row.countries,
      regionName: row.region_name,
      regionSlug: row.region_slug,
      iccid: row.iccid,
      qrCodeData: row.qr_code_data,
      qrCodeUrl: row.qr_code_url,
      status: row.status,
      dataUsedMb: parseFloat(row.data_used_mb) || 0,
      dataRemainingMb: parseFloat(row.data_remaining_mb) || 0,
      expiresAt: row.expires_at,
      installedAt: row.installed_at,
      installationManual: row.installation_manual,
      createdAt: row.created_at,
    }))
  }

  /**
   * Get single user eSIM by ID
   */
  async getUserEsim(esimId: string, userId: string) {
    const result = await query(
      `
      SELECT
        ue.*,
        ep.name as plan_name,
        ep.data_amount_display,
        ep.validity_days,
        ep.countries,
        er.name as region_name,
        er.slug as region_slug
      FROM user_esims ue
      JOIN esim_plans ep ON ue.plan_id = ep.id
      LEFT JOIN esim_regions er ON ep.region_id = er.id
      WHERE ue.id = $1 AND ue.user_id = $2
      `,
      [esimId, userId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      planId: row.plan_id,
      planName: row.plan_name,
      dataAmountDisplay: row.data_amount_display,
      validityDays: row.validity_days,
      countries: row.countries,
      regionName: row.region_name,
      regionSlug: row.region_slug,
      iccid: row.iccid,
      matchingId: row.matching_id,
      smdpAddress: row.smdp_address,
      qrCodeData: row.qr_code_data,
      qrCodeUrl: row.qr_code_url,
      activationCode: row.activation_code,
      status: row.status,
      dataUsedMb: parseFloat(row.data_used_mb) || 0,
      dataRemainingMb: parseFloat(row.data_remaining_mb) || 0,
      expiresAt: row.expires_at,
      installedAt: row.installed_at,
      installationManual: row.installation_manual,
      createdAt: row.created_at,
    }
  }
}

export const esimProvisioningService = new EsimProvisioningService()
