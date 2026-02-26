// Notifications API

import { apiFetch, buildQueryString } from './client'

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'REFUND_PROCESSED'
  | 'REVIEW_APPROVED'
  | 'REVIEW_REJECTED'
  | 'PRICE_DROP'
  | 'BACK_IN_STOCK'
  | 'PROMOTIONAL'
  | 'SYSTEM'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  orderId: string | null
  productId: string | null
  metadata: Record<string, any> | null
  isRead: boolean
  readAt: string | null
  emailSent: boolean
  pushSent: boolean
  createdAt: string
}

export interface NotificationFilters {
  type?: NotificationType
  isRead?: boolean
  page?: number
  limit?: number
}

export const notificationsApi = {
  async get(filters: NotificationFilters = {}) {
    const query = buildQueryString(filters)
    return apiFetch<Notification[]>(`/notifications${query}`)
  },

  async getById(id: string) {
    return apiFetch<Notification>(`/notifications/${id}`)
  },

  async getUnreadCount() {
    return apiFetch<{ count: number }>('/notifications/unread')
  },

  async markAsRead(id: string) {
    return apiFetch<{ message: string }>(`/notifications/${id}/read`, {
      method: 'POST',
    })
  },

  async markAllAsRead() {
    return apiFetch<{ message: string }>('/notifications/read-all', {
      method: 'POST',
    })
  },

  async delete(id: string) {
    return apiFetch<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE',
    })
  },

  async deleteRead() {
    return apiFetch<{ message: string }>('/notifications/read', {
      method: 'DELETE',
    })
  },

  // Admin methods
  async sendNotification(type: 'PROMOTIONAL' | 'SYSTEM', title: string, message: string) {
    return apiFetch<{ message: string }>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type, title, message }),
    })
  },

  // Push notification methods
  async getVapidKey() {
    return apiFetch<{ publicKey: string }>('/push/vapid-key')
  },

  async subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return apiFetch<{ message: string }>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    })
  },

  async unsubscribePush(endpoint: string) {
    return apiFetch<{ message: string }>('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    })
  },
}
