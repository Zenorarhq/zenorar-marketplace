// eSIM API Client - Frontend

import { localApiFetch } from './client'

// Types
export interface EsimRegion {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  flagEmoji?: string
  countryCount: number
  isFeatured: boolean
}

export interface EsimCountry {
  id: string
  name: string
  isoCode: string
  flagEmoji?: string
  dialCode?: string
  networks?: string[]
}

export interface EsimPlan {
  id: string
  name: string
  slug: string
  description?: string
  regionId: string
  regionName: string
  regionSlug: string
  coverageType: 'single' | 'regional' | 'global'
  countries: string[]
  dataAmountGb: number
  dataAmountDisplay: string
  validityDays: number
  isUnlimited: boolean
  voiceMinutes: number
  smsCount: number
  networkType: string
  speedDescription?: string
  hotspotAllowed: boolean
  supportsTopup: boolean
  retailPrice: number
  currency: string
  isFeatured: boolean
}

export interface UserEsim {
  id: string
  planId: string
  planName: string
  dataAmountDisplay: string
  validityDays: number
  countries: string[]
  regionName: string
  regionSlug: string
  iccid: string
  qrCodeData: string
  qrCodeUrl?: string
  status: 'pending' | 'active' | 'installed' | 'expired' | 'error'
  dataUsedMb: number
  dataRemainingMb: number
  expiresAt?: string
  installedAt?: string
  installationManual?: {
    ios: { automatic: string[]; manual: string[] }
    android: { automatic: string[]; manual: string[] }
  }
  createdAt: string
}

// API Functions

/**
 * Get all countries that have active eSIM plans
 */
export async function getPlanCountries(): Promise<{ success: boolean; data?: Array<{ isoCode: string; name: string | null }>; error?: string }> {
  return localApiFetch('/esim/plan-countries')
}

/**
 * Get all eSIM regions
 */
export async function getRegions(): Promise<{ success: boolean; data?: EsimRegion[]; error?: string }> {
  return localApiFetch('/esim/regions')
}

/**
 * Get countries for a region
 */
export async function getCountries(regionSlug?: string): Promise<{ success: boolean; data?: EsimCountry[]; error?: string }> {
  const params = regionSlug ? `?region=${regionSlug}` : ''
  return localApiFetch(`/esim/countries${params}`)
}

/**
 * Get eSIM plans
 */
export async function getPlans(filters?: {
  regionSlug?: string
  countryCode?: string
  featured?: boolean
}): Promise<{ success: boolean; data?: EsimPlan[]; error?: string }> {
  const params = new URLSearchParams()
  if (filters?.regionSlug) params.append('region', filters.regionSlug)
  if (filters?.countryCode) params.append('country', filters.countryCode)
  if (filters?.featured) params.append('featured', 'true')

  const queryString = params.toString()
  return localApiFetch(`/esim/plans${queryString ? `?${queryString}` : ''}`)
}

/**
 * Get single plan by slug
 */
export async function getPlan(slug: string): Promise<{ success: boolean; data?: EsimPlan; error?: string }> {
  return localApiFetch(`/esim/plans/${slug}`)
}

/**
 * Get user's purchased eSIMs
 */
export async function getUserEsims(): Promise<{ success: boolean; data?: UserEsim[]; error?: string }> {
  return localApiFetch('/esim/my-esims')
}

/**
 * Get single user eSIM with full details
 */
export async function getUserEsim(esimId: string): Promise<{ success: boolean; data?: UserEsim; error?: string }> {
  return localApiFetch(`/esim/my-esims/${esimId}`)
}

/**
 * Sync eSIM usage data from provider
 */
export async function syncUsage(esimId: string): Promise<{
  success: boolean
  data?: {
    dataUsedMb: number
    dataRemainingMb: number
    status: string
    expiresAt?: string
  }
  error?: string
}> {
  return localApiFetch(`/esim/my-esims/${esimId}/sync`, { method: 'POST' })
}

/**
 * Get available top-up options for an eSIM
 */
export async function getTopupOptions(esimId: string): Promise<{
  success: boolean
  data?: Array<{
    id: string
    dataAmountGb: number
    dataAmountDisplay: string
    validityDays: number
    price: number
  }>
  error?: string
}> {
  return localApiFetch(`/esim/my-esims/${esimId}/topup-options`)
}

/**
 * Get eSIM plans that support top-up/refill
 */
export async function getRefillPlans(filters?: {
  countryCode?: string
  featured?: boolean
}): Promise<{ success: boolean; data?: EsimPlan[]; error?: string }> {
  const params = new URLSearchParams()
  params.append('topupOnly', 'true')
  if (filters?.countryCode) params.append('country', filters.countryCode)
  if (filters?.featured) params.append('featured', 'true')

  return localApiFetch(`/esim/plans?${params.toString()}`)
}

/**
 * Check plan availability (for cart validation)
 */
export async function checkAvailability(planId: string): Promise<{
  success: boolean
  data?: {
    available: boolean
    source?: 'bulk' | 'api'
  }
  error?: string
}> {
  return localApiFetch(`/esim/plans/${planId}/availability`)
}

// ==========================================
// Carrier eSIM Plans (Call + SMS + Data)
// ==========================================

export interface CarrierEsimPlan {
  id: string
  carrierName: string
  carrierSlug: string
  planName: string
  description?: string
  country: string
  dataAmountGb: number | null
  dataAmountDisplay: string
  isUnlimited: boolean
  voiceMinutes: number
  voiceDisplay?: string
  smsCount: number
  smsDisplay?: string
  networkType: string
  retailPrice: number
  currency: string
  isFeatured: boolean
}

/**
 * Get all active carrier eSIM plans
 */
export async function getCarrierPlans(): Promise<{ success: boolean; data?: CarrierEsimPlan[]; error?: string }> {
  return localApiFetch('/esim/carrier-plans')
}

/**
 * Get single carrier eSIM plan
 */
export async function getCarrierPlan(id: string): Promise<{ success: boolean; data?: CarrierEsimPlan; error?: string }> {
  return localApiFetch(`/esim/carrier-plans/${id}`)
}
