// Categories API

import { apiFetch, buildQueryString } from './client'
import { Category } from './products'
export type { Category }

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[]
  productCount?: number
  _count?: {
    products: number
  }
}

export interface CategoryFilters {
  parentId?: string | null
  includeChildren?: boolean
  includeProducts?: boolean
  page?: number
  limit?: number
}

export const categoriesApi = {
  async list(filters: CategoryFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<CategoryWithChildren[]>(`/categories/public${query}`)
  },

  async getById(id: string) {
    return apiFetch<CategoryWithChildren>(`/categories/${id}`)
  },

  async getBySlug(slug: string) {
    return apiFetch<CategoryWithChildren>(`/categories/public/${slug}`)
  },

  async getTree() {
    return apiFetch<CategoryWithChildren[]>('/categories/tree')
  },

  async getMainCategories() {
    const result = await apiFetch<CategoryWithChildren[]>('/categories')
    if (result.success && result.data) {
      // Filter to get only main categories (no parent)
      return {
        ...result,
        data: result.data.filter(cat => !cat.parentId)
      }
    }
    return result
  },

  async getBreadcrumb(id: string) {
    return apiFetch<Category[]>(`/categories/${id}/breadcrumb`)
  },

  // Admin methods
  async create(data: Partial<Category>) {
    return apiFetch<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: Partial<Category>) {
    return apiFetch<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string) {
    return apiFetch<void>(`/categories/${id}`, {
      method: 'DELETE',
    })
  },

  async reorder(categoryIds: string[]) {
    return apiFetch<void>('/categories/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ categoryIds }),
    })
  },
}
