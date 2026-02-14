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
}
