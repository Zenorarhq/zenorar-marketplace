import { apiFetch, buildQueryString } from './client'

export interface Discount {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  usageLimit: number | null
  minOrderValue: number | null
  maxDiscountValue: number | null
  isActive: boolean
  startsAt: string | null
  expiresAt: string | null
  usageCount?: number
  createdAt: string
  updatedAt: string
}

export interface DiscountStats {
  totalCodes: number
  activeCodes: number
  totalUsage: number
  totalSavings: number
}

export interface DiscountFilters {
  status?: 'active' | 'expired' | 'all'
  type?: 'PERCENTAGE' | 'FIXED' | 'all'
  search?: string
}

export interface CreateDiscountData {
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  usageLimit?: number
  minOrderValue?: number
  maxDiscountValue?: number
  startsAt?: string
  expiresAt?: string
  isActive?: boolean
}

export interface ValidateDiscountResponse {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  discountAmount: number
  finalTotal: number
}

export const discountsApi = {
  /**
   * Get all discount codes (admin only)
   */
  async list(filters: DiscountFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<Discount[]>(`/discounts${query}`)
  },

  /**
   * Get discount statistics (admin only)
   */
  async getStats() {
    return apiFetch<DiscountStats>('/discounts/stats')
  },

  /**
   * Create new discount code (admin only)
   */
  async create(data: CreateDiscountData) {
    return apiFetch<Discount>('/discounts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update discount code (admin only)
   */
  async update(id: string, data: Partial<CreateDiscountData>) {
    return apiFetch<Discount>(`/discounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete discount code (admin only)
   */
  async delete(id: string) {
    return apiFetch<{ message: string }>(`/discounts/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Validate discount code (public - for checkout)
   */
  async validate(code: string, orderTotal: number) {
    return apiFetch<ValidateDiscountResponse>('/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderTotal }),
    })
  },
}
