import { apiFetch, buildQueryString, User, ApiResponse } from './client'

export interface UserFilters {
  search?: string
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER'
  isStaff?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UserStats {
  totalUsers: number
  newUsersToday: number
  staffCount: number
  customerCount: number
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
