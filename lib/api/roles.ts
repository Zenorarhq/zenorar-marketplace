import { apiFetch, ApiResponse } from './client'

export interface Permission {
  id: string
  key: string
  name: string
  description?: string
  category: string
  createdAt: string
}

export interface RolePermission {
  id: string
  roleId: string
  permissionId: string
  permission: Permission
}

export interface Role {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  permissions?: RolePermission[]
  _count?: {
    users: number
  }
  users?: Array<{
    id: string
    name: string
    email: string
    avatar?: string | null
  }>
}

export interface PermissionsResponse {
  all: Permission[]
  byCategory: Record<string, Permission[]>
}

export const rolesApi = {
  /**
   * Get all roles
   */
  async list(): Promise<ApiResponse<Role[]>> {
    return apiFetch<Role[]>('/roles')
  },

  /**
   * Get role by ID
   */
  async getById(roleId: string): Promise<ApiResponse<Role>> {
    return apiFetch<Role>(`/roles/${roleId}`)
  },

  /**
   * Create new role
   */
  async create(data: {
    name: string
    description?: string
    permissionIds?: string[]
  }): Promise<ApiResponse<Role>> {
    return apiFetch<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update role details
   */
  async update(
    roleId: string,
    data: { name?: string; description?: string; isActive?: boolean }
  ): Promise<ApiResponse<Role>> {
    return apiFetch<Role>(`/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update role permissions
   */
  async updatePermissions(roleId: string, permissionIds: string[]): Promise<ApiResponse<Role>> {
    return apiFetch<Role>(`/roles/${roleId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permissionIds }),
    })
  },

  /**
   * Delete role
   */
  async delete(roleId: string): Promise<ApiResponse<{ message: string }>> {
    return apiFetch<{ message: string }>(`/roles/${roleId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get all available permissions
   */
  async getPermissions(): Promise<ApiResponse<PermissionsResponse>> {
    return apiFetch<PermissionsResponse>('/roles/permissions')
  },
}
