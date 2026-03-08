// Test Mock OTP Provider
// For testing the OTP flow without real API credentials
// Activated via ?testMode=true query param or TEST_OTP_MODE=true env var

import type { OtpProvider, OtpService, OtpCountry, OtpNumber } from '../types'

// In-memory store for test activations
const testActivations: Map<string, {
  phoneNumber: string
  service: string
  country: string
  status: 'pending' | 'received' | 'cancelled' | 'expired'
  code: string
  createdAt: Date
  receiveAt: Date // When the "SMS" will arrive
}> = new Map()

// Generate random phone number
function generateTestPhone(countryCode: string): string {
  const countryPrefixes: Record<string, string> = {
    us: '+1555',
    uk: '+4479',
    ru: '+7999',
    de: '+4915',
    fr: '+336',
    nl: '+316',
    in: '+919',
    br: '+5511',
    id: '+628',
    ph: '+639',
  }
  const prefix = countryPrefixes[countryCode.toLowerCase()] || '+1555'
  const random = Math.floor(Math.random() * 9000000) + 1000000
  return `${prefix}${random}`
}

// Generate random 6-digit code
function generateTestCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

class TestMockProvider implements OtpProvider {
  name = 'test-mock'

  async getBalance(): Promise<number> {
    return 999.99 // Always has balance
  }

  async getServices(): Promise<OtpService[]> {
    return [
      { id: 'whatsapp', name: 'WhatsApp', slug: 'whatsapp', popular: true },
      { id: 'telegram', name: 'Telegram', slug: 'telegram', popular: true },
      { id: 'google', name: 'Google/Gmail', slug: 'google', popular: true },
      { id: 'facebook', name: 'Facebook', slug: 'facebook', popular: true },
      { id: 'instagram', name: 'Instagram', slug: 'instagram', popular: true },
      { id: 'twitter', name: 'Twitter/X', slug: 'twitter', popular: true },
      { id: 'discord', name: 'Discord', slug: 'discord', popular: true },
      { id: 'tiktok', name: 'TikTok', slug: 'tiktok', popular: true },
      { id: 'amazon', name: 'Amazon', slug: 'amazon', popular: false },
      { id: 'microsoft', name: 'Microsoft', slug: 'microsoft', popular: false },
      { id: 'netflix', name: 'Netflix', slug: 'netflix', popular: false },
      { id: 'spotify', name: 'Spotify', slug: 'spotify', popular: false },
    ]
  }

  async getCountries(serviceId: string): Promise<OtpCountry[]> {
    return [
      { id: 'us', name: 'United States', code: 'us' },
      { id: 'uk', name: 'United Kingdom', code: 'gb' },
      { id: 'ru', name: 'Russia', code: 'ru' },
      { id: 'de', name: 'Germany', code: 'de' },
      { id: 'fr', name: 'France', code: 'fr' },
      { id: 'nl', name: 'Netherlands', code: 'nl' },
      { id: 'in', name: 'India', code: 'in' },
      { id: 'br', name: 'Brazil', code: 'br' },
      { id: 'id', name: 'Indonesia', code: 'id' },
      { id: 'ph', name: 'Philippines', code: 'ph' },
    ]
  }

  async getPrice(serviceId: string, countryCode: string): Promise<number> {
    // Different test prices based on country
    const prices: Record<string, number> = {
      us: 0.75,
      uk: 0.65,
      ru: 0.15,
      de: 0.55,
      fr: 0.50,
      nl: 0.45,
      in: 0.10,
      br: 0.20,
      id: 0.12,
      ph: 0.08,
    }
    return prices[countryCode.toLowerCase()] || 0.50
  }

  async requestNumber(serviceId: string, countryCode: string): Promise<{
    success: boolean
    number?: OtpNumber
    error?: string
  }> {
    const activationId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const phoneNumber = generateTestPhone(countryCode)
    const code = generateTestCode()
    const now = new Date()

    // SMS will "arrive" in 5-10 seconds
    const receiveDelay = 5000 + Math.random() * 5000
    const receiveAt = new Date(now.getTime() + receiveDelay)
    const expiresAt = new Date(now.getTime() + 20 * 60 * 1000) // 20 min expiry

    // Store the activation
    testActivations.set(activationId, {
      phoneNumber,
      service: serviceId,
      country: countryCode,
      status: 'pending',
      code,
      createdAt: now,
      receiveAt,
    })

    console.log(`[TEST MODE] Created test activation ${activationId}`)
    console.log(`[TEST MODE] Phone: ${phoneNumber}, Code: ${code}`)
    console.log(`[TEST MODE] SMS will "arrive" in ${Math.round(receiveDelay / 1000)} seconds`)

    return {
      success: true,
      number: {
        id: activationId,
        phoneNumber,
        countryCode,
        service: serviceId,
        status: 'pending',
        expiresAt,
        createdAt: now,
      }
    }
  }

  async checkSms(activationId: string): Promise<{
    success: boolean
    status: 'pending' | 'received' | 'cancelled' | 'expired'
    code?: string
    fullSms?: string
    error?: string
  }> {
    const activation = testActivations.get(activationId)

    if (!activation) {
      return { success: false, status: 'expired', error: 'Activation not found' }
    }

    if (activation.status === 'cancelled') {
      return { success: true, status: 'cancelled' }
    }

    if (activation.status === 'received') {
      return {
        success: true,
        status: 'received',
        code: activation.code,
        fullSms: `Your verification code is: ${activation.code}. Do not share this code with anyone.`,
      }
    }

    // Check if it's time to "receive" the SMS
    const now = new Date()
    if (now >= activation.receiveAt) {
      activation.status = 'received'
      console.log(`[TEST MODE] SMS "received" for ${activationId}: ${activation.code}`)

      return {
        success: true,
        status: 'received',
        code: activation.code,
        fullSms: `Your verification code is: ${activation.code}. Do not share this code with anyone.`,
      }
    }

    const timeLeft = Math.round((activation.receiveAt.getTime() - now.getTime()) / 1000)
    console.log(`[TEST MODE] Still waiting for SMS... ${timeLeft}s until arrival`)

    return { success: true, status: 'pending' }
  }

  async cancelNumber(activationId: string): Promise<{ success: boolean; error?: string }> {
    const activation = testActivations.get(activationId)

    if (!activation) {
      return { success: false, error: 'Activation not found' }
    }

    if (activation.status === 'received') {
      return { success: false, error: 'Cannot cancel - SMS already received' }
    }

    activation.status = 'cancelled'
    console.log(`[TEST MODE] Cancelled activation ${activationId}`)

    return { success: true }
  }

  async reportBadNumber(activationId: string): Promise<{ success: boolean }> {
    console.log(`[TEST MODE] Reported bad number ${activationId}`)
    return { success: true }
  }
}

export const testMockProvider = new TestMockProvider()

// Check if test mode is enabled
export function isTestModeEnabled(): boolean {
  // Check environment variable
  if (process.env.TEST_OTP_MODE === 'true') {
    return true
  }
  return false
}
