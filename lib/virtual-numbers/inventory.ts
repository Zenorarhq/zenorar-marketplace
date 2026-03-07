// Virtual Number Inventory Pool Service
// Manages owned numbers that can be rented to customers

import { query } from '@/lib/db'
import { providerManager } from './providers/manager'

export interface InventoryNumber {
  id: string
  phoneNumber: string
  phoneNumberDisplay: string
  countryId: string
  numberType: string
  provider: string
  providerNumberSid: string
  smsEnabled: boolean
  voiceEnabled: boolean
  mmsEnabled: boolean
  status: 'available' | 'rented' | 'hold' | 'releasing'
  rentedToUserId?: string
  rentedAt?: Date
  rentalExpiresAt?: Date
  twilioNextBilling?: Date
  timesRented: number
  source: 'inventory' | string  // 'inventory' for pool numbers, provider slug for fresh numbers
  locality?: string   // City/area from provider
  region?: string     // State/region from provider
}

export interface RentNumberParams {
  phoneNumber: string
  userId: string
  planId: string
  durationDays: number
  amountPaid: number
  minuteTier?: string
  minuteTierPrice?: number
  countryId?: string  // Pass from order to ensure proper country association
}

export interface RentResult {
  success: boolean
  inventoryId?: string
  phoneNumber?: string
  expiresAt?: Date
  error?: string
}

// Grace periods by plan duration (in hours)
const GRACE_PERIODS: Record<number, number> = {
  1: 0,     // 24hr plan: no grace
  7: 24,    // 7-day plan: 24hr grace
  30: 72,   // 30-day plan: 72hr grace
}

// Hold period for original user (hours)
const HOLD_PERIOD_HOURS = 24

class InventoryService {
  /**
   * Get available numbers from inventory, then Twilio
   * Inventory numbers shown first with "Instant" badge
   */
  async getAvailableNumbers(
    countryCode: string,
    numberType: string = 'local',
    limit: number = 20
  ): Promise<InventoryNumber[]> {
    const numbers: InventoryNumber[] = []

    // 1. Get country ID
    const countryResult = await query(
      `SELECT id FROM virtual_number_countries WHERE iso_code = $1`,
      [countryCode]
    )

    if (countryResult.rows.length === 0) {
      // Country not in our system, fall back to enabled providers
      return this.getProviderNumbers(countryCode, numberType, limit)
    }

    const countryId = countryResult.rows[0].id

    // 2. Get numbers from inventory (available or on hold for no one)
    const inventoryResult = await query(
      `SELECT
         id, phone_number, phone_number_display, country_id, number_type,
         provider, provider_number_sid, sms_enabled, voice_enabled, mms_enabled,
         status, times_rented, twilio_next_billing, locality, region
       FROM virtual_number_inventory
       WHERE country_id = $1
         AND number_type = $2
         AND (status = 'available' OR (status = 'hold' AND hold_expires_at < NOW()))
       ORDER BY times_rented DESC, created_at DESC
       LIMIT $3`,
      [countryId, numberType, limit]
    )

    // Add inventory numbers
    for (const row of inventoryResult.rows) {
      numbers.push({
        id: row.id,
        phoneNumber: row.phone_number,
        phoneNumberDisplay: row.phone_number_display,
        countryId: row.country_id,
        numberType: row.number_type,
        provider: row.provider,
        providerNumberSid: row.provider_number_sid,
        smsEnabled: row.sms_enabled,
        voiceEnabled: row.voice_enabled,
        mmsEnabled: row.mms_enabled,
        status: row.status,
        twilioNextBilling: row.twilio_next_billing,
        timesRented: row.times_rented,
        source: 'inventory',
        locality: row.locality || undefined,
        region: row.region || undefined
      })
    }

    // 3. If we need more numbers, get from enabled providers
    const remaining = limit - numbers.length
    if (remaining > 0) {
      const providerNumbers = await this.getProviderNumbers(countryCode, numberType, remaining, countryId)

      // Filter out numbers we already have in inventory
      const existingPhones = new Set(numbers.map(n => n.phoneNumber))
      for (const pn of providerNumbers) {
        if (!existingPhones.has(pn.phoneNumber)) {
          numbers.push(pn)
        }
      }
    }

    return numbers.slice(0, limit)
  }

