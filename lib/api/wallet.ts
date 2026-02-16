import { apiFetch, ApiResponse } from './client'

export interface WalletBalance {
  balance: number
  currency: string
  recentTransactions: WalletTransaction[]
}

export interface WalletTransaction {
  id: string
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT'
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  createdAt: string
  order?: {
    id: string
    orderNumber: string
  }
  referral?: {
    id: string
    referee: {
      name: string
      email: string
    }
  }
  rewardGrant?: {
    id: string
    type: string
    reason: string
  }
}

export interface TransactionHistoryResponse {
  transactions: WalletTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Get my wallet balance and summary
 */
export async function getBalance(): Promise<ApiResponse<WalletBalance>> {
  return apiFetch<WalletBalance>('/wallet')
}

/**
 * Get my transaction history
 */
export async function getTransactionHistory(
  page = 1,
  limit = 20,
  type?: 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT'
): Promise<ApiResponse<TransactionHistoryResponse>> {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', limit.toString())
  if (type) params.set('type', type)

  return apiFetch<TransactionHistoryResponse>(`/wallet/transactions?${params.toString()}`)
}

/**
 * Get user wallet by ID (admin)
 */
export async function getUserWallet(userId: string): Promise<ApiResponse<any>> {
  return apiFetch(`/wallet/${userId}`)
}

/**
 * Add credit to user wallet (admin)
 */
export async function addCredit(
  userId: string,
  amount: number,
  description: string
): Promise<ApiResponse<void>> {
  return apiFetch('/wallet/credit', {
    method: 'POST',
    body: JSON.stringify({ userId, amount, description })
  })
}

/**
 * Deduct credit from user wallet (admin)
 */
export async function deductCredit(
  userId: string,
  amount: number,
  description: string
): Promise<ApiResponse<void>> {
  return apiFetch('/wallet/debit', {
    method: 'POST',
    body: JSON.stringify({ userId, amount, description })
  })
}

/**
 * Adjust user wallet balance (admin)
 */
export async function adjustBalance(
  userId: string,
  amount: number,
  description: string
): Promise<ApiResponse<void>> {
  return apiFetch('/wallet/adjust', {
    method: 'POST',
    body: JSON.stringify({ userId, amount, description })
  })
}

/**
 * Get all wallets with balances (admin)
 */
export async function getAllWallets(
  page = 1,
  limit = 20
): Promise<ApiResponse<{
  wallets: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}>> {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', limit.toString())

  return apiFetch(`/wallet/all?${params.toString()}`)
}
