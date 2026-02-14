import { apiFetch, buildQueryString, User, ApiResponse } from './client'

export interface StaffFilters {
  search?: string
  roleId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface StaffRole {
  id: string
  name: string
  description?: string
  _count?: {
    permissions: number
  }
}

export interface StaffMember extends User {
  staffRole?: StaffRole | null
}

export interface StaffListResponse {
  staff: StaffMember[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const staffApi = {
  /**
   * Get all staff members with filters and pagination
   */
  async list(filters: StaffFilters = {}): Promise<ApiResponse<StaffListResponse>> {
    const query = buildQueryString(filters)
    return apiFetch<StaffListResponse>(`/staff${query}`)
  },

  /**
   * Get staff member by ID
   */
  async getById(staffId: string): Promise<ApiResponse<StaffMember>> {
    return apiFetch<StaffMember>(`/staff/${staffId}`)
  },

  /**
   * Create new staff member
   */
  async create(data: {
    email: string
    name: string
    password: string
    roleId?: string
    avatar?: string
  }): Promise<ApiResponse<StaffMember>> {
    return apiFetch<StaffMember>('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update staff member details
   */
  async update(
    staffId: string,
    data: { name?: string; bio?: string; avatar?: string }
  ): Promise<ApiResponse<StaffMember>> {
    return apiFetch<StaffMember>(`/staff/${staffId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Assign role to staff member
   */
  async assignRole(staffId: string, roleId: string | null): Promise<ApiResponse<StaffMember>> {
    return apiFetch<StaffMember>(`/staff/${staffId}/assign-role`, {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    })
  },

  /**
   * Remove staff access (convert to regular user)
   */
  async removeAccess(staffId: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch<{ message: string }>(`/staff/${staffId}/remove-access`, {
      method: 'POST',
    })
  },

  /**
   * Delete staff member
   */
  async delete(staffId: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch<{ message: string }>(`/staff/${staffId}`, {
      method: 'DELETE',
    })
  },
}
