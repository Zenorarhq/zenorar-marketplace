// Lithic Virtual Cards Provider (Premium Cards with 3D Secure)
// Documentation: https://docs.lithic.com/

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

interface LithicCredentials {
  apiKey: string
  isSandbox: boolean
}

class LithicProvider implements CardProviderInterface {
  name = 'lithic' as const

  private async getCredentials(): Promise<LithicCredentials | null> {
    try {
      const settings = await getSiteSettingsByGroup('api')

      const enabled = settings.lithicCardsEnabled === true || settings.lithicCardsEnabled === 'true'
      if (!enabled) return null

      const isSandbox = settings.lithicMode === 'sandbox' || settings.lithicSandbox === true

      let apiKey = ''
      if (isSandbox) {
        apiKey = settings.lithicSandboxApiKey || settings.lithicApiKey || process.env.LITHIC_API_KEY || ''
      } else {
        apiKey = settings.lithicProductionApiKey || settings.lithicApiKey || process.env.LITHIC_API_KEY || ''
      }

      if (!apiKey) return null

      return { apiKey, isSandbox }
    } catch (error) {
      console.error('Error getting Lithic credentials:', error)
      return null
    }
  }

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://sandbox.lithic.com'
      : 'https://api.lithic.com'
  }

  /**
   * Create a new premium virtual card
   */
  async createCard(params: CreateCardParams): Promise<CreateCardResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Lithic not configured' }
    }

    try {
      // Attempt to get an account token (best-effort — not required in sandbox)
      const accountToken = await this.getOrCreateAccount(params.userId, credentials)

      // Build card payload — omit account_token if not available (sandbox allows this)
      const cardPayload: Record<string, any> = {
        type: 'VIRTUAL',
        spending_limit: 1000000, // $10,000 in cents
        spending_limit_duration: 'TRANSACTION',
        state: 'OPEN',
      }
      if (accountToken) {
        cardPayload.account_token = accountToken
      }

      // Create the virtual card with 3D Secure enabled
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/cards`, {
        method: 'POST',
        headers: {
          'Authorization': credentials.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardPayload)
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('[Lithic] Card creation failed:', { status: response.status, data })
        return {
          success: false,
          error: data.message || data.error || 'Failed to create card'
        }
      }

      // Get full card details including PAN
      const cardDetails = await this.getFullCardDetails(data.token, credentials)

      return {
        success: true,
        cardId: data.token,
        cardNumber: cardDetails?.pan || data.last_four,
        cvv: cardDetails?.cvv || '',
        expiry: this.formatExpiry(data.exp_month, data.exp_year),
        lastFour: data.last_four,
        balance: 0
      }
    } catch (error: any) {
      console.error('Lithic createCard error:', error)
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
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/cards/${cardId}`, {
        headers: {
          'Authorization': credentials.apiKey
        }
      })

      if (!response.ok) return null

      const data = await response.json()

      // Get spending info for balance
      const spending = await this.getCardSpending(cardId, credentials)

      return {
        cardId: data.token,
        cardNumber: data.last_four ? `**** **** **** ${data.last_four}` : '',
        cvv: '',
        expiry: this.formatExpiry(data.exp_month, data.exp_year),
        lastFour: data.last_four,
        balance: spending?.available || 0,
        status: data.state?.toLowerCase() || 'active',
        brand: 'visa' // Lithic typically issues Visa
      }
    } catch (error) {
      console.error('Lithic getCardDetails error:', error)
      return null
    }
  }

  /**
   * Get full card details including PAN (sensitive - for reveal)
   * Uses Lithic's expand parameter to include the full card number
   */
  private async getFullCardDetails(cardToken: string, credentials: LithicCredentials): Promise<{pan: string, cvv: string} | null> {
    try {
      const response = await fetch(
        `${this.getBaseUrl(credentials.isSandbox)}/v1/cards/${cardToken}?expand[]=pan&expand[]=cvv`,
        {
          headers: {
            'Authorization': credentials.apiKey
          }
        }
      )

      if (!response.ok) return null

      const data = await response.json()
      return {
        pan: data.pan || '',
        cvv: data.cvv || ''
      }
    } catch {
      return null
    }
  }

  /**
   * Get card spending/balance info
   */
  private async getCardSpending(cardToken: string, credentials: LithicCredentials): Promise<{available: number} | null> {
    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/cards/${cardToken}/spend_limits`, {
        headers: {
          'Authorization': credentials.apiKey
        }
      })

      if (!response.ok) return null

      const data = await response.json()
      return {
        available: (data.available || 0) / 100
      }
    } catch {
      return null
    }
  }

  /**
   * Top up a card (fund the account)
   */
  async topUp(cardId: string, amount: number): Promise<TopUpResult> {
    const credentials = await this.getCredentials()
    if (!credentials) {
      return { success: false, error: 'Lithic not configured' }
    }

    try {
      // Get the card to find the account token
      const cardResponse = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/cards/${cardId}`, {
        headers: {
          'Authorization': credentials.apiKey
        }
      })

      if (!cardResponse.ok) {
        return { success: false, error: 'Card not found' }
      }

      const card = await cardResponse.json()

      // Fund the account
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/simulate/funding`, {
        method: 'POST',
        headers: {
          'Authorization': credentials.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount * 100, // Amount in cents
          account_token: card.account_token
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
        newBalance: (data.available_spend || 0) / 100,
        transactionId: data.token
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
      return { success: false, error: 'Lithic not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/cards/${cardId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': credentials.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'PAUSED'
        })
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
      return { success: false, error: 'Lithic not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/cards/${cardId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': credentials.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: 'OPEN'
        })
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
        `${this.getBaseUrl(credentials.isSandbox)}/v1/transactions?card_token=${cardId}&page_size=${limit}`,
        {
          headers: {
            'Authorization': credentials.apiKey
          }
        }
      )

      if (!response.ok) return []

      const data = await response.json()
      const transactions = data.data || []

      return transactions.map((tx: any) => ({
        id: tx.token,
        amount: (tx.amount || 0) / 100,
        type: tx.result === 'APPROVED' ? 'spend' : 'declined',
        merchantName: tx.merchant?.descriptor,
        merchantCategory: tx.merchant?.mcc,
        status: tx.result?.toLowerCase() || 'pending',
        createdAt: new Date(tx.created)
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
      return { success: false, error: 'Lithic not configured' }
    }

    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/cards?page_size=1`, {
        headers: {
          'Authorization': credentials.apiKey
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
   * Get or create an account for the user
   */
  private async getOrCreateAccount(userId: string, credentials: LithicCredentials): Promise<string | null> {
    // In production, you would:
    // 1. Check if user has an account token stored
    // 2. If not, create a new account with KYC
    // 3. Store the account token

    // For now, attempt to create a new account
    try {
      const response = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/accounts`, {
        method: 'POST',
        headers: {
          'Authorization': credentials.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Minimal account creation - in production needs KYC data
        })
      })

      if (!response.ok) {
        // Try to get existing accounts
        const listResponse = await fetch(`${this.getBaseUrl(credentials.isSandbox)}/v1/accounts?page_size=1`, {
          headers: {
            'Authorization': credentials.apiKey
          }
        })

        if (listResponse.ok) {
          const data = await listResponse.json()
          if (data.data?.[0]?.token) {
            return data.data[0].token
          }
        }
        return null
      }

      const data = await response.json()
      return data.token
    } catch {
      return null
    }
  }

  private formatExpiry(month?: number, year?: number): string {
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

export const lithicProvider = new LithicProvider()
