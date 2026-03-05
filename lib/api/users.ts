import { apiFetch, buildQueryString, User, ApiResponse } from './client'

export interface UserFilters {
  search?: string
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER'
  isStaff?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
  status?: 'all' | 'active' | 'blocked'
  minOrders?: number
  maxOrders?: number
}

export interface UserStats {
  totalCustomers: number
  newCustomersToday: number
  totalOrders: number
  activeCustomers: number
}

export interface UsersListResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const usersApi = {
  /**
   * Get all users with filters and pagination
   */
  async list(filters: UserFilters = {}): Promise<ApiResponse<UsersListResponse>> {
    const query = buildQueryString(filters)
    return apiFetch<UsersListResponse>(`/users${query}`)
  },

  /**
   * Get user by ID
   */
  async getById(userId: string): Promise<ApiResponse<User>> {
    return apiFetch<User>(`/users/${userId}`)
  },

  /**
   * Update user details
   */
  async update(
    userId: string,
    data: { name?: string; bio?: string; avatar?: string }
  ): Promise<ApiResponse<User>> {
    return apiFetch<User>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete user
   */
  async delete(userId: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get user statistics
   */
  async getStats(): Promise<ApiResponse<UserStats>> {
    return apiFetch<UserStats>('/users/stats')
  },

  /**
   * Block user
   */
  async block(userId: string, reason?: string): Promise<ApiResponse<User>> {
    return apiFetch<User>(`/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  /**
   * Unblock user
   */
  async unblock(userId: string): Promise<ApiResponse<User>> {
    return apiFetch<User>(`/users/${userId}/unblock`, {
      method: 'POST',
    })
  },

  /**
   * Send password reset email to user
   */
  async sendPasswordReset(userId: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch<{ message: string }>(`/users/${userId}/send-password-reset`, {
      method: 'POST',
    })
  },

  /**
   * Get user's orders
   */
  async getOrders(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<ApiResponse<any>> {
    const query = buildQueryString({ page, limit })
    return apiFetch<any>(`/users/${userId}/orders${query}`)
  },

  /**
   * Send custom email to user
   */
  async sendEmail(
    userId: string,
    subject: string,
    message: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiFetch<{ message: string }>(`/users/${userId}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    })
  },

  /**
   * Get guest orders
   */
  async getGuestOrders(filters: {
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<ApiResponse<any>> {
    const query = buildQueryString(filters)
    return apiFetch<any>(`/users/guest-orders${query}`)
  },

  /**
   * Bulk delete users
   */
  async bulkDelete(ids: string[]): Promise<ApiResponse<{ deleted: number; total: number }>> {
    return apiFetch<{ deleted: number; total: number }>('/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  /**
   * Bulk block/unblock users
   */
  async bulkBlock(ids: string[], block: boolean, reason?: string): Promise<ApiResponse<{ updated: number; total: number }>> {
    return apiFetch<{ updated: number; total: number }>('/users/bulk-block', {
      method: 'POST',
      body: JSON.stringify({ ids, block, reason }),
    })
  },

  /**
   * Bulk send email to users
   */
  async bulkEmail(ids: string[], subject: string, message: string): Promise<ApiResponse<{ sent: number; total: number }>> {
    return apiFetch<{ sent: number; total: number }>('/users/bulk-email', {
      method: 'POST',
      body: JSON.stringify({ ids, subject, message }),
    })
  },

  /**
   * Export users as CSV (triggers file download)
   */
  exportCsvUrl(filters: UserFilters = {}): string {
    const query = buildQueryString(filters)
    return `/users/export${query}`
  },

  /**
   * Get guest order statistics
   */
  async getGuestOrderStats(): Promise<ApiResponse<{
    totalGuestOrders: number
    guestOrdersToday: number
    totalGuestRevenue: number
  }>> {
    return apiFetch<any>('/users/guest-orders/stats')
  },
}
