// Wishlist API

import { apiFetch, buildQueryString } from './client'
import { Product } from './products'

export interface WishlistItem {
  id: string
  addedAt: string
  product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice: number | null
    image: string | null
    inStock: boolean
    stock: number
    category: { id: string; name: string; slug: string } | null
  }
}

export const wishlistApi = {
  async get(page = 1, limit = 20) {
    const query = buildQueryString({ page, limit })
    return apiFetch<WishlistItem[]>(`/wishlist${query}`)
  },

  async add(productId: string) {
    return apiFetch<WishlistItem>('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    })
  },

  async remove(productId: string) {
    return apiFetch<{ message: string }>(`/wishlist/${productId}`, {
      method: 'DELETE',
    })
  },

  async check(productId: string) {
    return apiFetch<{ inWishlist: boolean }>(`/wishlist/check/${productId}`)
  },

  async checkMultiple(productIds: string[]) {
    return apiFetch<Record<string, boolean>>('/wishlist/check', {
      method: 'POST',
      body: JSON.stringify({ productIds }),
    })
  },

  async getCount() {
    return apiFetch<{ count: number }>('/wishlist/count')
  },

  async clear() {
    return apiFetch<{ message: string }>('/wishlist', {
      method: 'DELETE',
    })
  },

  async moveToCart(productId: string, quantity = 1) {
    return apiFetch<{ message: string }>(`/wishlist/${productId}/move-to-cart`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    })
  },
}
