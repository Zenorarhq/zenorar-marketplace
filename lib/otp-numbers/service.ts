// OTP Numbers Service
// Unified service for multiple OTP providers

import { query } from '@/lib/db'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import { smsPoolProvider } from './providers/smspool'
import { fiveSimProvider } from './providers/5sim'
import type { OtpProvider, OtpService, OtpCountry, OtpNumber } from './types'

type ProviderName = 'smspool' | '5sim'

// Helper to get OTP settings from the 'api' group
async function getOtpSettings(): Promise<Record<string, any>> {
  return getSiteSettingsByGroup('api')
}

class OtpNumberService {
  private getProvider(name: ProviderName): OtpProvider {
    switch (name) {
      case 'smspool':
        return smsPoolProvider
      case '5sim':
        return fiveSimProvider
      default:
        throw new Error(`Unknown OTP provider: ${name}`)
    }
  }

  private async getDefaultProvider(): Promise<ProviderName> {
    try {
      const settings = await getOtpSettings()
      return (settings.otpDefaultProvider as ProviderName) || 'smspool'
    } catch {
      return 'smspool'
    }
  }

  private async getEnabledProviders(): Promise<ProviderName[]> {
    try {
      const settings = await getOtpSettings()
      const enabled: ProviderName[] = []

      if (settings.smspoolEnabled === true || settings.smspoolEnabled === 'true') {
        enabled.push('smspool')
      }
      if (settings.fivesimEnabled === true || settings.fivesimEnabled === 'true') {
        enabled.push('5sim')
      }

      return enabled
    } catch {
      return []
    }
  }

  /**
   * Get available services from all enabled providers
   */
  async getServices(providerName?: ProviderName): Promise<OtpService[]> {
    if (providerName) {
      const provider = this.getProvider(providerName)
      return provider.getServices()
    }

    const defaultProvider = await this.getDefaultProvider()
    const provider = this.getProvider(defaultProvider)
    return provider.getServices()
  }

  /**
   * Get available countries for a service
   */
  async getCountries(serviceId: string, providerName?: ProviderName): Promise<OtpCountry[]> {
    const name = providerName || await this.getDefaultProvider()
    const provider = this.getProvider(name)
    return provider.getCountries(serviceId)
  }

  /**
   * Get price for a service + country combo
   */
  async getPrice(
    serviceId: string,
    countryCode: string,
    providerName?: ProviderName
  ): Promise<{ provider: string; price: number }> {
    const name = providerName || await this.getDefaultProvider()
    const provider = this.getProvider(name)
    const price = await provider.getPrice(serviceId, countryCode)
    return { provider: name, price }
  }

  /**
   * Get prices from all enabled providers
   */
  async getAllPrices(
    serviceId: string,
    countryCode: string
  ): Promise<Array<{ provider: ProviderName; price: number }>> {
    const enabled = await this.getEnabledProviders()
    const prices: Array<{ provider: ProviderName; price: number }> = []

    await Promise.all(
      enabled.map(async (name) => {
        const provider = this.getProvider(name)
        const price = await provider.getPrice(serviceId, countryCode)
        if (price > 0) {
          prices.push({ provider: name, price })
        }
      })
    )

    return prices.sort((a, b) => a.price - b.price)
  }

  /**
   * Request an OTP number
   */
  async requestNumber(
    userId: string,
    serviceId: string,
    countryCode: string,
    providerName?: ProviderName
  ): Promise<{
    success: boolean
    number?: OtpNumber
    userOtpId?: string
    error?: string
  }> {
    const name = providerName || await this.getDefaultProvider()
    const provider = this.getProvider(name)

    // Get price first
    const price = await provider.getPrice(serviceId, countryCode)
    if (price <= 0) {
      return { success: false, error: 'Service not available for this country' }
    }

    // Check user balance
    const balanceResult = await query(
      `SELECT balance FROM user_wallets WHERE user_id = $1`,
      [userId]
    )

    if (balanceResult.rows.length === 0) {
      return { success: false, error: 'Wallet not found' }
    }

    const userBalance = parseFloat(balanceResult.rows[0].balance)
    if (userBalance < price) {
      return { success: false, error: 'Insufficient balance' }
    }

    // Request number from provider
    const result = await provider.requestNumber(serviceId, countryCode)

    if (!result.success || !result.number) {
      return { success: false, error: result.error || 'Failed to get number' }
    }

    // Start transaction to deduct balance and save OTP
    await query('BEGIN')

    try {
      // Deduct from wallet
      await query(
        `UPDATE user_wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`,
        [price, userId]
      )

      // Record wallet transaction
      await query(
        `INSERT INTO wallet_transactions
           (user_id, type, amount, balance_before, balance_after, description, reference_type, reference_id)
         VALUES ($1, 'DEBIT', $2, $3, $4, $5, 'otp_number', $6)`,
        [
          userId,
          price,
          userBalance,
          userBalance - price,
          `OTP Number: ${result.number.phoneNumber} for ${serviceId}`,
          result.number.id
        ]
      )

      // Save OTP number record
      const otpResult = await query(
        `INSERT INTO user_otp_numbers
           (user_id, provider, provider_order_id, phone_number, country_code, service_id, price, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
         RETURNING id`,
        [
          userId,
          name,
          result.number.id,
          result.number.phoneNumber,
          countryCode,
          serviceId,
          price,
          result.number.expiresAt
        ]
      )

      await query('COMMIT')

      return {
        success: true,
        number: result.number,
        userOtpId: otpResult.rows[0].id
      }
    } catch (error) {
      await query('ROLLBACK')
      // Try to cancel the number with provider
      await provider.cancelNumber(result.number.id)
      throw error
    }
  }

