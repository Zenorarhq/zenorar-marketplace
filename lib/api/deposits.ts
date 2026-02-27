import { apiFetch, localApiFetch, ApiResponse } from './client'

export type DepositMethod = 'CARD' | 'PAYSTACK' | 'PAYPAL' | 'BANK_TRANSFER' | 'CRYPTO_BTC' | 'CRYPTO_ETH' | 'CRYPTO_USDT'
export type CryptoNetwork = 'BTC' | 'ETH' | 'USDT' | 'SOL' | 'BNB' | 'TRON'
export type DepositStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED'

export interface Deposit {
  id: string
  userId: string
  amount: number
  currency: string
  paymentMethod: DepositMethod
  status: DepositStatus
  paymentGateway?: string
  gatewayTxnId?: string
  bankReference?: string
  bankProof?: string
  cryptoAddress?: string
  cryptoTxHash?: string
  cryptoNetwork?: string
  completedAt?: string
  failedAt?: string
  failureReason?: string
  createdAt: string
  updatedAt: string
}

export interface DepositsListResponse {
  deposits: Deposit[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface StripeDepositResponse {
  depositId: string
  clientSecret: string
  intentId: string
}

export interface PaystackDepositResponse {
  depositId: string
  authorizationUrl: string
  accessCode: string
  reference: string
}

export interface PayPalDepositResponse {
  depositId: string
  orderId: string
  approvalUrl: string
}

export interface CryptoDepositResponse {
  depositId: string
  address: string
  network: string
  networkLabel: string
  instructions: string
}

export interface BankTransferResponse {
  depositId: string
  bankDetails: {
    accountName: string
    accountNumber: string
    routingNumber: string
    bankName: string
    reference: string
    instructions: string
  }
}

/**
 * Initiate a Stripe deposit
 */
export async function initiateStripeDeposit(amount: number): Promise<ApiResponse<StripeDepositResponse>> {
  return localApiFetch<StripeDepositResponse>('/deposits/stripe', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
}

// Legacy alias for backward compatibility
export const initiateCardDeposit = initiateStripeDeposit

/**
 * Initiate a Paystack deposit (redirects to hosted checkout)
 */
export async function initiatePaystackDeposit(amount: number): Promise<ApiResponse<PaystackDepositResponse>> {
  return localApiFetch<PaystackDepositResponse>('/deposits/paystack', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
}

/**
 * Verify a Paystack payment by reference (called after redirect)
 */
export async function verifyPaystackDeposit(reference: string): Promise<ApiResponse<Deposit>> {
  return localApiFetch<Deposit>(`/deposits/paystack/verify?reference=${encodeURIComponent(reference)}`)
}

/**
 * Initiate a PayPal deposit
 */
export async function initiatePayPalDeposit(amount: number): Promise<ApiResponse<PayPalDepositResponse>> {
  return localApiFetch<PayPalDepositResponse>('/deposits/paypal', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
}

/**
 * Capture PayPal payment after user approves
 */
export async function capturePayPalDeposit(depositId: string, orderId: string): Promise<ApiResponse<Deposit>> {
  return localApiFetch<Deposit>('/deposits/paypal/capture', {
    method: 'POST',
    body: JSON.stringify({ depositId, orderId }),
  })
}

/**
 * Initiate a crypto deposit (get wallet address)
 * @param amount - USD amount to deposit
 * @param network - Crypto network: BTC, ETH, USDT, SOL, BNB, TRON
 */
export async function initiateCryptoDeposit(
  amount: number,
  network: CryptoNetwork
): Promise<ApiResponse<CryptoDepositResponse>> {
  return localApiFetch<CryptoDepositResponse>('/deposits/crypto', {
    method: 'POST',
    body: JSON.stringify({ amount, network }),
  })
}

/**
 * Submit crypto transaction hash for verification
 */
export async function submitCryptoTxHash(depositId: string, txHash: string): Promise<ApiResponse<Deposit>> {
  return localApiFetch<Deposit>(`/deposits/${depositId}/crypto-txhash`, {
    method: 'POST',
    body: JSON.stringify({ txHash }),
  })
}

/**
 * Initiate a bank transfer deposit
 */
export async function initiateBankTransfer(amount: number): Promise<ApiResponse<BankTransferResponse>> {
  return localApiFetch<BankTransferResponse>('/deposits/bank', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
}

/**
 * Upload bank transfer proof of payment
 */
export async function uploadBankProof(depositId: string, proofUrl: string): Promise<ApiResponse<Deposit>> {
  return localApiFetch<Deposit>(`/deposits/${depositId}/bank-proof`, {
    method: 'POST',
    body: JSON.stringify({ proofUrl }),
  })
}

/**
 * Cancel a pending deposit
 */
export async function cancelDeposit(depositId: string): Promise<ApiResponse<void>> {
  return localApiFetch<void>(`/deposits/${depositId}/cancel`, {
    method: 'POST',
  })
}

/**
 * Get my deposit history
 */
export async function getMyDeposits(
  page = 1,
  limit = 20,
  status?: DepositStatus,
  method?: DepositMethod
): Promise<ApiResponse<DepositsListResponse>> {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', limit.toString())
  if (status) params.set('status', status)
  if (method) params.set('method', method)

  return apiFetch<DepositsListResponse>(`/deposits/my?${params.toString()}`)
}

/**
 * Get deposit by ID
 */
export async function getMyDepositById(depositId: string): Promise<ApiResponse<Deposit>> {
  return apiFetch<Deposit>(`/deposits/my/${depositId}`)
}

/**
 * Get all deposits (admin)
 */
export async function getAllDeposits(
  page = 1,
  limit = 20,
  status?: DepositStatus,
  method?: DepositMethod,
  search?: string
): Promise<ApiResponse<DepositsListResponse & { stats?: any }>> {
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', limit.toString())
  if (status) params.set('status', status)
  if (method) params.set('method', method)
  if (search) params.set('search', search)

  return apiFetch(`/deposits?${params.toString()}`)
}

/**
 * Get deposit stats (admin)
 */
export async function getDepositStats(): Promise<ApiResponse<any>> {
  return apiFetch('/deposits/stats')
}

/**
 * Approve a deposit (admin - for bank/crypto)
 */
export async function approveDeposit(depositId: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/deposits/${depositId}/approve`, {
    method: 'POST',
  })
}

/**
 * Reject a deposit (admin)
 */
export async function rejectDeposit(depositId: string, reason: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/deposits/${depositId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/**
 * Reset a PROCESSING bank transfer deposit back to PENDING (admin)
 */
export async function resetDepositToPending(depositId: string): Promise<ApiResponse<void>> {
  return localApiFetch<void>(`/admin/deposits/${depositId}/reset-pending`, {
    method: 'POST',
  })
}
