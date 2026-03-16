// eSIM Provider Types

export interface EsimProviderConfig {
  name: string
  slug: string
  apiBaseUrl: string
  priority: number
}

export interface AvailableEsimPlan {
  providerPlanId: string
  name: string
  description?: string
  countries: string[]
  dataAmountGb: number
  dataAmountDisplay: string
  validityDays: number
  isUnlimited: boolean
  price: number
  costPrice?: number
  currency: string
  networkType: string
  supportsTopup: boolean
}

export interface EsimOrderResult {
  success: boolean
  providerOrderId: string
  providerEsimId: string
  iccid: string
  matchingId: string
  smdpAddress: string
  qrCodeData: string
  qrCodeUrl?: string
  activationCode?: string
  expiresAt?: Date
  error?: string
  errorCode?: string
}

export interface EsimUsageStatus {
  status: 'active' | 'pending' | 'expired' | 'unknown'
  dataUsedMb: number
  dataRemainingMb: number
  expiresAt?: Date
}

export interface TopUpResult {
  success: boolean
  topupId: string
  newDataAmountMb: number
  newExpiresAt?: Date
  error?: string
}

// Provider interface - all providers must implement this
export interface EsimProviderInterface {
  readonly name: string
  readonly slug: string

  // Get available plans from provider
  getPlans(): Promise<AvailableEsimPlan[]>

  // Check if a specific plan is available
  checkAvailability(providerPlanId: string): Promise<boolean>

  // Order/provision an eSIM
  orderEsim(providerPlanId: string, orderId: string): Promise<EsimOrderResult>

  // Get eSIM status and usage
  getEsimStatus(providerEsimId: string): Promise<EsimUsageStatus>

  // Top-up an existing eSIM (if supported)
  topUp?(providerEsimId: string, packageId: string): Promise<TopUpResult>

  // Verify API credentials are working
  healthCheck(): Promise<boolean>
}

// Bulk inventory item
export interface BulkEsimItem {
  id: string
  planId: string
  iccid: string
  matchingId: string
  smdpAddress: string
  qrCodeData: string
  activationCode?: string
  status: 'available' | 'reserved' | 'sold' | 'expired'
  costPrice: number
  expiresAt?: Date
}

// Provisioning result
export interface ProvisioningResult {
  success: boolean
  sourceType: 'bulk' | 'api'
  providerId?: string
  userEsimId?: string
  qrCodeData?: string
  iccid?: string
  error?: string
}
