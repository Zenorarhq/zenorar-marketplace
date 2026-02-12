// Orders API

import { apiFetch, localApiFetch, buildQueryString } from './client'
import { Product, ProductVariant } from './products'

export interface OrderItem {
  id: string
  productId: string
  product: Product
  variantId: string | null
  variant: ProductVariant | null
  name: string
  sku: string | null
  price: number
  quantity: number
  total: number
}

export interface OrderAddress {
  id: string
  firstName: string
  lastName: string
  company: string | null
  address1: string
  address2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
  phone: string | null
}

export interface Order {
  id: string
  orderNumber: string
  userId: string | null
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  subtotal: number
  shippingCost: number
  taxAmount: number
  discountAmount: number
  total: number
  shippingAddress: OrderAddress | null
  billingAddress: OrderAddress | null
  email: string
  phone: string | null
  paymentMethod: string | null
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paidAt: string | null
  shippingMethod: string | null
  trackingNumber: string | null
  shippedAt: string | null
  deliveredAt: string | null
  customerNote: string | null
  adminNote: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrderData {
  shippingAddressId?: string
  billingAddressId?: string
  email: string
  phone?: string
  customerNote?: string
  shippingMethod?: string
  paymentMethod?: string
  discountCode?: string
}

export interface OrderFilters {
  status?: string
  paymentStatus?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const ordersApi = {
  // User methods
  async getMyOrders(filters: OrderFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<Order[]>(`/orders/my${query}`)
  },

  async getById(id: string) {
    return apiFetch<Order>(`/orders/${id}`)
  },

  async getByOrderNumber(orderNumber: string, email?: string) {
    const query = email ? `?email=${encodeURIComponent(email)}` : ''
    return apiFetch<Order>(`/orders/lookup/${orderNumber}${query}`)
  },

  async create(data: CreateOrderData) {
    return apiFetch<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async cancel(id: string, reason?: string) {
    return apiFetch<Order>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  // Admin methods
  async list(filters: OrderFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<Order[]>(`/orders${query}`)
  },

  async updateStatus(id: string, status: string, note?: string) {
    return apiFetch<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    })
  },

  async updatePaymentStatus(id: string, paymentStatus: string) {
    return apiFetch<Order>(`/orders/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    })
  },

  async updateTracking(id: string, trackingNumber: string) {
    return apiFetch<Order>(`/orders/${id}/tracking`, {
      method: 'PATCH',
      body: JSON.stringify({ trackingNumber }),
    })
  },

  async getStats() {
    return localApiFetch<{
      totalOrders: number
      totalRevenue: number
      pendingOrders: number
      completedOrders: number
    }>('/orders/stats')
  },
}
