import { apiFetch, buildQueryString, User } from './client'

export interface UserFilters {
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER'
  search?: string
  page?: number
  limit?: number
}

export const usersApi = {
  /**
   * Get all users (admin only)
   */
  async list(filters: UserFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<User[]>(`/auth/users${query}`)
  },

  /**
   * Update user role (admin only)
   */
  async updateRole(userId: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') {
    return apiFetch<User>(`/auth/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    })
  },

  /**
   * Delete user (admin only)
   */
  async delete(userId: string) {
    return apiFetch<{ message: string }>(`/auth/users/${userId}`, {
      method: 'DELETE',
    })
  },
}