  /**
   * Check for received SMS
   */
  async checkSms(userOtpId: string, userId: string): Promise<{
    success: boolean
    status: 'pending' | 'received' | 'cancelled' | 'expired'
    code?: string
    fullSms?: string
    error?: string
  }> {
    // Get OTP record
    const otpResult = await query(
      `SELECT * FROM user_otp_numbers WHERE id = $1 AND user_id = $2`,
      [userOtpId, userId]
    )

    if (otpResult.rows.length === 0) {
      return { success: false, status: 'cancelled', error: 'OTP number not found' }
    }

    const otp = otpResult.rows[0]

    // Check if already completed
    if (otp.status === 'received') {
      return {
        success: true,
        status: 'received',
        code: otp.sms_code,
        fullSms: otp.full_sms
      }
    }

    if (otp.status === 'cancelled' || otp.status === 'expired') {
      return { success: true, status: otp.status }
    }

    // Check with provider
    const provider = this.getProvider(otp.provider as ProviderName)
    const result = await provider.checkSms(otp.provider_order_id)

    // Update status if changed
    if (result.status !== 'pending') {
      await query(
        `UPDATE user_otp_numbers
         SET status = $1, sms_code = $2, full_sms = $3, updated_at = NOW()
         WHERE id = $4`,
        [result.status, result.code || null, result.fullSms || null, userOtpId]
      )
    }

    return result
  }

  /**
   * Cancel an OTP number request
   */
  async cancelNumber(userOtpId: string, userId: string): Promise<{
    success: boolean
    refunded?: boolean
    error?: string
  }> {
    // Get OTP record
    const otpResult = await query(
      `SELECT * FROM user_otp_numbers WHERE id = $1 AND user_id = $2`,
      [userOtpId, userId]
    )

    if (otpResult.rows.length === 0) {
      return { success: false, error: 'OTP number not found' }
    }

    const otp = otpResult.rows[0]

    // Can't cancel if already received or cancelled
    if (otp.status === 'received') {
      return { success: false, error: 'Cannot cancel - SMS already received' }
    }

    if (otp.status === 'cancelled') {
      return { success: true, refunded: false }
    }

    // Cancel with provider
    const provider = this.getProvider(otp.provider as ProviderName)
    const result = await provider.cancelNumber(otp.provider_order_id)

    if (result.success) {
      // Refund to wallet
      await query('BEGIN')

      try {
        const balanceResult = await query(
          `SELECT balance FROM user_wallets WHERE user_id = $1`,
          [userId]
        )
        const currentBalance = parseFloat(balanceResult.rows[0]?.balance || 0)

        await query(
          `UPDATE user_wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [otp.price, userId]
        )

        await query(
          `INSERT INTO wallet_transactions
             (user_id, type, amount, balance_before, balance_after, description, reference_type, reference_id)
           VALUES ($1, 'REFUND', $2, $3, $4, $5, 'otp_number_refund', $6)`,
          [
            userId,
            otp.price,
            currentBalance,
            currentBalance + parseFloat(otp.price),
            `OTP Number Refund: ${otp.phone_number}`,
            userOtpId
          ]
        )

        await query(
          `UPDATE user_otp_numbers SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
          [userOtpId]
        )

        await query('COMMIT')

        return { success: true, refunded: true }
      } catch (error) {
        await query('ROLLBACK')
        throw error
      }
    }

    return { success: false, error: result.error }
  }

  /**
   * Get user's OTP number history
   */
  async getUserOtpNumbers(userId: string, limit: number = 20): Promise<any[]> {
    const result = await query(
      `SELECT * FROM user_otp_numbers
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return result.rows
  }

  /**
   * Get provider balances
   */
  async getProviderBalances(): Promise<Record<string, number>> {
    const enabled = await this.getEnabledProviders()
    const balances: Record<string, number> = {}

    await Promise.all(
      enabled.map(async (name) => {
        const provider = this.getProvider(name)
        balances[name] = await provider.getBalance()
      })
    )

    return balances
  }
}

export const otpNumberService = new OtpNumberService()
