// Sudo Africa Virtual Cards Provider
// Documentation: https://docs.sudo.africa/

import { getSiteSettingsByGroup } from '@/lib/db-helpers'
import type {
  CardProviderInterface,
  CreateCardParams,
  CreateCardResult,
  CardDetails,
  TopUpResult,
  ProviderTransaction,
  CardBrand
} from '../types'

interface SudoCredentials {
  apiKey: string
  isSandbox: boolean
}

class SudoProvider implements CardProviderInterface {
  name = 'sudo' as const

  private async getCredentials(): Promise<SudoCredentials | null> {
    try {
      const settings = await getSiteSettingsByGroup('api')

      const enabled = settings.sudoCardsEnabled === true || settings.sudoCardsEnabled === 'true'
      if (!enabled) return null

      const isSandbox = settings.sudoMode === 'sandbox' || settings.sudoSandbox === true

      let apiKey = ''
      if (isSandbox) {
        apiKey = settings.sudoSandboxApiKey || settings.sudoApiKey || process.env.SUDO_API_KEY || ''
      } else {
        apiKey = settings.sudoProductionApiKey || settings.sudoApiKey || process.env.SUDO_API_KEY || ''
      }

      if (!apiKey) return null

      return { apiKey, isSandbox }
    } catch (error) {
      console.error('Error getting Sudo credentials:', error)
      return null
    }
  }

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://api.sandbox.sudo.cards'
      : 'https://api.sudo.cards'
  }

  /**
   * Create a new virtual card
   */
  async createCard(params: CreateCardParams): Promise<CreateCardResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Sudo Africa not configured' }
    }

    try {
      // First, create a cardholder if needed (using userId as reference)
      const cardholderId = await this.getOrCreateCardholder(params.userId, credentials)
      if (!cardholderId) {
        return { success: false, error: 'Failed to create cardholder' }
      }

      // Create the virtual card
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/cards/virtual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: cardholderId,
          currency: params.currency || 'USD',
          brand: params.cardBrand || 'visa',
          type: 'virtual'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Failed to create card'
        }
      }

      return {
        success: true,
        cardId: data.data?._id || data._id,
        cardNumber: data.data?.maskedPan || data.maskedPan,
        cvv: data.data?.cvv2 || data.cvv2,
        expiry: this.formatExpiry(data.data?.expiryMonth, data.data?.expiryYear),
        lastFour: data.data?.last4 || data.last4,
        balance: 0
      }
    } catch (error: any) {
      console.error('Sudo createCard error:', error)
      return {
        success: false,
        error: error.message || 'Failed to create card'
      }
    }
  }

  /**
   * Get card details
   */
  async getCardDetails(cardId: string): Promise<CardDetails | null> {
    const credentials = await this.getCredentials()
    if (!credentials) return null

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/cards/${cardId}`, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`
        }
      })

      if (!response.ok) return null

      const data = await response.json()
      const card = data.data || data

      return {
        cardId: card._id,
        cardNumber: card.maskedPan,
        cvv: card.cvv2 || '',
        expiry: this.formatExpiry(card.expiryMonth, card.expiryYear),
        lastFour: card.last4,
        balance: parseFloat(card.balance) || 0,
        status: card.status,
        brand: card.brand || 'visa'
      }
    } catch (error) {
      console.error('Sudo getCardDetails error:', error)
      return null
    }
  }

  /**
   * Top up a card
   */
  async topUp(cardId: string, amount: number): Promise<TopUpResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Sudo Africa not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/cards/${cardId}/fund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount * 100, // Amount in cents
          currency: 'USD'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Top up failed'
        }
      }

      return {
        success: true,
        newBalance: parseFloat(data.data?.balance || data.balance) / 100,
        transactionId: data.data?._id || data._id
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Top up failed'
      }
    }
  }

  /**
   * Freeze a card
   */
  async freeze(cardId: string): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Sudo Africa not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/cards/${cardId}/freeze`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to freeze card' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Unfreeze a card
   */
  async unfreeze(cardId: string): Promise<{ success: boolean; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Sudo Africa not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/cards/${cardId}/unfreeze`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        return { success: false, error: data.message || 'Failed to unfreeze card' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get card transactions
   */
  async getTransactions(cardId: string, limit: number = 50): Promise<ProviderTransaction[]> {
    const credentials = await this.getCredentials()
    if (!credentials) return []

    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/cards/${cardId}/transactions?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${credentials.apiKey}`
          }
        }
      )

      if (!response.ok) return []

      const data = await response.json()
      const transactions = data.data || []

      return transactions.map((tx: any) => ({
        id: tx._id,
        amount: parseFloat(tx.amount) / 100,
        type: tx.type,
        merchantName: tx.merchant?.name,
        merchantCategory: tx.merchant?.category,
        status: tx.status,
        createdAt: new Date(tx.createdAt)
      }))
    } catch {
      return []
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; mode?: string; error?: string }> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Sudo Africa not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/accounts/balance`, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`
        }
      })

      if (!response.ok) {
        return {
          success: false,
          mode: credentials.isSandbox ? 'sandbox' : 'live',
          error: 'Invalid API key'
        }
      }

      return {
        success: true,
        mode: credentials.isSandbox ? 'sandbox' : 'live'
      }
    } catch (error: any) {
      return {
        success: false,
        mode: credentials.isSandbox ? 'sandbox' : 'live',
        error: error.message
      }
    }
  }

  /**
   * Get or create a cardholder for the user
   */
  private async getOrCreateCardholder(userId: string, credentials: SudoCredentials): Promise<string | null> {
    // In a production implementation, you would:
    // 1. Check if user already has a cardholder ID stored
    // 2. If not, create a new cardholder with Sudo
    // 3. Store the cardholder ID for future use

    // For now, return userId as a placeholder
    // This needs to be implemented with actual user data collection for KYC
    return userId
  }

  private formatExpiry(month?: string | number, year?: string | number): string {
    if (!month || !year) {
      const date = new Date()
      date.setFullYear(date.getFullYear() + 3)
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const y = date.getFullYear()
      return `${m}/${y}`
    }
    return `${String(month).padStart(2, '0')}/${year}`
  }
}

export const sudoProvider = new SudoProvider()
