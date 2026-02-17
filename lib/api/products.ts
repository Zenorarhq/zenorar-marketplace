// Products API

import { apiFetch, buildQueryString, ApiResponse } from './client'

export interface ProductImage {
  id: string
  url: string
  alt: string | null
  order: number
  isPrimary: boolean
}

export interface ProductVariant {
  id: string
  name: string
  sku: string | null
  price: number | null
  stock: number
  options: Record<string, string>
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  parentId?: string | null
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  sku: string | null
  price: number
  comparePrice: number | null
  costPrice: number | null
  stock: number
  lowStockThreshold: number
  weight: number | null
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  isFeatured: boolean
  isDigital: boolean
  metaTitle: string | null
  metaDescription: string | null
  categoryId: string | null
  category: Category | null
  images: ProductImage[]
  variants: ProductVariant[]
  reviewCount?: number
  averageRating?: number
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  category?: string
  categoryIds?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  featured?: boolean
  status?: string
  search?: string
  minRating?: number
  tags?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const productsApi = {
  async list(filters: ProductFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<Product[]>(`/products${query}`)
  },

  async getById(id: string) {
    return apiFetch<Product>(`/products/${id}`)
  },

  async getBySlug(slug: string) {
    return apiFetch<Product>(`/products/slug/${slug}`)
  },

  async getFeatured(limit = 8) {
    return apiFetch<Product[]>(`/products/featured?limit=${limit}`)
  },

  async getRelated(productId: string, limit = 4) {
    return apiFetch<Product[]>(`/products/${productId}/related?limit=${limit}`)
  },

  async getByCategory(categorySlug: string, filters: ProductFilters = {}) {
    const query = buildQueryString({ ...filters, category: categorySlug })
    return apiFetch<Product[]>(`/products${query}`)
  },

  // Admin methods
  async create(data: Partial<Product>) {
    return apiFetch<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: Partial<Product>) {
    return apiFetch<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string) {
    return apiFetch<void>(`/products/${id}`, {
      method: 'DELETE',
    })
  },

  async updateStock(id: string, quantity: number, operation: 'set' | 'increment' | 'decrement') {
    return apiFetch<Product>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, operation }),
    })
  },

  // Images
  async addImage(productId: string, imageData: { url: string; alt?: string; isPrimary?: boolean }) {
    return apiFetch<ProductImage>(`/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify(imageData),
    })
  },

  async deleteImage(productId: string, imageId: string) {
    return apiFetch<void>(`/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
    })
  },
}
