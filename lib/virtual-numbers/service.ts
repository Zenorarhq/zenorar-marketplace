// Virtual Numbers Service - Business Logic

import { query } from '@/lib/db'
import { twilioService } from './providers/twilio'

export interface ProvisionResult {
  success: boolean
  userVirtualNumberId?: string
  phoneNumber?: string
  phoneNumberDisplay?: string
  error?: string
}

class VirtualNumberService {
  /**
   * Provision a virtual number for a user after payment
   */
  async provisionNumber(
    userId: string,
    countryId: string,
    planId: string,
    phoneNumber: string,
    orderId: string,
    numberType: string = 'local'
  ): Promise<ProvisionResult> {
    try {
      // Get country details
      const countryResult = await query(
        `SELECT * FROM virtual_number_countries WHERE id = $1`,
        [countryId]
      )

      if (countryResult.rows.length === 0) {
        return { success: false, error: 'Country not found' }
      }

      const country = countryResult.rows[0]

      // Get plan details
      const planResult = await query(
        `SELECT * FROM virtual_number_plans WHERE id = $1`,
        [planId]
      )

      if (planResult.rows.length === 0) {
        return { success: false, error: 'Plan not found' }
      }

      const plan = planResult.rows[0]

      // Log provision attempt
      const logResult = await query(
        `INSERT INTO virtual_number_provision_log
           (user_id, order_id, country_id, plan_id, phone_number, provider, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id`,
        [userId, orderId, countryId, planId, phoneNumber, country.provider]
      )
      const provisionLogId = logResult.rows[0].id

      // Attempt to purchase from provider
      let providerResult
      if (country.provider === 'twilio') {
        providerResult = await twilioService.purchaseNumber(phoneNumber)
      } else {
        // Default to mock for development
        providerResult = {
          success: true,
          numberSid: `PN${Date.now()}`,
          phoneNumber: phoneNumber
        }
      }

      if (!providerResult.success) {
        // Update log with failure
        await query(
          `UPDATE virtual_number_provision_log
           SET status = 'failed', error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          [providerResult.error, provisionLogId]
        )

        return { success: false, error: providerResult.error }
      }

      // Calculate expiry
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + plan.duration_days)

      // Create user virtual number record
      const displayNumber = this.formatPhoneNumber(phoneNumber, country.iso_code)

      const insertResult = await query(
        `INSERT INTO user_virtual_numbers
           (user_id, plan_id, country_id, phone_number, phone_number_display, number_type,
            provider, provider_number_sid, status, order_id, expires_at, next_billing_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $10)
         RETURNING id`,
        [
          userId, planId, countryId, phoneNumber, displayNumber, numberType,
          country.provider, providerResult.numberSid, orderId, expiresAt
        ]
      )

      const userVirtualNumberId = insertResult.rows[0].id

      // Update provision log
      await query(
        `UPDATE virtual_number_provision_log
         SET status = 'success', user_virtual_number_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [userVirtualNumberId, provisionLogId]
      )

      return {
        success: true,
        userVirtualNumberId,
        phoneNumber,
        phoneNumberDisplay: displayNumber
      }
    } catch (error: any) {
      console.error('Error provisioning virtual number:', error)
      return { success: false, error: error.message || 'Provisioning failed' }
    }
  }

  /**
   * Cancel/release a virtual number
   */
  async cancelNumber(userVirtualNumberId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get number details
      const numberResult = await query(
        `SELECT * FROM user_virtual_numbers WHERE id = $1 AND user_id = $2`,
        [userVirtualNumberId, userId]
      )

      if (numberResult.rows.length === 0) {
        return { success: false, error: 'Virtual number not found' }
      }

      const virtualNumber = numberResult.rows[0]

      // Release from provider if configured
      if (virtualNumber.provider === 'twilio' && virtualNumber.provider_number_sid) {
        const releaseResult = await twilioService.releaseNumber(virtualNumber.provider_number_sid)
        if (!releaseResult.success) {
          console.warn('Failed to release from provider:', releaseResult.error)
          // Continue with local cancellation anyway
        }
      }

      // Update status
      await query(
        `UPDATE user_virtual_numbers
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [userVirtualNumberId]
      )

      return { success: true }
    } catch (error: any) {
      console.error('Error cancelling virtual number:', error)
      return { success: false, error: error.message || 'Cancellation failed' }
    }
  }

  /**
   * Handle incoming SMS webhook
   */
  async handleIncomingSms(
    to: string,
    from: string,
    body: string,
    messageSid: string,
    mediaUrls?: string[]
  ): Promise<{ success: boolean; forwarded?: boolean }> {
    try {
      // Find the virtual number
      const numberResult = await query(
        `SELECT uvn.*, u.email as user_email
         FROM user_virtual_numbers uvn
         LEFT JOIN users u ON uvn.user_id = u.id
         WHERE uvn.phone_number = $1 AND uvn.status = 'active'`,
        [to]
      )

      if (numberResult.rows.length === 0) {
        console.warn('Received SMS for unknown number:', to)
        return { success: false }
      }

      const virtualNumber = numberResult.rows[0]

      // Log the message
      await query(
        `INSERT INTO virtual_number_messages
           (virtual_number_id, user_id, direction, from_number, to_number, body, media_urls, provider_message_sid, status)
         VALUES ($1, $2, 'inbound', $3, $4, $5, $6, $7, 'delivered')`,
        [virtualNumber.id, virtualNumber.user_id, from, to, body, mediaUrls || null, messageSid]
      )

      // Update counters
      await query(
        `UPDATE user_virtual_numbers
         SET sms_received_count = sms_received_count + 1,
             current_period_sms = current_period_sms + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [virtualNumber.id]
      )

      // Forward if configured
      let forwarded = false
      if (virtualNumber.sms_forwarding_enabled && virtualNumber.sms_forward_email) {
        // TODO: Send email notification
        // await emailService.sendSmsForwardingEmail(...)
        forwarded = true
      }

      return { success: true, forwarded }
    } catch (error) {
      console.error('Error handling incoming SMS:', error)
      return { success: false }
    }
  }

  /**
   * Expire virtual numbers that have passed their expiry date
   */
  async expireNumbers(): Promise<{ expired: number; released: number }> {
    let expired = 0
    let released = 0

    try {
      // Get expired numbers
      const expiredResult = await query(
        `SELECT * FROM user_virtual_numbers
         WHERE status = 'active' AND expires_at < NOW()`
      )

      for (const number of expiredResult.rows) {
        // Release from provider
        if (number.provider === 'twilio' && number.provider_number_sid) {
          const releaseResult = await twilioService.releaseNumber(number.provider_number_sid)
          if (releaseResult.success) {
            released++
          }
        }

        // Update status
        await query(
          `UPDATE user_virtual_numbers
           SET status = 'expired', updated_at = NOW()
           WHERE id = $1`,
          [number.id]
        )

        expired++

        // TODO: Send expiry notification email
      }
    } catch (error) {
      console.error('Error expiring numbers:', error)
    }

    return { expired, released }
  }

  /**
   * Format phone number for display
   */
  private formatPhoneNumber(phone: string, countryCode: string): string {
    const cleaned = phone.replace(/\D/g, '')

    if (countryCode === 'US' || countryCode === 'CA') {
      // +1 (XXX) XXX-XXXX
      if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
      }
    }

    if (countryCode === 'GB') {
      // +44 XXX XXXX XXXX
      if (cleaned.startsWith('44')) {
        return `+44 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`
      }
    }

    return phone
  }
}

export const virtualNumberService = new VirtualNumberService()
