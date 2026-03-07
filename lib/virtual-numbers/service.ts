// Virtual Numbers Service - Business Logic

import { query } from '@/lib/db'
import { twilioService } from './providers/twilio'
import { inventoryService } from './inventory'
import { sendSmsForwardingEmail } from '@/lib/email-service'

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
   * Uses inventory system: checks inventory first, buys from Twilio if needed
   */
  async provisionNumber(
    userId: string,
    countryId: string,
    planId: string,
    phoneNumber: string,
    orderId: string,
    numberType: string = 'local',
    amountPaid: number = 0,
    minuteTier?: string,
    minuteTierPrice?: number,
    durationDaysOverride?: number,
    smsLimit?: number,
    minuteIncluded?: number
  ): Promise<ProvisionResult> {
    try {
      // Get plan details to determine duration
      let durationDays = durationDaysOverride || 30 // use override if provided

      if (!durationDaysOverride) {
        const planResult = await query(
          `SELECT duration_days FROM virtual_number_plans WHERE id = $1`,
          [planId]
        )

        if (planResult.rows.length > 0) {
          durationDays = planResult.rows[0].duration_days
        } else {
          // Handle dynamic plans (basic/business with custom duration)
          if (planId === 'basic' || planId === 'business') {
            // Default to 7 days if no override provided
            durationDays = 7
          }
        }
      }

      // Use inventory service to rent the number
      const rentResult = await inventoryService.rentNumber({
        phoneNumber,
        userId,
        planId,
        durationDays,
        amountPaid,
        minuteTier,
        minuteTierPrice
      })

      if (!rentResult.success) {
        return { success: false, error: rentResult.error }
      }

      // Get inventory details including provider info
      const inventoryResult = await query(
        `SELECT provider, provider_number_sid FROM virtual_number_inventory WHERE id = $1`,
        [rentResult.inventoryId]
      )
      const providerInfo = inventoryResult.rows[0] || {}
      const provider = providerInfo.provider || 'twilio'
      const providerNumberSid = providerInfo.provider_number_sid || null

      // Get country details for display formatting
      const countryResult = await query(
        `SELECT iso_code FROM virtual_number_countries WHERE id = $1`,
        [countryId]
      )
      const countryCode = countryResult.rows[0]?.iso_code || 'US'
      const displayNumber = this.formatPhoneNumber(phoneNumber, countryCode)

      // Check if user already has this number (prevent duplicates)
      const existingResult = await query(
        `SELECT id FROM user_virtual_numbers WHERE phone_number = $1 AND user_id = $2`,
        [phoneNumber, userId]
      )

      let userVirtualNumberId: string

      // Determine plan category from planId
      const planCategory = planId === 'business' ? 'business' : 'basic'

      if (existingResult.rows.length > 0) {
        // Update existing record
        userVirtualNumberId = existingResult.rows[0].id
        await query(
          `UPDATE user_virtual_numbers SET
             status = 'active',
             plan_id = $1,
             plan_category = $2,
             plan_duration_days = $3,
             sms_limit = $4,
             minute_tier = $5,
             minute_included = $6,
             expires_at = $7,
             order_id = $8,
             inventory_id = $9,
             provider = $10,
             provider_number_sid = $11,
             updated_at = NOW()
           WHERE id = $12`,
          [planId, planCategory, durationDays, smsLimit || 100, minuteTier, minuteIncluded || 0,
           rentResult.expiresAt, orderId, rentResult.inventoryId, provider, providerNumberSid, userVirtualNumberId]
        )
      } else {
        // Create new user virtual number record
        const insertResult = await query(
          `INSERT INTO user_virtual_numbers
             (id, user_id, plan_id, plan_category, plan_duration_days, sms_limit, minute_tier, minute_included,
              country_id, phone_number, phone_number_display, number_type,
              provider, provider_number_sid, status, order_id, expires_at, next_billing_at,
              inventory_id, created_at, updated_at)
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', $14, $15, $15, $16, NOW(), NOW())
           RETURNING id`,
          [
            userId, planId, planCategory, durationDays, smsLimit || 100, minuteTier, minuteIncluded || 0,
            countryId, phoneNumber, displayNumber, numberType,
            provider, providerNumberSid, orderId, rentResult.expiresAt, rentResult.inventoryId
          ]
        )
        userVirtualNumberId = insertResult.rows[0].id
      }

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
        // Also check without status filter to see if number exists but is inactive
        const anyResult = await query(
          `SELECT id, phone_number, status FROM user_virtual_numbers WHERE phone_number = $1`,
          [to]
        )
        console.warn('Received SMS for unknown/inactive number:', { to, existingRecords: anyResult.rows })
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
        const emailSent = await sendSmsForwardingEmail({
          email: virtualNumber.sms_forward_email,
          phoneNumber: virtualNumber.phone_number,
          phoneNumberDisplay: virtualNumber.phone_number_display || virtualNumber.phone_number,
          fromNumber: from,
          messageBody: body,
          receivedAt: new Date(),
          mediaUrls: mediaUrls
        })
        forwarded = emailSent
      }

      return { success: true, forwarded }
    } catch (error) {
      console.error('Error handling incoming SMS:', error)
      return { success: false }
    }
  }

  /**
   * Renew a virtual number for another billing period
   */
  async renewNumber(
    userVirtualNumberId: string,
    userId: string
  ): Promise<{ success: boolean; newExpiresAt?: Date; error?: string }> {
    try {
      // Get number details
      const numberResult = await query(
        `SELECT uvn.*, vnp.duration_days, vnp.price
         FROM user_virtual_numbers uvn
         JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
         WHERE uvn.id = $1 AND uvn.user_id = $2`,
        [userVirtualNumberId, userId]
      )

      if (numberResult.rows.length === 0) {
        return { success: false, error: 'Virtual number not found' }
      }

      const virtualNumber = numberResult.rows[0]

      if (virtualNumber.status === 'cancelled') {
        return { success: false, error: 'Cannot renew a cancelled number' }
      }

      // Calculate new expiry date
      const currentExpiry = new Date(virtualNumber.expires_at)
      const now = new Date()
      const baseDate = currentExpiry > now ? currentExpiry : now
      const newExpiresAt = new Date(baseDate)
      newExpiresAt.setDate(newExpiresAt.getDate() + virtualNumber.duration_days)

      // Update the number
      await query(
        `UPDATE user_virtual_numbers
         SET expires_at = $1,
             next_billing_at = $1,
             status = 'active',
             updated_at = NOW()
         WHERE id = $2`,
        [newExpiresAt, userVirtualNumberId]
      )

      return { success: true, newExpiresAt }
    } catch (error: any) {
      console.error('Error renewing virtual number:', error)
      return { success: false, error: error.message || 'Renewal failed' }
    }
  }

  /**
   * Get renewal price for a virtual number
   */
  async getRenewalPrice(
    userVirtualNumberId: string,
    userId: string
  ): Promise<{ success: boolean; price?: number; durationDays?: number; error?: string }> {
    try {
      const result = await query(
        `SELECT vnp.price, vnp.duration_days
         FROM user_virtual_numbers uvn
         JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
         WHERE uvn.id = $1 AND uvn.user_id = $2`,
        [userVirtualNumberId, userId]
      )

      if (result.rows.length === 0) {
        return { success: false, error: 'Virtual number not found' }
      }

      return {
        success: true,
        price: parseFloat(result.rows[0].price),
        durationDays: result.rows[0].duration_days
      }
    } catch (error: any) {
      console.error('Error getting renewal price:', error)
      return { success: false, error: error.message || 'Failed to get renewal price' }
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
