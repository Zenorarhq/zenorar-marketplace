// Virtual Number Provider Base Interface
// All providers (Twilio, Vonage, Plivo, etc.) must implement this interface

export interface ProviderCredentials {
  isEnabled: boolean
  isDefault: boolean
  config: Record<string, any>
}

export interface AvailableNumber {
  phoneNumber: string
  phoneNumberDisplay?: string
  friendlyName?: string
  locality?: string
  region?: string
  numberType: 'local' | 'toll-free' | 'mobile'
  capabilities: {
    sms: boolean
    voice: boolean
    mms: boolean
  }
  monthlyCost?: number
  setupCost?: number
}

export interface PurchaseResult {
  success: boolean
  numberSid?: string
  phoneNumber?: string
  monthlyCost?: number
  error?: string
}

export interface ReleaseResult {
  success: boolean
  error?: string
}

export interface SmsResult {
  success: boolean
  messageSid?: string
  status?: string
  error?: string
}

export interface HealthCheckResult {
  success: boolean
  mode?: string
  latencyMs?: number
  error?: string
}

export interface PricingInfo {
  monthlyCost: number
  setupCost: number
  inboundVoiceCost: number
  outboundVoiceCost: number
  inboundSmsCost: number
  outboundSmsCost: number
  currency: string
}

/**
 * Base interface that all virtual number providers must implement
 */
export interface VirtualNumberProvider {
  /**
   * Provider slug (e.g., 'twilio', 'vonage', 'plivo')
   */
  readonly slug: string

  /**
   * Provider display name
   */
  readonly name: string

  /**
   * Test connection to the provider
   */
  testConnection(): Promise<HealthCheckResult>

  /**
   * Search for available phone numbers
   */
  searchNumbers(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile',
    options?: {
      areaCode?: string
      contains?: string
      limit?: number
    }
  ): Promise<AvailableNumber[]>

  /**
   * Purchase a phone number
   */
  purchaseNumber(
    phoneNumber: string,
    webhookUrls?: {
      smsUrl?: string
      voiceUrl?: string
    }
  ): Promise<PurchaseResult>

  /**
   * Release a phone number
   */
  releaseNumber(numberSid: string): Promise<ReleaseResult>

  /**
   * Send an SMS message
   */
  sendSms(from: string, to: string, body: string): Promise<SmsResult>

  /**
   * Configure webhooks for a number
   */
  configureWebhooks(
    numberSid: string,
    webhookUrls: {
      smsUrl?: string
      voiceUrl?: string
      statusUrl?: string
    }
  ): Promise<{ success: boolean; error?: string }>

  /**
   * Get pricing for a country/type
   */
  getPricing(
    countryCode: string,
    type: 'local' | 'toll-free' | 'mobile'
  ): Promise<PricingInfo | null>

  /**
   * Validate incoming webhook signature
   */
  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean | Promise<boolean>

  /**
   * Check if provider supports a specific country
   */
  supportsCountry(countryCode: string): Promise<boolean>

  /**
   * Clear any cached credentials
   */
  clearCache(): void
}

/**
 * Provider configuration from database
 */
export interface ProviderConfig {
  id: string
  name: string
  slug: string
  isEnabled: boolean
  isDefault: boolean
  apiKey?: string
  apiSecret?: string
  accountSid?: string
  authToken?: string
  webhookSecret?: string
  config: Record<string, any>
  supportsSms: boolean
  supportsVoice: boolean
  supportsMms: boolean
  supportedCountries?: string[]
  priority: number
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
}
