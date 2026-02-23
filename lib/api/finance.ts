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
  totalExpenses: number
  netRevenue: number
  availableBalance: number
  pendingBalance: number
  currency: string
  revenueByPaymentMethod: { method: string; amount: number; count: number }[]
}

export interface AdminExpense {
  id: string
  amount: number
  description: string
  category: string | null
  createdBy: string
  createdAt: string
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
  async getOverview(startDate?: string, endDate?: string) {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiFetch<FinanceOverview>(`/payments/finance/overview${query}`)
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

  /**
   * Get admin expenses list (admin only)
   */
  async getExpenses(limit: number = 50) {
    return apiFetch<AdminExpense[]>(`/payments/finance/expenses?limit=${limit}`)
  },

  /**
   * Create a new admin expense (admin only)
   */
  async createExpense(data: { amount: number; description: string; category?: string }) {
    return apiFetch<AdminExpense>('/payments/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateExpense(id: string, data: { amount?: number; description?: string; category?: string }) {
    return apiFetch<AdminExpense>(`/payments/finance/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteExpense(id: string) {
    return apiFetch<void>(`/payments/finance/expenses/${id}`, {
      method: 'DELETE',
    })
  },
}
