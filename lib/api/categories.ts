// Categories API

import { apiFetch, localApiFetch, buildQueryString } from './client'
import { Category } from './products'

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
    return localApiFetch<CategoryWithChildren[]>(`/categories${query}`)
  },

  async getById(id: string) {
    return apiFetch<CategoryWithChildren>(`/categories/${id}`)
  },

  async getBySlug(slug: string) {
    return apiFetch<CategoryWithChildren>(`/categories/slug/${slug}`)
  },

  async getTree() {
    return apiFetch<CategoryWithChildren[]>('/categories/tree')
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