  /**
   * Get fresh numbers from all enabled providers
   */
  private async getProviderNumbers(
    countryCode: string,
    numberType: string,
    limit: number,
    countryId?: string
  ): Promise<InventoryNumber[]> {
    const providerType = numberType === 'toll-free' ? 'toll-free' :
                         numberType === 'mobile' ? 'mobile' : 'local'

    // Search all enabled providers
    const providerNumbers = await providerManager.searchNumbersAllProviders(
      countryCode,
      providerType as 'local' | 'toll-free' | 'mobile',
      { limit }
    )

    // If countryId wasn't provided, try to look it up from the country code
    let resolvedCountryId = countryId || ''
    if (!resolvedCountryId) {
      const countryResult = await query(
        `SELECT id FROM virtual_number_countries WHERE iso_code = $1`,
        [countryCode]
      )
      resolvedCountryId = countryResult.rows[0]?.id || ''
    }

    return providerNumbers.map(n => ({
      id: '',  // No inventory ID yet
      phoneNumber: n.phoneNumber,
      phoneNumberDisplay: n.friendlyName || n.phoneNumber,
      countryId: resolvedCountryId,
      numberType,
      provider: n.providerSlug,
      providerNumberSid: '',
      smsEnabled: n.capabilities?.sms ?? true,
      voiceEnabled: n.capabilities?.voice ?? true,
      mmsEnabled: n.capabilities?.mms ?? false,
      status: 'available' as const,
      timesRented: 0,
      source: n.providerSlug,  // Provider slug (twilio, vonage, plivo, etc.)
      locality: n.locality || undefined,
      region: n.region || undefined
    }))
  }

