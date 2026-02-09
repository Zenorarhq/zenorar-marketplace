// Reviews API

import { apiFetch, buildQueryString } from './client'

export interface Review {
  id: string
  productId: string
  userId: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
  product?: {
    id: string
    name: string
    slug: string
  }
  rating: number
  title: string | null
  content: string | null
  isVerified: boolean
  isApproved: boolean
  helpfulCount: number
  createdAt: string
  updatedAt: string
}

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  ratingDistribution: Record<number, number>
}

export interface CreateReviewData {
  productId: string
  rating: number
  title?: string
  content?: string
}

export interface ReviewFilters {
  productId?: string
  userId?: string
  isApproved?: boolean
  minRating?: number
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'rating' | 'helpfulCount'
  sortOrder?: 'asc' | 'desc'
}

export const reviewsApi = {
  // Public methods
  async getProductReviews(productId: string, page = 1, limit = 10) {
    const query = buildQueryString({ page, limit })
    return apiFetch<{
      reviews: Review[]
      stats: ReviewStats
      pagination: any
    }>(`/reviews/product/${productId}${query}`)
  },

  async create(data: CreateReviewData) {
    return apiFetch<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: Partial<CreateReviewData>) {
    return apiFetch<Review>(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async delete(id: string) {
    return apiFetch<{ message: string }>(`/reviews/${id}`, {
      method: 'DELETE',
    })
  },

  async markHelpful(id: string) {
    return apiFetch<{ message: string }>(`/reviews/${id}/helpful`, {
      method: 'POST',
    })
  },

  async getMyReviews(page = 1, limit = 10) {
    const query = buildQueryString({ page, limit })
    return apiFetch<Review[]>(`/reviews/my${query}`)
  },

  // Admin methods
  async list(filters: ReviewFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<Review[]>(`/reviews${query}`)
  },

  async getPending(page = 1, limit = 20) {
    const query = buildQueryString({ page, limit })
    return apiFetch<Review[]>(`/reviews/pending${query}`)
  },

  async approve(id: string) {
    return apiFetch<Review>(`/reviews/${id}/approve`, {
      method: 'PATCH',
    })
  },

  async reject(id: string) {
    return apiFetch<Review>(`/reviews/${id}/reject`, {
      method: 'PATCH',
    })
  },
}
