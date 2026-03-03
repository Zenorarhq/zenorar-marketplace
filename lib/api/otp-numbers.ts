// OTP Numbers API Client - Frontend

import { localApiFetch } from './client'

// Types
export interface OtpService {
  id: string
  name: string
  icon?: string
  category?: string
}

export interface OtpCountry {
  code: string
  name: string
  flag?: string
}

export interface OtpPriceInfo {
  provider: string
  price: number
}

export interface OtpNumber {
  id: string
  phoneNumber: string
  expiresAt?: string
}

export interface UserOtpNumber {
  id: string
  provider: string
  provider_order_id: string
  phone_number: string
  country_code: string
  service_id: string
  price: string
  status: 'pending' | 'received' | 'cancelled' | 'expired'
  sms_code?: string
  full_sms?: string
  expires_at?: string
  created_at: string
}

// API Functions

/**
 * Get available OTP services (WhatsApp, Google, Telegram, etc.)
 */
export async function getServices(provider?: 'smspool' | '5sim'): Promise<{
  success: boolean
  data?: OtpService[]
  error?: string
}> {
  const params = new URLSearchParams()
  params.append('action', 'services')
  if (provider) params.append('provider', provider)

  return localApiFetch(`/otp-numbers?${params.toString()}`)
}

/**
 * Get available countries for a service
 */
export async function getCountries(
  serviceId: string,
  provider?: 'smspool' | '5sim'
): Promise<{
  success: boolean
  data?: OtpCountry[]
  error?: string
}> {
  const params = new URLSearchParams()
  params.append('action', 'countries')
  params.append('service', serviceId)
  if (provider) params.append('provider', provider)

  return localApiFetch(`/otp-numbers?${params.toString()}`)
}

/**
 * Get price for a service + country combination
 */
export async function getPrice(
  serviceId: string,
  countryCode: string,
  provider?: 'smspool' | '5sim'
): Promise<{
  success: boolean
  data?: OtpPriceInfo
  error?: string
}> {
  const params = new URLSearchParams()
  params.append('action', 'price')
  params.append('service', serviceId)
  params.append('country', countryCode)
  if (provider) params.append('provider', provider)

  return localApiFetch(`/otp-numbers?${params.toString()}`)
}

/**
 * Get prices from all enabled providers
 */
export async function getAllPrices(
  serviceId: string,
  countryCode: string
): Promise<{
  success: boolean
  data?: OtpPriceInfo[]
  error?: string
}> {
  const params = new URLSearchParams()
  params.append('action', 'prices')
  params.append('service', serviceId)
  params.append('country', countryCode)

  return localApiFetch(`/otp-numbers?${params.toString()}`)
}

/**
 * Get user's OTP number history
 */
export async function getUserOtpNumbers(): Promise<{
  success: boolean
  data?: UserOtpNumber[]
  error?: string
}> {
  return localApiFetch('/otp-numbers')
}

/**
 * Request (purchase) a new OTP number
 * Deducts from wallet balance instantly
 */
export async function requestNumber(
  serviceId: string,
  countryCode: string,
  provider?: 'smspool' | '5sim'
): Promise<{
  success: boolean
  data?: {
    id: string
    number: OtpNumber
  }
  error?: string
}> {
  return localApiFetch('/otp-numbers', {
    method: 'POST',
    body: JSON.stringify({ serviceId, countryCode, provider })
  })
}

/**
 * Check SMS status for an OTP number (poll for code)
 */
export async function checkSms(otpId: string): Promise<{
  success: boolean
  data?: {
    status: 'pending' | 'received' | 'cancelled' | 'expired'
    code?: string
    fullSms?: string
  }
  error?: string
}> {
  return localApiFetch(`/otp-numbers/${otpId}`)
}

/**
 * Cancel an OTP number and get refund
 */
export async function cancelNumber(otpId: string): Promise<{
  success: boolean
  data?: {
    refunded: boolean
  }
  error?: string
}> {
  return localApiFetch(`/otp-numbers/${otpId}`, {
    method: 'DELETE'
  })
}