  /**
   * Rent a number to a user
   * If number is in inventory, mark as rented
   * If number is from Twilio, purchase it first
   */
  async rentNumber(params: RentNumberParams): Promise<RentResult> {
    const { phoneNumber, userId, planId, durationDays, amountPaid, minuteTier, minuteTierPrice, countryId: passedCountryId } = params

    console.log('rentNumber called with:', { phoneNumber, userId, planId, durationDays, amountPaid, passedCountryId })

    try {
      // Check if number exists in inventory
      const existingResult = await query(
        `SELECT id, status, hold_for_user_id, hold_expires_at
         FROM virtual_number_inventory
         WHERE phone_number = $1`,
        [phoneNumber]
      )

      let inventoryId: string

      if (existingResult.rows.length > 0) {
        // Number exists in inventory
        const existing = existingResult.rows[0]

        // Check if it's available or on hold for this user
        if (existing.status === 'rented') {
          return { success: false, error: 'Number is currently rented' }
        }

        if (existing.status === 'hold' &&
            existing.hold_for_user_id !== userId &&
            new Date(existing.hold_expires_at) > new Date()) {
          return { success: false, error: 'Number is reserved for another user' }
        }

        inventoryId = existing.id
      } else {
        // Number not in inventory - purchase from enabled providers with fallback
        const purchaseResult = await providerManager.purchaseNumberWithFallback(phoneNumber)

        if (!purchaseResult.success) {
          return { success: false, error: purchaseResult.error || 'Failed to purchase number' }
        }

        // Get country info - use passed countryId first, fallback to lookup
        let countryId = passedCountryId
        console.log('rentNumber countryId resolution:', { passedCountryId, phoneNumber })

        if (!countryId) {
          console.log('No countryId passed, looking up by dial code...')
          const countryResult = await query(
            `SELECT id FROM virtual_number_countries
             WHERE dial_code = $1 OR $2 LIKE dial_code || '%'`,
            [phoneNumber.substring(0, 2), phoneNumber]
          )
          countryId = countryResult.rows[0]?.id
          console.log('Dial code lookup result:', countryId)
        }

        // If still no countryId, try to lookup by full dial code patterns
        if (!countryId) {
          console.log('Still no countryId, trying common dial codes...')
          const dialCodes = ['+1', '+44', '+61', '+49', '+33', '+81', '+65', '+86']
          for (const dialCode of dialCodes) {
            if (phoneNumber.startsWith(dialCode)) {
              const result = await query(
                `SELECT id FROM virtual_number_countries WHERE dial_code = $1`,
                [dialCode]
              )
              if (result.rows.length > 0) {
                countryId = result.rows[0].id
                console.log('Found countryId from dial code:', dialCode, countryId)
                break
              }
            }
          }
        }

        if (!countryId) {
          console.error('Could not determine countryId for phone:', phoneNumber)
          return { success: false, error: 'Could not determine country for phone number. Please try again.' }
        }

        console.log('Final countryId for INSERT:', countryId)

        // Add to inventory with the provider that successfully purchased
        const insertResult = await query(
          `INSERT INTO virtual_number_inventory (
             phone_number, phone_number_display, country_id, number_type,
             provider, provider_number_sid, sms_enabled, voice_enabled, mms_enabled,
             twilio_cost_monthly, twilio_purchased_at, twilio_next_billing
           ) VALUES ($1, $2, $3, 'local', $4, $5, true, true, false, 1.00, NOW(), NOW() + INTERVAL '30 days')
           RETURNING id`,
          [phoneNumber, phoneNumber, countryId, purchaseResult.providerSlug, purchaseResult.numberSid]
        )

        inventoryId = insertResult.rows[0].id
      }

      // Calculate expiry
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + durationDays)

      // Update inventory record
      await query(
        `UPDATE virtual_number_inventory SET
           status = 'rented',
           rented_to_user_id = $1,
           rented_at = NOW(),
           rental_expires_at = $2,
           rental_plan_id = $3,
           hold_for_user_id = NULL,
           hold_expires_at = NULL,
           grace_period_ends_at = NULL,
           times_rented = times_rented + 1,
           total_revenue = total_revenue + $4,
           last_rented_at = NOW(),
           updated_at = NOW()
         WHERE id = $5`,
        [userId, expiresAt, planId, amountPaid, inventoryId]
      )

      // Record in rental history
      await query(
        `INSERT INTO virtual_number_rental_history (
           inventory_id, phone_number, user_id, plan_id,
           rented_at, amount_paid, minute_tier, minute_tier_price
         ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)`,
        [inventoryId, phoneNumber, userId, planId, amountPaid, minuteTier, minuteTierPrice]
      )

      return {
        success: true,
        inventoryId,
        phoneNumber,
        expiresAt
      }
    } catch (error: any) {
      console.error('Error renting number:', error)
      return { success: false, error: error.message || 'Failed to rent number' }
    }
  }

  /**
   * Process expired rentals
   * Called by cron job
   */
  async processExpiredRentals(): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = []
    let processed = 0

    try {
      // Find rentals that have expired but not yet in grace period
      const expiredResult = await query(
        `SELECT id, phone_number, rented_to_user_id, rental_plan_id
         FROM virtual_number_inventory
         WHERE status = 'rented'
           AND rental_expires_at < NOW()
           AND grace_period_ends_at IS NULL`
      )

      for (const row of expiredResult.rows) {
        try {
          // Get plan to determine grace period
          const planResult = await query(
            `SELECT duration_days FROM virtual_number_plans WHERE id = $1`,
            [row.rental_plan_id]
          )

          const durationDays = planResult.rows[0]?.duration_days || 30
          const gracePeriodHours = GRACE_PERIODS[durationDays] || GRACE_PERIODS[30]

          if (gracePeriodHours === 0) {
            // No grace period - move directly to hold
            const holdExpiresAt = new Date()
            holdExpiresAt.setHours(holdExpiresAt.getHours() + HOLD_PERIOD_HOURS)

            await query(
              `UPDATE virtual_number_inventory SET
                 status = 'hold',
                 hold_for_user_id = rented_to_user_id,
                 hold_expires_at = $1,
                 rented_to_user_id = NULL,
                 rented_at = NULL,
                 rental_expires_at = NULL,
                 rental_plan_id = NULL,
                 updated_at = NOW()
               WHERE id = $2`,
              [holdExpiresAt, row.id]
            )
          } else {
            // Set grace period
            const graceEndsAt = new Date()
            graceEndsAt.setHours(graceEndsAt.getHours() + gracePeriodHours)

            await query(
              `UPDATE virtual_number_inventory SET
                 grace_period_ends_at = $1,
                 updated_at = NOW()
               WHERE id = $2`,
              [graceEndsAt, row.id]
            )
          }

          processed++
        } catch (err: any) {
          errors.push(`Failed to process ${row.phone_number}: ${err.message}`)
        }
      }

      // Process grace periods that have ended - move to hold
      const graceEndedResult = await query(
        `SELECT id, rented_to_user_id
         FROM virtual_number_inventory
         WHERE status = 'rented'
           AND grace_period_ends_at IS NOT NULL
           AND grace_period_ends_at < NOW()`
      )

      for (const row of graceEndedResult.rows) {
        try {
          const holdExpiresAt = new Date()
          holdExpiresAt.setHours(holdExpiresAt.getHours() + HOLD_PERIOD_HOURS)

          await query(
            `UPDATE virtual_number_inventory SET
               status = 'hold',
               hold_for_user_id = $1,
               hold_expires_at = $2,
               rented_to_user_id = NULL,
               rented_at = NULL,
               rental_expires_at = NULL,
               rental_plan_id = NULL,
               grace_period_ends_at = NULL,
               updated_at = NOW()
             WHERE id = $3`,
            [row.rented_to_user_id, holdExpiresAt, row.id]
          )

          processed++
        } catch (err: any) {
          errors.push(`Failed to process grace end: ${err.message}`)
        }
      }

      // Process hold periods that have ended - make available
      const holdEndedResult = await query(
        `UPDATE virtual_number_inventory SET
           status = 'available',
           hold_for_user_id = NULL,
           hold_expires_at = NULL,
           updated_at = NOW()
         WHERE status = 'hold'
           AND hold_expires_at < NOW()
         RETURNING id`
      )

      processed += holdEndedResult.rowCount || 0

    } catch (error: any) {
      errors.push(`General error: ${error.message}`)
    }

    return { processed, errors }
  }

  /**
   * Release unused numbers before Twilio billing
   * Called by cron job
   */
  async releaseUnusedNumbers(): Promise<{ released: number; errors: string[] }> {
    const errors: string[] = []
    let released = 0

    try {
      // Find available numbers where billing is tomorrow or today
      const toReleaseResult = await query(
        `SELECT id, phone_number, provider, provider_number_sid
         FROM virtual_number_inventory
         WHERE status = 'available'
           AND twilio_next_billing <= NOW() + INTERVAL '1 day'
           AND twilio_next_billing > NOW()`
      )

      for (const row of toReleaseResult.rows) {
        try {
          // Get the provider instance for this number
          const provider = providerManager.getProvider(row.provider || 'twilio')
          if (!provider) {
            errors.push(`Provider ${row.provider} not found for ${row.phone_number}`)
            continue
          }

          // Release from provider
          const releaseResult = await provider.releaseNumber(row.provider_number_sid)

          if (releaseResult.success) {
            // Remove from inventory
            await query(
              `DELETE FROM virtual_number_inventory WHERE id = $1`,
              [row.id]
            )
            released++
          } else {
            errors.push(`Failed to release ${row.phone_number}: ${releaseResult.error}`)
          }
        } catch (err: any) {
          errors.push(`Error releasing ${row.phone_number}: ${err.message}`)
        }
      }
    } catch (error: any) {
      errors.push(`General error: ${error.message}`)
    }

    return { released, errors }
  }

  /**
   * Get inventory stats for admin dashboard
   */
  async getStats(): Promise<{
    total: number
    available: number
    rented: number
    onHold: number
    totalRevenue: number
    avgTimesRented: number
  }> {
    const result = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'available') as available,
         COUNT(*) FILTER (WHERE status = 'rented') as rented,
         COUNT(*) FILTER (WHERE status = 'hold') as on_hold,
         COALESCE(SUM(total_revenue), 0) as total_revenue,
         COALESCE(AVG(times_rented), 0) as avg_times_rented
       FROM virtual_number_inventory`
    )

    const row = result.rows[0]
    return {
      total: parseInt(row.total) || 0,
      available: parseInt(row.available) || 0,
      rented: parseInt(row.rented) || 0,
      onHold: parseInt(row.on_hold) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      avgTimesRented: parseFloat(row.avg_times_rented) || 0
    }
  }
}

export const inventoryService = new InventoryService()
