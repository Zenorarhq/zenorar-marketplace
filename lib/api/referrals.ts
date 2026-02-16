import { apiFetch, ApiResponse } from './client'

export interface ReferralStats {
  totalReferrals: number
  pendingReferrals: number
  completedReferrals: number
  rewardedReferrals: number
  totalEarned: number
  referralCode: string
}

export interface Referral {
  id: string
  referrerId: string
  refereeId: string
  status: 'PENDING' | 'COMPLETED' | 'REWARDED' | 'CANCELLED'
  completedAt: string | null
  rewardedAt: string | null
  createdAt: string
  referrer: {
    id: string
    name: string
    email: string
    createdAt: string
  }
  referee: {
    id: string
    name: string
    email: string
    createdAt: string
  }
  firstOrder?: {
    id: string
    orderNumber: string
    total: number
    createdAt: string
  }
}

export interface ReferralHistoryResponse {
  referrals: Referral[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ReferralCodeValidation {
  valid: boolean
  referrerId?: string
  referrerName?: string
  message?: string
}

/**
 * Get my referral stats and code
 */
export async function getMyReferrals(): Promise<ApiResponse<ReferralStats>> {
  return apiFetch<ReferralStats>('/referrals/my')
}

/**
 * Get my referral history
 */
export async function getReferralHistory(
  page = 1,
  limit = 20,
  status?: string
): Promise<ApiResponse<ReferralHistoryResponse>> {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', limit.toString())
  if (status) params.set('status', status)

  return apiFetch<ReferralHistoryResponse>(`/referrals/history?${params.toString()}`)
}

/**
 * Generate referral code
 */
export async function generateReferralCode(): Promise<ApiResponse<{ code: string }>> {
  return apiFetch<{ code: string }>('/referrals/generate', {
    method: 'POST'
  })
}

/**
 * Validate referral code
 */
export async function validateReferralCode(
  code: string
): Promise<ApiResponse<ReferralCodeValidation>> {
  return apiFetch<ReferralCodeValidation>(`/referrals/validate/${code}`)
}

/**
 * Get all referrals (admin)
 */
export async function getAllReferrals(
  page = 1,
  limit = 20,
  status?: string
): Promise<ApiResponse<ReferralHistoryResponse>> {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', limit.toString())
  if (status) params.set('status', status)

  return apiFetch<ReferralHistoryResponse>(`/referrals?${params.toString()}`)
}

/**
 * Get referral analytics (admin)
 */
export async function getReferralAnalytics(): Promise<ApiResponse<{
  totalReferrals: number
  pendingReferrals: number
  completedReferrals: number
  rewardedReferrals: number
  totalRewardsPaid: number
  conversionRate: number
}>> {
  return apiFetch('/referrals/stats')
}

/**
 * Cancel referral (admin)
 */
export async function cancelReferral(
  id: string,
  reason?: string
): Promise<ApiResponse<void>> {
  return apiFetch(`/referrals/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  })
}
