import { apiFetch, buildQueryString } from './client'

export interface Transaction {
  id: string
  orderId: string
  type: string
  amount: number
  currency: string
  status: string
  createdAt: string
}

export interface FinanceOverview {
  totalRevenue: number
  totalSales: number
  totalRefunds: number
  totalFees: number
  availableBalance: number
  pendingBalance: number
  currency: string
}

export interface RevenueData {
  date: string
  revenue: number
  orders: number
}

export interface TransactionFilters {
  type?: string
  status?: string
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}

export const financeApi = {
  /**
   * Get finance overview/summary (admin only)
   */
  async getOverview() {
    return apiFetch<FinanceOverview>('/payments/finance/overview')
  },

  /**
   * Get daily revenue data (admin only)
   */
  async getDailyRevenue(days: number = 30) {
    return apiFetch<RevenueData[]>(`/payments/finance/daily?days=${days}`)
  },

  /**
   * Get monthly revenue data (admin only)
   */
  async getMonthlyRevenue(months: number = 12) {
    return apiFetch<RevenueData[]>(`/payments/finance/monthly?months=${months}`)
  },

  /**
   * Get all transactions (admin only)
   */
  async getTransactions(filters: TransactionFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<Transaction[]>(`/payments/transactions/list${query}`)
  },

  /**
   * Get payments list (admin only)
   */
  async getPayments(filters: { page?: number; limit?: number } = {}) {
    const query = buildQueryString(filters)
    return apiFetch<any[]>(`/payments${query}`)
  },
}
