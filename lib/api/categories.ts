// Categories API

import { apiFetch, localApiFetch, buildQueryString } from './client'
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
    return localApiFetch<CategoryWithChildren[]>('/categories/tree')
  },

  async getMainCategories() {
    const result = await localApiFetch<CategoryWithChildren[]>('/categories')
    if (result.success && result.data) {
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

  // Admin methods — use Next.js API routes (localApiFetch) so they work independently of the Express backend
  async create(data: Partial<Category>) {
    return localApiFetch<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: Partial<Category>) {
    return localApiFetch<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string) {
    return localApiFetch<void>(`/categories/${id}`, {
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
