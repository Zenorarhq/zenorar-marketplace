// Cart API

import { apiFetch } from './client'
import { Product, ProductVariant } from './products'

export interface CartItem {
  id: string
  productId: string
  product: Product
  variantId: string | null
  variant: ProductVariant | null
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface Cart {
  id: string
  userId: string | null
  sessionId: string | null
  items: CartItem[]
  createdAt: string
  updatedAt: string
}

export interface CartSummary {
  items: CartItem[]
  itemCount: number
  subtotal: number
  shipping: number
  tax: number
  total: number
}

export const cartApi = {
  async get() {
    return apiFetch<CartSummary>('/cart')
  },

  async addItem(productId: string, quantity = 1, variantId?: string) {
    return apiFetch<CartSummary>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, variantId }),
    })
  },

  async updateItem(productId: string, quantity: number, variantId?: string) {
    return apiFetch<CartSummary>(`/cart/items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, variantId }),
    })
  },

  async removeItem(productId: string, variantId?: string) {
    const query = variantId ? `?variantId=${variantId}` : ''
    return apiFetch<CartSummary>(`/cart/items/${productId}${query}`, {
      method: 'DELETE',
    })
  },

  async clear() {
    return apiFetch<{ message: string }>('/cart', {
      method: 'DELETE',
    })
  },

  async getCount() {
    return apiFetch<{ count: number }>('/cart/count')
  },

  async validate() {
    return apiFetch<{
      valid: boolean
      issues: Array<{ productId: string; issue: string }>
    }>('/cart/validate')
  },

  async merge() {
    // Merges guest cart with user cart after login
    return apiFetch<CartSummary>('/cart/merge', {
      method: 'POST',
    })
  },
}
