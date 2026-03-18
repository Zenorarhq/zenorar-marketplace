// Virtual Numbers API Client - Frontend

import { localApiFetch } from './client'

// Types
export interface VirtualNumberCountry {
  id: string
  name: string
  isoCode: string
  dialCode: string
  flagEmoji?: string
  smsEnabled: boolean
  voiceEnabled: boolean
  mmsEnabled: boolean
  retailMonthly: number
  isActive: boolean
}

export interface VirtualNumberType {
  id: string
  name: string
  slug: string
  description?: string
  priceMultiplier: number
}

export interface VirtualNumberPlan {
  id: string
  name: string
  slug: string
  durationType: 'monthly' | 'daily' | 'weekly'
  durationDays: number
  smsIncluded: number
  voiceMinutesIncluded: number
  unlimitedSms: boolean
  unlimitedVoice: boolean
  basePrice: number
  smsOveragePrice: number
  voiceOveragePrice: number
  features: string[]
  isFeatured: boolean
}

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality?: string
  region?: string
  type: 'local' | 'toll-free' | 'mobile'
  capabilities: {
    sms: boolean
    voice: boolean
    mms: boolean
  }
  monthlyPrice: number
  source?: 'inventory' | 'provider'
}

export interface UserVirtualNumber {
  id: string
  userId: string
  planId: string
  planName: string
  countryId: string
  countryName: string
  phoneNumber: string
  phoneNumberDisplay: string
  numberType: string
  status: 'active' | 'suspended' | 'expired' | 'cancelled'
  startedAt: string
  expiresAt?: string
  nextBillingAt?: string
  smsForwardingEnabled: boolean
  smsForwardTo?: string
  smsForwardEmail?: string
  voiceForwardingEnabled: boolean
  voiceForwardTo?: string
  voicemailEnabled: boolean
  smsSentCount: number
  smsReceivedCount: number
  voiceMinutesUsed: number
  currentPeriodSms: number
  currentPeriodVoice: number
  smsIncluded: number
  voiceMinutesIncluded: number
  nickname?: string
  createdAt: string
}

export interface VirtualNumberMessage {
  id: string
  virtualNumberId: string
  direction: 'inbound' | 'outbound'
  fromNumber: string
  toNumber: string
  body: string
  mediaUrls?: string[]
  status: string
  isRead: boolean
  createdAt: string
}

// API Functions

/**
 * Get all available countries for virtual numbers
 */
export async function getCountries(): Promise<{
  success: boolean
  data?: VirtualNumberCountry[]
  error?: string
}> {
  return localApiFetch('/virtual-numbers/countries')
}

/**
 * Get number types (local, toll-free, mobile)
 */
export async function getNumberTypes(): Promise<{
  success: boolean
  data?: VirtualNumberType[]
  error?: string
}> {
  return localApiFetch('/virtual-numbers/types')
}

/**
 * Get subscription plans
 */
export async function getPlans(): Promise<{
  success: boolean
  data?: VirtualNumberPlan[]
  error?: string
}> {
  return localApiFetch('/virtual-numbers/plans')
}

/**
 * Search available numbers from provider
 */
export async function searchAvailableNumbers(filters: {
  countryCode: string
  type?: 'local' | 'toll-free' | 'mobile'
  areaCode?: string
}): Promise<{
  success: boolean
  data?: AvailableNumber[]
  error?: string
}> {
  const params = new URLSearchParams()
  params.append('country', filters.countryCode)
  if (filters.type) params.append('type', filters.type)
  if (filters.areaCode) params.append('areaCode', filters.areaCode)

  return localApiFetch(`/virtual-numbers/available?${params.toString()}`)
}

/**
 * Get user's purchased virtual numbers
 */
export async function getUserNumbers(): Promise<{
  success: boolean
  data?: UserVirtualNumber[]
  error?: string
}> {
  return localApiFetch('/virtual-numbers/my-numbers')
}

/**
 * Get single user virtual number with full details
 */
export async function getUserNumber(numberId: string): Promise<{
  success: boolean
  data?: UserVirtualNumber
  error?: string
}> {
  return localApiFetch(`/virtual-numbers/my-numbers/${numberId}`)
}

/**
 * Get messages for a virtual number
 */
export async function getMessages(
  numberId: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  success: boolean
  data?: {
    messages: VirtualNumberMessage[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
}> {
  return localApiFetch(`/virtual-numbers/my-numbers/${numberId}/messages?page=${page}&limit=${limit}`)
}

/**
 * Send outbound SMS
 */
export async function sendSms(
  numberId: string,
  to: string,
  body: string
): Promise<{
  success: boolean
  data?: {
    messageId: string
    status: string
  }
  error?: string
}> {
  return localApiFetch(`/virtual-numbers/my-numbers/${numberId}/send-sms`, {
    method: 'POST',
    body: JSON.stringify({ to, body })
  })
}

/**
 * Update forwarding settings
 */
export async function updateSettings(
  numberId: string,
  settings: {
    smsForwardingEnabled?: boolean
    smsForwardTo?: string
    smsForwardEmail?: string
    voiceForwardingEnabled?: boolean
    voiceForwardTo?: string
    voicemailEnabled?: boolean
    nickname?: string
  }
): Promise<{
  success: boolean
  data?: UserVirtualNumber
  error?: string
}> {
  return localApiFetch(`/virtual-numbers/my-numbers/${numberId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings)
  })
}

/**
 * Mark messages as read
 */
export async function markMessagesRead(
  numberId: string,
  messageIds: string[]
): Promise<{
  success: boolean
  error?: string
}> {
  return localApiFetch(`/virtual-numbers/my-numbers/${numberId}/messages/read`, {
    method: 'POST',
    body: JSON.stringify({ messageIds })
  })
}

/**
 * Get renewal price and wallet balance for a virtual number
 */
export async function getRenewalPrice(numberId: string): Promise<{
  success: boolean
  price?: number
  durationDays?: number
  walletBalance?: number
  canPayWithWallet?: boolean
  error?: string
}> {
  return localApiFetch(`/virtual-numbers/my-numbers/${numberId}/renew`)
}

/**
 * Renew virtual number subscription (wallet payment)
 */
export async function renewNumber(numberId: string): Promise<{
  success: boolean
  data?: { newExpiresAt: string; amountPaid: number; newBalance: number; message: string }
  error?: string
}> {
  return localApiFetch(`/virtual-numbers/my-numbers/${numberId}/renew`, {
    method: 'POST'
  })
}

/**
 * Cancel virtual number
 */
export async function cancelNumber(numberId: string): Promise<{
  success: boolean
  error?: string
}> {
  return localApiFetch(`/virtual-numbers/my-numbers/${numberId}/cancel`, {
    method: 'POST'
  })
}

/**
 * Send a test SMS to simulate receiving a message (development/admin only)
 */
export async function sendTestSms(
  virtualNumberId: string,
  message: string,
  fromNumber?: string
): Promise<{
  success: boolean
  data?: {
    to: string
    from: string
    body: string
    messageSid: string
  }
  error?: string
}> {
  return localApiFetch('/virtual-numbers/test-sms', {
    method: 'POST',
    body: JSON.stringify({
      virtualNumberId,
      message,
      fromNumber
    })
  })
}
